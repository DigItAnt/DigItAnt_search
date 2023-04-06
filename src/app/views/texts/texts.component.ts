import {  Component, ComponentRef, ElementRef, NgZone, OnInit, Renderer2, ViewChild, ViewContainerRef } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import * as L from 'leaflet';
import { circle, tileLayer } from 'leaflet';
import { Paginator } from 'primeng/paginator';
import { map, tap, Subject, takeUntil, BehaviorSubject, Observable, switchMap, take, filter, debounceTime, timeout, catchError, iif, throwError, of, EMPTY, shareReplay, mergeMap, flatMap, delay } from 'rxjs';
import { CenturyPipe } from 'src/app/pipes/century-pipe/century-pipe.pipe';
import { FormElement, LexiconService } from 'src/app/services/lexicon/lexicon.service';
import { GlobalGeoDataModel, MapsService } from 'src/app/services/maps/maps.service';
import { PopupService } from 'src/app/services/maps/popup/popup.service';
import { ListAndId, TextMetadata, TextsService, TextToken, XmlAndId } from 'src/app/services/text/text.service';
import { DynamicOverlayComponent } from './dynamic-overlay/dynamic-overlay.component';


export interface CenturiesCounter {
  century : number,
  count : number,
  label: string,
}

export interface LocationsCounter {
  ancientPlaceUrl : string,
  ancientPlaceId : string,
  ancientPlaceLabel : string,
  modernPlaceUrl: string,
  modernPlaceId: string,
  modernPlaceLabel: string,
  count : number,
}

export interface TypesCounter {
  inscriptionType: string,
  count: number,
}

export interface LanguagesCounter {
  language: string,
  count: number,
}

export interface ObjectTypeCounter {
  objectType : string,
  count : number,
}

export interface MaterialCounter {
  material : string,
  count : number,
}

export interface TextFilter {
  filter : string;
  date: number;
  place: string;
  type : string;
  file : string;
}

export interface AutoCompleteEvent {
  originalEvent : object,
  query: string,
}

export interface PaginatorEvent {
  page : number,
  first : number,
  rows : number,
  pageCount : number,
}

const allowedCenturies : number[] = [-600, -500, -400, -300, -200, -100, 100];

@Component({
  selector: 'app-texts',
  templateUrl: './texts.component.html',
  styleUrls: ['./texts.component.scss']
})
export class TextsComponent implements OnInit {

  //RXJS
  destroy$: Subject<boolean> = new Subject<boolean>();
  autocomplete$ : BehaviorSubject<AutoCompleteEvent> = new BehaviorSubject<AutoCompleteEvent>({originalEvent: {}, query: ''});
  autocompleteLocations: Array<LocationsCounter> = [];
  getGeoData : BehaviorSubject<LocationsCounter[]> = new BehaviorSubject<LocationsCounter[]>([]);

  somethingWrong : boolean = false;
  showSpinner: boolean = true;
  isActiveInterval : boolean = false;
  first: number = 0;
  rows : number = 6;
  allowedFilters : string[] = ['all', 'date', 'location', 'type'];
  allowedOperators: string[] = ['filter', 'date', 'place', 'type', 'file'];
  searchOptions : Array<string> = ['start', 'equals', 'contains', 'ends']


  // MAP
  leafletMapOptions: any;
  layers: Array<L.Circle> = [];

  bounds = new L.LatLngBounds(new L.LatLng(33.802052, 4.239242), new L.LatLng(50.230863, 19.812745));

  totalRecords: Observable<number> = this.textService.texts$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), // -- true, 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map((texts) => texts.length || 0),
  );

  activeTab : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams : Params) => queryParams as TextFilter),
    map((filter : TextFilter) => filter.filter)
  );

  activeDate : Observable<number> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams : Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if(filter.date) return filter.date;
      return NaN;
    })
  );

  activeLocation : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams : Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if(filter.place) return filter.place;
      return '';
    })
  );

  activeType : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams : Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if(filter.type) return filter.type;
      return '';
    })
  );

  activeFile : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams : Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if(filter.file) return filter.file;
      return '';
    })
  );


  paginationItems: Observable<TextMetadata[]> = this.textService.texts$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), // -- true, 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map((texts) => texts.slice(this.first, this.rows)),
    tap((x) => this.showSpinner = false)
  );

  groupCenturies: Observable<CenturiesCounter[]> = this.textService.texts$.pipe(
    takeUntil(this.destroy$),
    map(texts => groupByCenturies(texts)),
  )

  groupLocations : Observable<LocationsCounter[]> = this.textService.texts$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts=> groupLocations(texts)),
  )

  groupTypes : Observable<TypesCounter[]> = this.textService.texts$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts=> groupTypes(texts)),
  )

  groupLanguages : Observable<LanguagesCounter[]> = this.textService.texts$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts=> groupLanguages(texts)),
  )

  groupObjectTypes : Observable<ObjectTypeCounter[]> = this.textService.texts$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts=> groupObjectTypes(texts)),
  )

  groupMaterial : Observable<MaterialCounter[]> = this.textService.texts$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts=> groupMaterial(texts)),
  )

  
  geoData : Observable<GlobalGeoDataModel[]> = this.groupLocations.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    take(1),
    switchMap(locations => this.mapsService.getGeoPlaceData(locations)),
    tap(data => this.drawMap(data))
  )

  searchLocations : Observable<LocationsCounter[]> = this.autocomplete$.pipe(
    debounceTime(1000),
    filter(autoCompleteEvent => autoCompleteEvent.query != ''),
    switchMap(autoCompleteEvent=> this.textService.searchLocation(autoCompleteEvent.query)),
    map(texts=> groupLocations(texts, true)),
    tap(results => this.autocompleteLocations = results)
  )

  getTextPaginationIndexReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getFileIdByIndexReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  getFileByIndexReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);

  getTextContentReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  getInterpretativeReq$ : BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>({} as XmlAndId);
  getDiplomaticReq$ : BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>({} as XmlAndId);

  getAnnotationReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  loadingInterpretative : boolean = false;
  loadingDiplomatic : boolean = false;
  
  currentElementId : number = NaN;
  currentTokensList : TextToken[] | undefined;

  @ViewChild('interpretativeText') interpretativeText!: ElementRef;
  @ViewChild('diplomaticText') diplomaticText!: ElementRef;
  @ViewChild('dynamicOverlay', { read: ViewContainerRef }) container : ViewContainerRef | undefined;
  arrayDynamicComponents : Array<FormElement> = [];

  getTextPaginationIndex : Observable<number> = this.getTextPaginationIndexReq$.pipe(
    switchMap(fileId => fileId != '' ? this.textService.getIndexOfText(fileId) : of()),
    tap(index => this.getFileByIndexReq$.next(index))
  )

  getFileIdByIndex : Observable<string> = this.getFileIdByIndexReq$.pipe(
    switchMap(index => !isNaN(index) ? this.textService.getFileIdByIndex(index) : of()),
    tap(fileID => {
      if(fileID != ''){
        this.route.navigate(['/texts'], {queryParams : {file : fileID}})
      }
    }),
  )

  getFileByIndex : Observable<TextMetadata> = this.getFileByIndexReq$.pipe(
    switchMap(index => !isNaN(index) ? this.textService.getFileByIndex(index) : of()),
    tap(file => {
      if(file){
        this.getTextContentReq$.next(file['element-id']);
      }
    })
  )


  getXMLContent : Observable<XmlAndId> = this.getTextContentReq$.pipe(
    tap(x => this.loadingInterpretative = true),
    tap(elementId => !isNaN(elementId) ? this.currentElementId = elementId : of()),
    switchMap(elementId => !isNaN(elementId) ? this.textService.getContent(elementId) : of()),
    tap((res) => {
      if(res.xml != '') {
        //console.log(res.xml)
        this.getInterpretativeReq$.next(res);
        this.getDiplomaticReq$.next(res);
        this.arrayDynamicComponents = [];
      }
    }),
    //switchMap(x => '')
    
  )
  
  getInterpretativeContent : Observable<string> = this.getInterpretativeReq$.pipe(
    filter(req => Object.keys(req).length > 0),
    map(req => this.textService.mapXmlRequest(req)),
    map(req =>  getTeiChildren(req)),
    switchMap(arrayNodes => this.textService.getCustomInterpretativeData(arrayNodes)),
    tap(data => this.currentTokensList = data.tokens),
    map(data => buildCustomInterpretative(this.renderer, data.teiNodes, data.leidenNodes, data.tokens)),
    tap(x => this.getAnnotationReq$.next(this.currentElementId))
  );

  getAnnotations : Observable<any> = this.getAnnotationReq$.pipe(
    filter(elementId => !isNaN(elementId)),
    tap(id => console.log(id)),
    switchMap(id => this.textService.getAnnotation(id)),
    switchMap(results =>  iif(
      () => results.length != 0, 
      this.textService.getForms(results),
      this.stopRequest(),
    )),
    tap(formsAndAnnotations=> this.mapNodes(formsAndAnnotations)),
    tap(x => this.loadingInterpretative = false)
  )


  getDiplomaticContent : Observable<string> = this.getDiplomaticReq$.pipe(
    filter(req => Object.keys(req).length > 0),
    map(rawXml => this.textService.mapXmlRequest(rawXml)),
    switchMap(req => req.xml != '' ? this.textService.getHTMLContent(req) : of()),
    map(html => leidenDiplomaticBuilder(html)),
    tap(x => {
      // console.log(x);
      this.loadingDiplomatic = false
    })
  );


  //TODO ottenere traduzione

  searchForm: FormGroup = new FormGroup({
    fullText: new FormControl(null),
    fullTextExactMatch: new FormControl(false),
    greekMode: new FormControl(false),
    title: new FormControl(null),
    titleExactMatch: new FormControl(false),
    id: new FormControl(null),
    idExactMatch: new FormControl(false),
    language: new FormControl(null),
    fromDate: new FormControl(null),
    toDate: new FormControl(null),
    place: new FormControl(null),
    inscriptionType: new FormControl(null),
    objectType: new FormControl(null),
    materials: new FormControl(null)
  });


  

  constructor(private route: Router,
              private activatedRoute: ActivatedRoute,
              private textService: TextsService,
              private lexiconService : LexiconService,
              private mapsService : MapsService,
              private ngZone : NgZone,
              private popupService : PopupService,
              private renderer : Renderer2,
  ) { }

  ngOnInit(): void {

    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(
      (event)=>{
        if(event){
          const keys  = Object.keys(event);
          const values = Object.values(event);
          if(keys.length == 0) {
            this.goToDefaultUrl(); 
            return;
          }
          if(keys){
            for(const [key, value] of Object.entries(event)) {
              if(!this.allowedOperators.includes(key) ||  
                  event[key] == '' || 
                  (Array.isArray(event[key]) && Array.from(event[key]).length > 1))
              {
                this.goToDefaultUrl(); 
                return;
              }
            }
          }
          if(keys.length>1){
            this.pagination({} as Paginator, keys[1], values[1])
          }
          if(keys[0] == 'file'){
            
            let fileId = values[0];
            this.getTextPaginationIndexReq$.next(fileId);
          }
          
        }
      }
    );

    

    this.leafletMapOptions = {
      layers: [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 15, 
          minZoom: 5, 
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
        ),
      ],
      zoom: 5,
      center: [42.296818, 12.254809]
    };


    
  }

  stopRequest() {
    this.loadingInterpretative = false;
    return EMPTY;
  }

 
  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  getAllData(f? : number, r? : number): void {
    let rows = 0;
    if(f && r){this.first = f; rows = r; }
    if(!f && !r){this.first = 0; this.rows = 6;}
    
   
    this.paginationItems = this.textService.texts$.pipe(map(texts => texts.slice(this.first, rows == 0 ? this.rows : rows)));
    this.totalRecords = this.textService.texts$.pipe(map(texts=>texts.length || 0))
  }

  goToDefaultUrl(){
    this.route.navigate( ['/texts'], { queryParams: {filter: 'all'}});
  }

  filterByDate(century : number, f? : number, r? : number) : void {
    if(century){
      if(!f && !r){this.first = 0;this.rows = 6; this.paginationItems = this.textService.filterByDate(century).pipe(map(text=>text.slice(this.first, this.rows)))}
      if(f || r){this.paginationItems = this.textService.filterByDate(century).pipe(map(text=>text.slice(f, r)))}
  
      this.totalRecords = this.textService.filterByDate(century).pipe(map(texts=>texts.length || 0))
    }else{
      this.getAllData(f, r);
    }
  }


  filterByLocation(locationId : number, f? : number, r? : number) : void {
    if(locationId){
      if(!f && !r){this.first = 0;this.rows = 6; this.paginationItems = this.textService.filterByLocation(locationId).pipe(map(text=>text.slice(this.first, this.rows)))}
      if(f || r){this.paginationItems = this.textService.filterByLocation(locationId).pipe(map(text=>text.slice(f, r)))}
  
      this.totalRecords = this.textService.filterByLocation(locationId).pipe(map(texts=>texts.length || 0))
    }else{
      this.getAllData(f, r);
    }
    
  }

  filterByType(type : string, f? : number, r?: number) : void {
    if(type){
      if(!f && !r){this.first = 0;this.rows = 6; this.paginationItems = this.textService.filterByType(type).pipe(map(text=>text.slice(this.first, this.rows)))}
      if(f || r){this.paginationItems = this.textService.filterByType(type).pipe(map(text=>text.slice(f, r)))}
  
      this.totalRecords = this.textService.filterByType(type).pipe(map(texts=>texts.length || 0))
    }else{
      this.getAllData(f, r);
    }
  }

  textPagination(event: PaginatorEvent){
    let indexRequested = event.page;
    this.getFileIdByIndexReq$.next(indexRequested);
  }
  

  pagination(event: Paginator, ...args : any[]){
    this.getTextContentReq$.next(NaN)
    if(Object.keys(event).length != 0){this.first = event.first; this.rows = event.rows;}
    if(Object.keys(event).length == 0){this.first = 0; this.rows = 6;}

    let rows = (this.first != this.rows) && (this.first < this.rows) ? this.rows : this.first + this.rows;
    if(args.length>0){args =args.filter(query=>query != null)}
    if(args.length==1){
      this.getAllData(this.first, rows);
      return;
    }
    if(args.length>1){
      let filter = args[0];
      let value = !isNaN(parseInt(args[1])) ? parseInt(args[1]) : args[1];

      switch(filter){
        case 'all' : this.getAllData(this.first, rows); break;
        case 'date' : this.filterByDate(value, this.first, rows); break;
        case 'place' : this.filterByLocation(value, this.first, rows); break;
        case 'type' : this.filterByType(value, this.first, rows); break;
      }
      return;
    }

   
    
  }


  drawMap(geoData : GlobalGeoDataModel[]) : void{
    
    geoData.forEach(geoPlaceData=>{
      let circleMarker = circle([geoPlaceData.reprPoint.latitude, geoPlaceData.reprPoint.longitude], {radius: 5000}).on('click mouseover', event => {
        console.log(event);
        let eventType = event.type;
        if(eventType == 'mouseover'){
          circleMarker.bindPopup(this.popupService.showGeoPopup(geoPlaceData)).openPopup();
        }
        if(eventType == 'click'){
          this.ngZone.run(()=>{ 
            this.route.navigate( 
              ['/texts'], 
              { queryParams: 
                {
                  filter: 'location', 
                  place: geoPlaceData.id
                }
              }
            );
          })
        }
        
      })
      circleMarker.bindPopup
      this.layers.push(circleMarker);
    })
    

  }


  showHideRestorations(){
    let interpretativeDiv : Array<HTMLElement> = Array.from(this.interpretativeText.nativeElement.getElementsByClassName('gap'));
    let diplomaticDiv : Array<HTMLElement> = Array.from(this.diplomaticText.nativeElement.getElementsByClassName('gap'));
    interpretativeDiv.forEach(
      element=> {
        if(element.style.opacity == '0'){

          element.setAttribute('style', 'opacity: 1');
        }else{
          element.setAttribute('style', 'opacity: 0');

        }
      
      }
    )

    diplomaticDiv.forEach(
      element=> {
        if(element.style.opacity == '0'){

          element.setAttribute('style', 'opacity: 1');
        }else{
          element.setAttribute('style', 'opacity: 0');

        }
      
      }
    )
  } 


  thereWasAnError(){
    this.somethingWrong = true;
    return EMPTY;
  }


  loadOverlayPanel(evt : any){
    console.log(evt.target);
    let formId = evt.target.attributes.formid.nodeValue;
    this.container?.clear();

    let formData = null;

    this.arrayDynamicComponents.forEach(
      element=>{
        if(element.form == formId){
          formData = element;
        }
      }
    )
    
    const componentRef : ComponentRef<DynamicOverlayComponent> | undefined = this.container?.createComponent(DynamicOverlayComponent);
    (<DynamicOverlayComponent>componentRef?.instance).label = formId;
    if(formData != undefined){
      (<DynamicOverlayComponent>componentRef?.instance).formData = formData;
    }
    (<DynamicOverlayComponent>componentRef?.instance).toggleOverlayPanel(evt);
  }

  mapNodes(data : any[] | unknown){
    console.log(data);
    if(Array.isArray(data)){
      
      let nodes = document.querySelectorAll('[tokenid]');
      
      if(nodes.length>0){
        nodes.forEach(node=>{
          let tokenid = node.getAttribute('tokenid');
  
          data.forEach(
            element => {
              let annotation = element.annotation;
              let lexicalEntry = annotation.attributes.lexicalEntry;
              let formid = annotation.value;
  
              if(annotation.attributes.node_id == tokenid){
  
                node.setAttribute('lexicalentry', lexicalEntry);
                node.setAttribute('formid', formid);
                node.classList.add('notation');
                node.addEventListener('click', this.loadOverlayPanel.bind(this));
                this.arrayDynamicComponents.push(element.form);
                
                // https://stackblitz.com/edit/angular-mcbbub?file=src%2Fapp%2Fapp.component.html !!!!
  
                //TODO: (1) Creare un componente corrispondente a un overlay panel con template e proprietà per visualizzare i dati in entrata
  
                //TODO: (2) Una volta creato il componente. Ecco un esempio:
                
                  //const factory = this.factory.resolveComponentFactory(NomeComponente);
                  //const componentRef = this.vc.createComponent(factory);
  
                //TODO: (3) Per sicurezza mettere il componente in un array per poi eventualmente distruggere le istanze una volta usciti dal componente
                  
                  //this.arrayComponents.push(componentRef);
  
                //TODO: (4) Popolare il componente con i dati
  
                  // (<FormPanelComponent>componentRef.instance).formId = formId;
                  // (<FormPanelComponent>componentRef.instance).id = idAnnotation;
                  // ...
  
                //TODO: (5) Attaccare un event listner click allo span
                
                // https://stackoverflow.com/questions/41609937/how-to-bind-event-listener-for-rendered-elements-in-angular-2
  
                //TODO: (6) Attaccare la funzione per visualizzare l'overlay panel che ho precedente creato nel componente
  
                // https://stackoverflow.com/questions/60775447/do-toggle-operation-onoverlaypanel-in-ts
  
                //TODO: (7) La logica è: clicco sulla parola, compare overlay panel, se voglio andare alla parola creo un bottone per andarci, fine.
              }
            }
          )
        })
      }
   
    }
  
  }


}

function getTeiChildren(req : XmlAndId) : ListAndId{

  let array : Array<Element> = [];
  let divFaces = Array.from(new DOMParser().parseFromString(req.xml, "text/xml").querySelectorAll('div[subtype="interpretative"] div'));
  divFaces.forEach(
    divFacesElement=>{
      let abChildren = Array.from(divFacesElement.querySelectorAll('ab')[0].children);
      abChildren.forEach(
        abChildrenElement => {
          array.push(abChildrenElement)
        }
      )
    }
  )
  return {list : array, id : req.nodeId};
}

function leidenDiplomaticBuilder(html : string){
  let nodes = new DOMParser().parseFromString(html, "text/html").querySelectorAll('#edition .textpart');
  return nodes[1].innerHTML;
}

function groupByCenturies(texts: TextMetadata[]) : CenturiesCounter[]{
  let tmp : CenturiesCounter[] = [];
  let count : number = 0;
  allowedCenturies.forEach(value=>{
    if(value < 0) count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOrigin) >= value && parseInt(cur.dateOfOrigin) < (value + 100)) ? ++acc : acc, 0); 
    if(value > 0) count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOrigin) > (value-100) && parseInt(cur.dateOfOrigin) <= value) ? ++acc : acc, 0);
    if(count > 0) tmp.push({century: value, count: count, label: CenturyPipe.prototype.transform(value) })
  })

  return tmp;
}

function groupLocations(texts : TextMetadata[], truncatePlaces?:boolean) : LocationsCounter[] {
  let tmp : LocationsCounter[] = [];
  let count : number = 0;

  texts.forEach(text => {
    count = texts.reduce((acc, cur) => cur.originalPlace.ancientNameUrl == text.originalPlace.ancientNameUrl ? ++acc : acc, 0);
    if(count > 0) {
      let ancientPlaceStripId = text.originalPlace.ancientNameUrl.split('/')[text.originalPlace.ancientNameUrl.split('/').length -1];
      let modernPlaceStripId = text.originalPlace.modernNameUrl.split('/')[text.originalPlace.modernNameUrl.split('/').length -1];
      tmp.push({
        ancientPlaceUrl : text.originalPlace.ancientNameUrl, 
        ancientPlaceId : ancientPlaceStripId, 
        ancientPlaceLabel: (truncatePlaces? text.originalPlace.ancientName : text.originalPlace.ancientName.split(',')[0]), 
        modernPlaceUrl: text.originalPlace.modernNameUrl, 
        modernPlaceId: modernPlaceStripId, 
        modernPlaceLabel: text.originalPlace.modernName, 
        count : count
      })
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.ancientPlaceId] : object}), {})
  )

  return tmp;
}


function groupTypes(texts : TextMetadata[]) : TypesCounter[]{
  let tmp : TypesCounter[] = [];
  let count : number = 0;
  texts.forEach(text => {
    count = texts.reduce((acc, cur) => cur.inscriptionType == text.inscriptionType ? ++acc : acc, 0);
    if(count > 0) {tmp.push({ inscriptionType: text.inscriptionType, count : count} )
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.inscriptionType] : object}), {})
  )

  return tmp;
}


function groupLanguages(texts : TextMetadata[]) : LanguagesCounter[]{
  let tmp : LanguagesCounter[] = [];
  let count : number = 0;

  
  texts.forEach(text=> {
    count = texts.reduce((acc, cur) => cur.language[0].ident == text.language[0].ident ? ++acc : acc , 0);
    if(count > 0) {tmp.push({language: text.language[0].ident, count: count})}
  })

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.language] : object}), {})
  )

  
  return tmp;
}

function groupObjectTypes(texts : TextMetadata[]) : ObjectTypeCounter[]{
  let tmp : ObjectTypeCounter[] = [];
  let count : number = 0;

  
  texts.forEach(text=> {
    count = texts.reduce((acc, cur) => cur.support.objectType == text.support.objectType ? ++acc : acc , 0);
    if(count > 0) {tmp.push({objectType: text.support.objectType, count: count})}
  })

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.objectType] : object}), {})
  )

  
  return tmp;
}


function groupMaterial(texts : TextMetadata[]) : MaterialCounter[]{
  let tmp : MaterialCounter[] = [];
  let count : number = 0;

  
  texts.forEach(text=> {
    count = texts.reduce((acc, cur) => cur.support.material == text.support.material ? ++acc : acc , 0);
    if(count > 0) {tmp.push({material: text.support.material, count: count})}
  })

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.material] : object}), {})
  )

  
  return tmp;
}

function buildCustomInterpretative(renderer : Renderer2, TEINodes : Array<Element>, LeidenNodes : Array<string>, token : TextToken[]) : string{
  
  let HTML = '';
  TEINodes.forEach(
    element=> {
      let begin : number = NaN, end : number = NaN, tokenId : number = NaN, nodeId : number = NaN, xmlId : string | null = null, nodeValue: string | null;
      if(element.getAttribute('xml:id')!= null){
        nodeValue = element.getAttribute('xml:id');
        
        token.forEach(t=> {
          if(t.xmlid == nodeValue){
            begin = t.begin;
            end = t.end;
            tokenId = t.id;
            nodeId = t.node;
            xmlId = t.xmlid;
          }
        })
        
      }
      if(!isNaN(tokenId) && xmlId != null){
        
        //LeidenNodes[TEINodes.indexOf(element)];
        let body = new DOMParser().parseFromString(LeidenNodes[TEINodes.indexOf(element)], "text/html").querySelector('body');
        if(body != null){
          Array.from(body.childNodes).forEach((sub:any) => {
            if(sub instanceof HTMLElement){
              if(/[\a-z*]/.test(sub.outerText)){
                HTML += sub.outerHTML;
              }else{
                HTML += sub.outerHTML;
              }
            } 
            if(sub instanceof Text){ 
              if(sub.textContent != null && /[\a-z*]/.test(sub.textContent)){
                token.forEach(
                  tok => {
                    if(tok.xmlid == nodeValue){
                      let span = renderer.createElement('span') as Element;
                      let text = renderer.createText(sub.textContent != null ? sub.textContent : 'null');
                      renderer.setAttribute(span, 'tokenId', tokenId?.toString());
                      renderer.setAttribute(span, 'nodeId', nodeId?.toString());
                      renderer.setAttribute(span, 'start', begin?.toString());
                      renderer.setAttribute(span, 'end', end?.toString());
                      renderer.setAttribute(span, 'xmlId', xmlId != undefined ? xmlId.toString() : 'null');
                      renderer.appendChild(span, text)
                      HTML += span.outerHTML;
                      //console.log(span.outerHTML)
                    }
                  }
                )
                
              }
            }
            
          });
        }


      }else{
        
        let body = new DOMParser().parseFromString(LeidenNodes[TEINodes.indexOf(element)], "text/html").querySelector('body');
        if(body != null){
          Array.from(body.childNodes).forEach((sub:any) => {

            if(sub instanceof HTMLElement){//nodo span o altro 
              HTML += sub.outerHTML;
            } 
            if(sub instanceof Text){ //-- textContent
              HTML += sub.textContent;
            }
          });
        }
        
      }
    }
  )

  return HTML;

}

