import {  AfterViewInit, Component, ComponentRef, ElementRef, NgZone, OnInit, Renderer2, ViewChild, ViewContainerRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import * as L from 'leaflet';
import { circle, tileLayer } from 'leaflet';
import { MenuItem } from 'primeng/api';
import { Paginator } from 'primeng/paginator';
import { map, tap, Subject, takeUntil, BehaviorSubject, Observable, switchMap, take, filter, debounceTime, timeout, catchError, iif, throwError, of, EMPTY, shareReplay, mergeMap, flatMap, delay, forkJoin } from 'rxjs';
import { CenturyPipe } from 'src/app/pipes/century-pipe/century-pipe.pipe';
import { FormElement, LexiconService } from 'src/app/services/lexicon/lexicon.service';
import { GlobalGeoDataModel, MapsService } from 'src/app/services/maps/maps.service';
import { PopupService } from 'src/app/services/maps/popup/popup.service';
import { AnnotationsRows, Book, BookAuthor, BookEditor, Graphic, ListAndId, TextMetadata, TextsService, TextToken, XmlAndId } from 'src/app/services/text/text.service';
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

export interface WordDivisionTypeCounter {
  count : number,
  type: string,
}

export interface MaterialCounter {
  material : string,
  count : number,
}

export interface DuctusCounter {
  ductus : string,
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
export class TextsComponent implements OnInit, AfterViewInit {

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
  allowedFilters : string[] = ['all', 'date', 'location', 'type', 'search'];
  allowedOperators: string[] = ['filter', 'date', 'place', 'type', 'file'];
  searchOptions : Array<string> = ['start', 'equals', 'contains', 'ends']


  // MAP
  leafletMapOptions: any;
  layers: Array<L.Circle> = [];

  
  singleMap : L.Map | undefined;
  singleCircle : L.Circle | undefined;
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
    map((filter : TextFilter) => filter.filter),
    tap(index => index == 'search' ? this.activeIndex = 1 : this.activeIndex = 0)
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
    switchMap(geoData => {
      const searchAttestationsObservables = geoData.map(place => {
        const cqlQuery = `[_doc__originalPlace__modernNameUrl="${place.modernUri}" | _doc__originalPlace__ancientNameUrl="${place.ancientUri}"]`;
        
        
        return this.textService.filterAttestations(cqlQuery).pipe(
          map(attestations => ({ ...place, attestations }))
        );
      });
  
      return forkJoin(searchAttestationsObservables);
    }),
    tap(data => this.drawMap(data))
  )

  searchLocations : Observable<LocationsCounter[]> = this.autocomplete$.pipe(
    debounceTime(1000),
    filter(autoCompleteEvent => autoCompleteEvent.query != ''),
    switchMap(autoCompleteEvent=> this.textService.searchLocation(autoCompleteEvent.query)),
    map(texts=> groupLocations(texts)),
    tap(results => this.autocompleteLocations = results)
  )

  getTextPaginationIndexReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getFileIdByIndexReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  getFileByIndexReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);

  getTextContentReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  getInterpretativeReq$ : BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>({} as XmlAndId);
  getDiplomaticReq$ : BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>({} as XmlAndId);
  getTranslationReq$ : BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>({} as XmlAndId);
  getAnnotationReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  getBibliographyReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getFacsimileReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getCommentaryReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getApparatusReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getGetoDataFromFile$ : BehaviorSubject<any> = new BehaviorSubject<any>(null);


  loadingInterpretative : boolean = false;
  loadingDiplomatic : boolean = false;
  loadingTranslation : boolean = false;
  loadingBibliography : boolean = false;
  loadingFacsimile : boolean = false;
  loadingCommentary: boolean = false;
  loadingApparatus : boolean = false;


  displayModal : boolean = false;
  
  currentElementId : number = NaN;
  currentTokensList : TextToken[] | undefined;
  autopsyAuthors : Array<any> = [];
  seenAuthors: Array<any> = [];
  fileNotAvailable : boolean = false;

  @ViewChild('interpretativeText') interpretativeText!: ElementRef;
  @ViewChild('diplomaticText') diplomaticText!: ElementRef;
  @ViewChild('apparatusText') apparatusText!: ElementRef;
  @ViewChild('dynamicOverlay', { read: ViewContainerRef }) container : ViewContainerRef | undefined;
  arrayDynamicComponents : Array<FormElement> = [];

  getTextPaginationIndex : Observable<number> = this.getTextPaginationIndexReq$.pipe(
    switchMap(fileId => fileId != '' ? this.textService.getIndexOfText(fileId) : of()),
    tap(index => {
      if(index != -1){
        this.getFileByIndexReq$.next(index)
        this.fileNotAvailable = false;
      }else{
        this.fileNotAvailable = true;
      }
  })
  )

  getFileIdByIndex : Observable<string> = this.getFileIdByIndexReq$.pipe(
    switchMap(index => !isNaN(index) ? this.textService.getFileIdByIndex(index) : of()),
    tap(fileID => {
      if(fileID != ''){
        this.route.navigate(['/texts'], {queryParams : {file : fileID}})
      }
    }),
  )

  isBodyTextPartArray : boolean = false;
  onlyTextCommentary : string[] = [];
  referencedCommentary : any[] = [];

  getFileByIndex : Observable<TextMetadata> = this.getFileByIndexReq$.pipe(
    switchMap(index => !isNaN(index) ? this.textService.getFileByIndex(index) : of()),
    tap(file => {
      if(file){
        this.onlyTextCommentary = [];
        this.referencedCommentary = [];
        this.tempXml = null;
        this.isVenetic = false;
        this.loadingCommentary = true;
        this.loadingInterpretative = true;
        this.loadingTranslation = true;
        this.loadingBibliography = true;
        this.loadingFacsimile = true;
        this.loadingApparatus = true;
        this.getGetoDataFromFile$.next(null)
        this.getGetoDataFromFile$.next(file);
        this.getTextContentReq$.next(file['element-id']);
        this.isBodyTextPartArray = Array.isArray(file.bodytextpart)
      }
    })
  )

  code : string = '';

  isVenetic : boolean = false;
  getXMLContent : Observable<XmlAndId> = this.getTextContentReq$.pipe(
    tap(elementId => !isNaN(elementId) ? this.currentElementId = elementId : of()),
    switchMap(elementId => !isNaN(elementId) ? this.textService.getContent(elementId) : of()),
    tap((res) => {
      if(res.xml != '') {
        //console.log(res.xml);
        this.code = res.xml;

        //controllo se è venetico
        let languageNodes = new DOMParser().parseFromString(this.code, "text/xml").querySelectorAll('language');
        languageNodes.forEach(el=>{
          if(el.getAttribute('ident') == 'xve') this.isVenetic = true
        })
        this.arrayDynamicComponents = [];
        this.externalReferences = []
        this.getInterpretativeReq$.next(res);
        this.getDiplomaticReq$.next(res);
        this.getTranslationReq$.next(res);
        this.getBibliographyReq$.next(res.xml);
        this.getFacsimileReq$.next(res.xml);
        this.getApparatusReq$.next(res.xml)
        this.getAutopsyAuthors(res.xml);
        //this.getCommentaryReq$.next(res.xml);
        
      }
    }),
    
  )
  
  tempXml : any;
  getInterpretativeContent : Observable<string[]> = this.getInterpretativeReq$.pipe(
    filter(req => Object.keys(req).length > 0),
    tap(req => this.tempXml = req.xml ),
    map(req => this.textService.mapXmlRequest(req)),
    map(req =>  getTeiChildren(req)),
    switchMap(arrayNodes => this.textService.getCustomInterpretativeData(arrayNodes).pipe(catchError(err => this.thereWasAnError()))),
    /* tap(data => this.currentTokensList = data.tokens), */
    map(data => buildCustomInterpretative(this.renderer, data.teiNodes, data.leidenNodes, data.tokens)),
    tap(x => {
      this.getAnnotationReq$.next(this.currentElementId)
      this.getCommentaryReq$.next(this.tempXml)
      this.tempXml = null
    })
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


  getDiplomaticContent : Observable<string[]> = this.getDiplomaticReq$.pipe(
    filter(req => Object.keys(req).length > 0),
    map(rawXml => this.textService.mapXmlRequest(rawXml)),
    switchMap(req => req.xml != '' ? this.textService.getHTMLContent(req).pipe(
      catchError(error => {
        console.error('An error occurred:', error);
        return(of())
      }),
    ) : of()),
    map(html => leidenDiplomaticBuilder(html, this.isVenetic)),
    tap(x => {
      //console.log(x);
      this.loadingDiplomatic = false
    })
  );

  getTranslation : Observable<any> | undefined = this.getTranslationReq$.pipe(
    filter(req => Object.keys(req).length > 0),
    //map(req => this.textService.mapXmlRequest(req)),
    //switchMap(req => req.xml != '' ? this.textService.getHTMLTeiNodeContent({xmlString : req.xml}).pipe(catchError(err => this.thereWasAnError())) : of()),
    map(res => getTranslationByXml(res.xml)),
    tap(res => this.loadingTranslation = false)
  );

  getBibliography : Observable<Book[]> | undefined = this.getBibliographyReq$.pipe(
    filter(xml => xml != ''),
    map(xml => getBibliography(xml)),
    tap(biblio => this.loadingBibliography = false)
  );

  externalReferences : MenuItem[] = [];
  externalReferencesCounter : string = '';
  getFacsimile : Observable<Graphic[]> | undefined = this.getFacsimileReq$.pipe(
    filter(xml => xml != ''),
    map(xml => getFacsimile(xml)),
    tap(facsimile => {
      if(facsimile){
        facsimile.forEach(fac=>{
          if(fac.isPdf || fac.isExternalRef){
            let item = {
              label : fac.description.length > 50 ? fac.description.substring(0, 50) + "..." : fac.description,
              url : fac.url
            }
            this.externalReferences.push(item)
          }
        })
      }
      this.externalReferencesCounter = this.externalReferences.length.toString();
      this.loadingFacsimile = false
    })
  );

  getCommentary : Observable<Array<string>> = this.getCommentaryReq$.pipe(
    filter(xml => xml != ''),
    map(xml => getCommentaryXml(xml, this.renderer)),
    delay(500),
    tap((output:any) => {

      if(output.onlyText && output.onlyText.length > 0){
        let tmp = [];

        if(output.onlyText){
          output.onlyText.forEach((element : any) => {
            tmp.push(element)
          });
        }


        if(output.referenced){
          for (const key in output.referenced) {
            // Usa l'operatore spread per aggiungere gli elementi dell'array corrente a arrayDestinazione

            let innerHTMLs = output.referenced[key].map((elemento : Element) => elemento.outerHTML);
            // Usa l'operatore spread per aggiungere i valori estratti a arrayDestinazione
            tmp.push(...innerHTMLs);
          }
        }

        this.onlyTextCommentary = tmp
      }
      if(output.referenced && Object.keys(output.referenced).length > 0){
        this.mapCommentaryNodes(output.referenced)
      }

      
      this.loadingCommentary = false;
    })
  );

  getApparatus : Observable<Array<string>> = this.getApparatusReq$.pipe(
    filter(xml => xml != ''),
    map(xml => getApparatus(xml, this.renderer)),
    tap(xml => this.loadingApparatus = false)
  );

  mapsLoading:boolean=false;
  getGetoDataFromFileId: Observable<any> = this.getGetoDataFromFile$.pipe(
    tap(x=>this.mapsLoading = true),
    delay(1000),
    tap(x=> this.initializeMap()),
    switchMap(file => {
      if (file != null) {
        return this.mapsService.getSingleLocation(file.originalPlace).pipe(
          takeUntil(this.destroy$),
          debounceTime(3000),
          catchError(err => {
            this.thereWasAnError();
            return of(null); // restituisci un array vuoto in caso di errore
          })
        );
      } else {
        return of(null);
      }
    }),
    delay(3000),
    tap(res => this.drawSingleMap(res))
  );

  activeIndex : number = 0;

  searchForm: FormGroup = new FormGroup({
    word: new FormControl(null),
    title: new FormControl(null),
    titleExactMatch: new FormControl(false),
    id: new FormControl(null),
    idExactMatch: new FormControl(false),
    language: new FormControl(null),
    dateOfOriginNotBefore: new FormControl(null),
    dateOfOriginNotAfter: new FormControl(null),
    ancientName: new FormControl(null),
    inscriptionType: new FormControl(null),
    objectType: new FormControl(null),
    material: new FormControl(null)
  });


  

  constructor(private route: Router,
              private activatedRoute: ActivatedRoute,
              private textService: TextsService,
              private mapsService : MapsService,
              private ngZone : NgZone,
              private popupService : PopupService,
              private renderer : Renderer2,
  ) { }

  ngOnInit(): void {

    

    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(
      (event)=>{
        if(event){
          this.fileNotAvailable = false;
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
            
          }else{
            this.singleMap?.remove();
            this.isMapInitialized = false;
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
      zoom: 7,
      center: [42.296818, 12.254809]
    };


    
    this.searchForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      delay(100),
      debounceTime(1000)).subscribe(
      data=>{
        const queryParams = new URLSearchParams(window.location.search);
        if(this.searchForm.touched && queryParams.get('file') == null){
          this.buildTextQuery(data)
        }
      }
    )
  }

  ngAfterViewInit(): void {
    
  }

  onChangeTabView(event: any){
    this.activeIndex = event.index;
  }

  
  isMapInitialized = false;

  initializeMap() {
    if (!this.isMapInitialized) {
      // Initialize the map here
      this.singleMap = L.map('singleMap').setView([42.296818, 12.254809], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.singleMap);
      this.isMapInitialized = true;
    }

  
    
  }

  drawSingleMap(geoData: GlobalGeoDataModel) {
    // First, ensure the map is initialized
    
  
    // Then, proceed to add the circle
    if (geoData) {
      if (this.singleCircle && this.singleMap && this.singleMap.hasLayer(this.singleCircle)) {
        this.singleMap.removeLayer(this.singleCircle);
      }
  
      this.singleCircle = L.circle([geoData.reprPoint.latitude, geoData.reprPoint.longitude], { radius: 500 });
  
      if (this.singleMap && this.singleCircle) {
        this.singleMap.addLayer(this.singleCircle);
        this.singleMap.panTo([geoData.reprPoint.latitude, geoData.reprPoint.longitude]);

        this.mapsLoading = false;
      }
    }
  }

  buildTextQuery(formData : any){
    this.somethingWrong = false;
    this.route.navigate(
      [],
      {
        relativeTo: this.activatedRoute,
        queryParams: {filter : 'search'}, 
        queryParamsHandling: 'merge',
      }
    )
    let queryParts: string[] = [];

    if (formData.word) {
      queryParts.push(`word="${formData.word}"`);
    }

    if (formData.title) {
      queryParts.push(`_doc__title="${formData.title}"`);
    }

    if (formData.id) {
      queryParts.push(`_doc__id="${formData.id}"`);
    }

    if (formData.dateOfOriginNotBefore) {
      queryParts.push(`_doc__dateOfOriginNotBefore="${formData.dateOfOriginNotBefore}"`);
    }

    if (formData.dateOfOriginNotAfter) {
      queryParts.push(`_doc__dateOfOriginNotAfter="${formData.dateOfOriginNotAfter}"`);
    }

    if (formData.ancientName) {
      queryParts.push(`_doc__originalPlace__ancientName="${formData.ancientName}"`);
    }

    if (formData.language) {
      queryParts.push(`_doc__language__ident="${formData.language}"`);
    }

    if (formData.inscriptionType) {
      queryParts.push(`_doc__inscriptionType="${formData.inscriptionType}"`);
    }

    if (formData.objectType) {
      queryParts.push(`_doc__support__objectType="${formData.objectType}"`);
    }

    if (formData.material) {
      queryParts.push(`_doc__support__material="${formData.material}"`);
    }

    const query = queryParts.length > 0 ? `[${queryParts.join(' &')}]` : '';
    console.log(query)
    this.first = 0;
    this.rows = 6;
    if(query != ''){
     
      this.paginationItems = this.textService.filterAttestations(query).pipe(
        catchError(error => {
          console.error('An error occurred:', error);
          if(error.status != 200) this.thereWasAnError() // Stampa l'errore sulla console
          return of([])// Ritorna un Observable con una struttura di AnnotationsRows vuota
        }),
        map(texts => texts.slice(0, 6))
      );
      this.totalRecords = this.textService.filterAttestations(query).pipe(map(texts=>texts.length || 0))
    }else{
      this.textService.restoreFilterAttestations();
      this.paginationItems = this.textService.texts$.pipe(map(texts => texts.slice(0, 6)));
      this.totalRecords = this.textService.texts$.pipe(map(texts=>texts.length || 0))
    }
    

    
  }

  clearDates(){
    this.searchForm.get('dateOfOriginNotAfter')?.setValue(null, {emitEvent: true})
  }

  clearLocation(){
    this.searchForm.get('ancientName')?.setValue(null, {emitEvent: true})
  }

  handleAutocompleteFilter(evt: any){
    
    this.searchForm.markAllAsTouched();

    if(evt.ancientPlaceLabel != ''){
      this.searchForm.get('ancientName')?.setValue(evt.ancientPlaceLabel, {emitEvent: false})
    }

    this.searchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
  }

  markAsTouched(){
    this.searchForm.markAllAsTouched();
  }

  resetFields(){
    this.searchForm.reset();
    this.first = 0;
    this.rows = 6;
    this.paginationItems = this.textService.texts$.pipe(map(texts => texts.slice(0, 6)));
    this.totalRecords = this.textService.texts$.pipe(map(texts=>texts.length || 0))
  }

  isDragging = false;
  startY = 0;
  startHeight = 0;

  onMouseDown(event: MouseEvent) {
    const div = document.querySelector('.resizer') as HTMLElement;
    if (!div) return;

    // Clicked on bottom border
    if (event.offsetY > 45) {
      this.isDragging = true;
      this.startY = event.clientY;
      this.startHeight = div.clientHeight;

      // Add mousemove and mouseup listeners directly to the document
      document.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  onMouseMove(event: MouseEvent) {
    const div = document.querySelector('.resizer') as HTMLElement;
    if (!div || !this.isDragging) return;

    const diff = event.clientY - this.startY;
    div.style.height = `${this.startHeight + diff}px`;
  }

  onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;

      // Remove mousemove and mouseup listeners from the document
      document.removeEventListener('mousemove', this.onMouseMove.bind(this));
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
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
      if(args[0] == 'all'){
        this.getAllData(this.first, rows);
      }else if(args[0]=='search'){
        this.paginationItems = this.textService.sliceFilteredAttestations(this.first, rows);
      }
      
      this.getAllData(this.first, rows);
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
                  place: geoPlaceData.modernId
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
    //this.somethingWrong = true;
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

  showModal(){
    this.displayModal = true;
  }

  hideModal(){
    this.displayModal = false;
  }


  highlightNode(evt : any){
    //console.log(evt)

    if(evt){
      let xmlid = evt.data;

      let nodes = document.querySelectorAll(`span[xmlid="${evt.data}"]:not(.spanReference)`);

      nodes.forEach(span=>{
        span.classList.add('highlight')
      })
    }
  }

  deactivateNode(evt : any){
    //console.log(evt)

    if(evt){
      let xmlid = evt.data;

      let nodes = document.querySelectorAll(`span[xmlid="${evt.data}"]:not(.spanReference)`);

      nodes.forEach(span=>{
        span.classList.remove('highlight')
      })
    }
  }

  loadCommentaryData(evt : any){
    let data = evt.data;

    this.referencedCommentary = [];
    console.log(evt)
    if(data){
      data.forEach((element : Element) => {
        this.referencedCommentary.push(element.outerHTML);
      });
    }

    setTimeout(() => {
      console.log(data)
      data.forEach((element : Element) => {
        let spans = element.querySelectorAll(`[xmlid]`)
        if(spans.length>0){
          spans.forEach((subSpan : Element) => {
            let xmlid = subSpan.getAttribute('xmlid')

            let nodes = document.querySelectorAll(`.spanReference[xmlid="${xmlid}"]`)

            nodes.forEach(domElement =>  {
              domElement.addEventListener('mouseenter', (event) => {
                this.highlightNode({evt: this, data: xmlid, clickEvent: event});
              });

              domElement.addEventListener('mouseleave', (event) => {
                this.deactivateNode({evt: this, data: xmlid, clickEvent: event});
              });
            })
            
          })
        }
      });
    }, 100);
  }

  mapNodes(data : any[] | unknown){
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
                
                
              }
            }
          )
        })
      }
   
    }
  
  }

  getAutopsyAuthors(rawXml : string){
    this.autopsyAuthors = [];
    this.seenAuthors = [];

    let nodes = new DOMParser().parseFromString(rawXml, "text/xml");
    let autopsyAuthorsNodes = Array.from(nodes.querySelectorAll("provenance[type='observed']"));
    
    if(autopsyAuthorsNodes.length> 0){
      autopsyAuthorsNodes.forEach(element=>{
        //console.log(element);

        if(element.getAttribute('subtype') == 'seen'){
          let seenAuthors = {
            name: element.textContent ? element.textContent : '',
            subtype : element.getAttribute('subtype') || '',
            when : element.getAttribute('when') ? element.getAttribute('when') : NaN,
            notAfter : element.getAttribute('notAfter') ? element.getAttribute('notAfter') : NaN,
          };
          this.seenAuthors.push(seenAuthors);
        }else if(element.getAttribute('subtype') == 'autopsied'){
          let autopsyAuthor = {
            name: element.textContent ? element.textContent : '',
            subtype : element.getAttribute('subtype') || '',
            when : element.getAttribute('when') ? element.getAttribute('when') : NaN,
            notAfter : element.getAttribute('notAfter') ? element.getAttribute('notAfter') : NaN,
          };
          this.autopsyAuthors.push(autopsyAuthor)

        }
        
      })
    }
  
  }

  mapCommentaryNodes(data : any){
    
    if(data && Object.keys(data).length > 0){
      
      Object.keys(data).forEach(
        element => {
          console.log(data[element])
          let xmlid = element;
          let nodes = document.querySelectorAll(`[xmlid="${element}"]`)
          if(nodes.length>0){

            let span = nodes[0]
            span.classList.add('comment');
            span.addEventListener('mouseenter', (event) => {
              this.loadCommentaryData({evt: this, data: data[element], clickEvent: event});
            });

            data[element].forEach((sub : Element) => {
              let subReferences = sub.querySelectorAll(`[xmlid]`)
              if(subReferences.length>0){
                subReferences.forEach((subSpan : Element)=>{
                  subSpan.classList.add('spanReference');
                  /* subSpan.addEventListener('click', (event) => {
                    this.highLightNodes({evt: this, data: data[element], clickEvent: event});
                  }); */
                })
              }
            });
            //mouse hover and appiccicare le info dei nodi
            //click, fisso dati
          }
        }
      )
    }
  }

  printDocument(){
    window.print();
  }

}


function getTeiChildren(req : XmlAndId) : ListAndId{

  let array : Array<Element[]> = [];
  let divFaces = Array.from(new DOMParser().parseFromString(req.xml, "text/xml").querySelectorAll('div[subtype="interpretative"] div'));
  divFaces.forEach(
    divFacesElement=>{
      let face: Element[] = [];
      let abChildren = Array.from(divFacesElement.querySelectorAll('ab')[0].children);
      abChildren.forEach(
        abChildrenElement => {
          face.push(abChildrenElement)
        }
      )

      array.push(face)
    }
  )
  return {list : array, id : req.nodeId};
}

function getBibliography(rawXml : string) : Array<any> {

  let biblio_array : Array<any> = [];
  let nodes = Array.from(new DOMParser().parseFromString(rawXml, "text/xml").querySelectorAll('biblStruct'))
  
  nodes.forEach(element=> {
    let book_obj = {} as Book;
    
    let title = Array.from(element.querySelectorAll('title'));
    let author = Array.from(element.querySelectorAll('author'));
    let editor = Array.from(element.querySelectorAll('editor'));
    let url = element.attributes.getNamedItem('corresp');
    let date = Array.from(element.querySelectorAll('date'));
    let page = Array.from(element.querySelectorAll('biblScope[unit="page"]'));
    
    let volume = Array.from(element.querySelectorAll('biblScope[unit="volume"]'));
    let entry = Array.from(element.querySelectorAll('biblScope[unit="entry"]'));
    let issue = Array.from(element.querySelectorAll('biblScope[unit="issue"]'));


    if(title.length > 0){
      title.forEach(t => {
        book_obj.title = t.innerHTML;
        return true;
      })
    }

    if(date.length > 0){
      date.forEach(d => {
        book_obj.date = d.innerHTML;
      })
    }

    if(page.length > 0){
      page.forEach(p => {
        book_obj.page = p.innerHTML;
      })
    }

    if(volume.length > 0){
      volume.forEach(p => {
        book_obj.volume = p.innerHTML;
      })
    }

    if(entry.length > 0){
      entry.forEach(p => {
        book_obj.entry = p.innerHTML;
      })
    }

    if(issue.length > 0){
      issue.forEach(p => {
        book_obj.issue = p.innerHTML;
      })
    }

    if(author.length > 0){
      author.forEach(aut => {
        let name = aut.querySelector('forename');
        let surname = aut.querySelector('surname');
        if(name != undefined && surname != undefined){
          book_obj.author = {} as BookAuthor;
          book_obj.author.name = name.innerHTML;
          book_obj.author.surname = surname.innerHTML;
          return true;
        }else{
          return false;
        }
        
      })
    }

    if(editor.length > 0){
      editor.forEach(edit => {
        let name = edit.querySelector('forename');
        let surname = edit.querySelector('surname');
        if(name != undefined && surname != undefined){
          book_obj.editor = {} as BookEditor;
          book_obj.editor.name = name.innerHTML;
          book_obj.editor.surname = surname.innerHTML;
          return true;
        }else{
          return false;
        }
        
      })
    }

    if(url){
      if(url.nodeValue != undefined){
        book_obj.url = url.nodeValue;
      }
    }

    //console.log(book_obj);
    biblio_array.push(book_obj)
  })
  return biblio_array;
}



function getCommentaryXml(rawHTML : string, renderer : Renderer2) : any {

  let onlyTextComments : Array<string> = [];
  let referencedComments : any = {};

  if(Array.from(new DOMParser().parseFromString(rawHTML, "text/xml").querySelectorAll('div[type="commentary"')).length != 0){

    let commentaryNotes = Array.from(new DOMParser().parseFromString(rawHTML, "text/xml").querySelectorAll('div[type="commentary"')[0].children);
    
    commentaryNotes.forEach(teiNote => {

      let teiNoteChildren = Array.from(teiNote.children);
      let target : string | null | undefined= '';

      //Elementi che si rifanno al testo
      if(teiNote instanceof Element && teiNote.localName == 'note' && teiNote.hasAttribute('target')){
        target = teiNote.getAttribute('target') != null ? teiNote.getAttribute('target')?.replace('#', '') : '';
      }

      teiNoteChildren.forEach(child => {
        
        
        let childNodes = Array.from(child.childNodes);
       
        let paragraph = renderer.createElement('p') as Element;
        childNodes.forEach((element : any)=>{

          if(element instanceof Text){
            let paragraphText = renderer.createText(element.nodeValue ? element.nodeValue : '');
            renderer.appendChild(paragraph, paragraphText)
          }

          if(element instanceof Element){

            if((element.nodeName == 'tei:ref') && element.hasAttribute('target')){
              let biblioTargetUrl = element.getAttribute('target') ? element.getAttribute('target') : '';
              let link = renderer.createElement('a') as Element;

              const regex = /.*\.xml$/;
              let isAFile = false;
              if(biblioTargetUrl && biblioTargetUrl != ''){
                isAFile = regex.test(biblioTargetUrl)
                
              }
              
              if(isAFile){
                link.setAttribute('href', biblioTargetUrl ? "/texts?file="+biblioTargetUrl.replace('.xml', '') : '')
                link.setAttribute('target', '_blank')
              }else{
                link.setAttribute('href', biblioTargetUrl ? biblioTargetUrl : '')
                link.setAttribute('target', '_blank')
              }

              

              let biblioChildNodes = Array.from(element.childNodes)
              biblioChildNodes.forEach((bibChild)=>{
                let biblioText = renderer.createText(bibChild.textContent ? bibChild.textContent : '');
                renderer.appendChild(link, biblioText)
              })

              renderer.appendChild(paragraph, link)
            }

            if(element.nodeName == 'tei:rs'){

              let correspData = element.getAttribute('corresp') ? element.getAttribute('corresp') : '';

              const regex = /https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}/;
              let isALink = false;

              if(correspData && correspData != ''){
                
                isALink = regex.test(correspData)
              }
              
              if(isALink){
                let link = renderer.createElement('a') as Element;
                link.setAttribute('href', correspData ? correspData : '')
                link.setAttribute('target', '_blank')
  
                let biblioChildNodes = Array.from(element.childNodes)
                biblioChildNodes.forEach(bibChild=>{
                  let biblioText = renderer.createText(element.nodeValue ? element.nodeValue : '');
                  renderer.appendChild(link, biblioText)
                })
  
                renderer.appendChild(paragraph, link)
              }else{
                let span = renderer.createElement('span') as Element;

                if(correspData != ''){
                  span.setAttribute('xmlid', correspData?.toString() ? correspData.toString() : '')
                }

                let spanText = renderer.createText(element.textContent ? element.textContent : '')

                renderer.appendChild(span, spanText)

                renderer.appendChild(paragraph, span)
              } 

            }
          }
        })

        if(target && target != ''){
          if(!referencedComments[target]) referencedComments[target] = []
          referencedComments[target].push(paragraph)
        }else{
          onlyTextComments.push(paragraph.outerHTML)
        }

      });
      
    })
    return {referenced: referencedComments, onlyText: onlyTextComments};
  }else{
    return []
  }
  
} 

function getApparatus(rawXml : string, renderer : Renderer2) : Array<string> {

  let apparatusArray : Array<string> = [];

  if(Array.from(new DOMParser().parseFromString(rawXml, "text/xml").querySelectorAll('app')).length != 0){
    let apparatusNodes = Array.from(new DOMParser().parseFromString(rawXml, "text/xml").querySelectorAll('app'));
    apparatusNodes.forEach(app => {
      const lemNode = app.querySelector("lem");
      const rdgNode = app.querySelector("rdg");
      const refNodes = rdgNode?.querySelectorAll("ref");
      const lineNumber = app.getAttribute("from")?.split('_').pop();

      // Create the span elements
      const containerSpan = renderer.createElement('span');
      const lineNumberSpan = renderer.createElement('span');
      const contentSpan = renderer.createElement('span');

      // Set classes for the lineNumberSpan
      renderer.addClass(lineNumberSpan, 'linenumber');

      // Set the content for the lineNumberSpan
      if (lineNumber) {
        const text = renderer.createText(lineNumber);
        renderer.appendChild(lineNumberSpan, text);
      }

      // Set the content for the contentSpan
      if (lemNode) {
        const lemText = lemNode.textContent ? lemNode.textContent + ' - ' : '';
        renderer.appendChild(contentSpan, renderer.createText(lemText));
      }
      if (rdgNode && rdgNode.firstChild && rdgNode.firstChild.nodeValue) {
        const rdgText = rdgNode.firstChild.nodeValue.trim();
        renderer.appendChild(contentSpan, renderer.createText(rdgText));
    }
      refNodes?.forEach((refNode, index) => {
        const link = renderer.createElement('a');
        const href = refNode.getAttribute('target');
        const bibl = refNode.querySelector("bibl")?.textContent;
        renderer.setAttribute(link, 'href', href || '#');
        renderer.setAttribute(link, 'target', '_blank');
        renderer.appendChild(link, renderer.createText(bibl || ''));
        renderer.appendChild(contentSpan, link);
        if (index < (refNodes.length - 1)) {
          renderer.appendChild(contentSpan, renderer.createText(' and '));
        }
      });
      if (rdgNode) renderer.appendChild(contentSpan, renderer.createText(')'));
      
      // Append the lineNumberSpan and contentSpan to the containerSpan
      renderer.appendChild(containerSpan, lineNumberSpan);
      renderer.appendChild(containerSpan, contentSpan);

      // Append the containerSpan to the array
      apparatusArray.push(containerSpan.outerHTML);
    })
    return apparatusArray;
  }else{
    return []
  }
  
}

function getFacsimile(rawXml : string) : Array<Graphic> {

  let graphic_array : Array<Graphic> = [];
  let nodes = Array.from(new DOMParser().parseFromString(rawXml, "text/xml").querySelectorAll('facsimile graphic'))
  
  nodes.forEach(element=> {
    let graphic_obj = {} as Graphic;
    
    let desc = Array.from(element.querySelectorAll('desc'));
    let url = element.getAttribute('url');
    
    if(desc.length > 0){
      desc.forEach(d => {
        if(d.textContent != undefined || d.textContent != null){
          graphic_obj.description = d.textContent
        }else{
          graphic_obj.description = 'No description'
        }
       
      })
    }

    if(url){
      if(url.includes('.jpg')){
        graphic_obj.isPdf = false;
      }else if(url.includes('.pdf')){
        graphic_obj.isPdf = true;
      }else {
        graphic_obj.isExternalRef = true;
      }

      graphic_obj.url = url;
    }
    
    //console.log(graphic_obj);
    graphic_array.push(graphic_obj)
  })
  return graphic_array;
}

function leidenDiplomaticBuilder(html: string, isVenetic?: boolean) {
  let resHTMLArray = [];
  let nodes = new DOMParser().parseFromString(html, "text/html").querySelectorAll('#diplomatic .textpart');
  if (!isVenetic) {
    nodes.forEach(el => resHTMLArray.push(el.innerHTML));
  } else {
    resHTMLArray.push(nodes[1].innerHTML);
  }
  return resHTMLArray;
}

function groupByCenturies(texts: TextMetadata[]) : CenturiesCounter[]{
  let tmp : CenturiesCounter[] = [];
  let count : number = 0;

  allowedCenturies.forEach(value=>{
    if(value < 0) count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOriginNotBefore) >= value && parseInt(cur.dateOfOriginNotBefore) < (value + 100)) ? ++acc : acc, 0); 
    if(value > 0) count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOriginNotBefore) >= (value-100) && parseInt(cur.dateOfOriginNotBefore) <= value) ? ++acc : acc, 0);
    if(count > 0) tmp.push({century: value, count: count, label: CenturyPipe.prototype.transform(value) })
  })

  return tmp;
}

function groupLocations(texts : TextMetadata[]) : LocationsCounter[] {
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
        ancientPlaceLabel: (text.originalPlace.ancientName), 
        modernPlaceUrl: text.originalPlace.modernNameUrl, 
        modernPlaceId: modernPlaceStripId, 
        modernPlaceLabel: text.originalPlace.modernName, 
        count : count
      })
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.ancientPlaceLabel] : object}), {})
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

function buildCustomInterpretative(renderer: Renderer2, TEINodes: Array<Array<Element>>, LeidenNodes: Array<Array<string>>, token: TextToken[]): Array<string> {
  let HTMLArray: Array<string> = [];
  

  TEINodes.forEach((innerArray, innerIndex) => {
      let HTML = '';
      let lineCounter = 0;
      innerArray.forEach((element, elementIndex) => {
          let begin: number = NaN, end: number = NaN, tokenId: number = NaN, nodeId: number = NaN, xmlId: string | null = null, nodeValue: string | null;
          if (element.getAttribute('xml:id') != null) {
              nodeValue = element.getAttribute('xml:id');

              token.forEach(t => {
                  if (t.xmlid == nodeValue) {
                      begin = t.begin;
                      end = t.end;
                      tokenId = t.id;
                      nodeId = t.node;
                      xmlId = t.xmlid;
                  }
              });
          }

          if (!isNaN(tokenId) && xmlId != null) {
              let leidenNode = LeidenNodes[innerIndex][elementIndex];
              let body = new DOMParser().parseFromString(leidenNode, "text/html").querySelector('body');
              if (body != null) {
                Array.from(body.childNodes).forEach((sub:any) => {
                  if(sub instanceof HTMLElement){
                    HTML += sub.outerHTML;
                  } 
                  if(sub instanceof Text && sub.textContent != null && /[\a-z*]/.test(sub.textContent)){ 
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
                          }
                        }
                      )
                  }
                  
                });
              }
          } else {
            let leidenNode = LeidenNodes[innerIndex][elementIndex];
            let body = new DOMParser().parseFromString(leidenNode, "text/html").querySelector('body');
            if(body != null){
              
              Array.from(body.childNodes).forEach((sub:any) => {
    
                if(sub instanceof HTMLElement){
                  if(nodeValue && sub.tagName == 'BR'){
                    let span = renderer.createElement('span') as Element;
                    renderer.addClass(span, 'linenumber');
                    span.setAttribute('xmlid', nodeValue);
                    let text = renderer.createText((lineCounter+1).toString());
                    renderer.appendChild(span, text);
                    if(sub.tagName == 'BR' && (sub.id == 'al1' || sub.id == 'al1b')){
                      HTML += span.outerHTML;
                    }else{
                      HTML += sub.outerHTML;
                      HTML += span.outerHTML;
                    }    
                    lineCounter = lineCounter+1;
                  }else{
                    if(!(sub.tagName == 'SPAN' && sub.classList.contains('linenumber'))){
                      HTML += sub.outerHTML;
                    }
                  }
                } 
                if(sub instanceof Text){
                  HTML += sub.textContent;
                }
              });
            }
          }
      });
      HTMLArray.push(HTML);
  });

  return HTMLArray;
}

function getTranslationByXml(rawXml : string){
  let translations : Array<string> = [];

  let nodes = new DOMParser().parseFromString(rawXml, "text/xml");
  let translationNodes = Array.from(nodes.querySelectorAll("div[type='translation'"));
  
  if(translationNodes.length> 0){
    translationNodes.forEach(element=>{
      //console.log(element);
      let children = Array.from(element.children);
      if(children.length>0){
        children.forEach(child=>{
          console.log(child);
          if(child.nodeName == 'tei:p'){
            translations.push(child.innerHTML)
          }
        })
      }
    })
  }

  console.log(translations)
  return translations;
}



/* function getTranslation(rawHtml : string){
  //console.log(rawHtml);

  let translations : Array<string> = [];

  let nodes = new DOMParser().parseFromString(rawHtml, "text/html");
  let translationNodes = Array.from(nodes.querySelectorAll('#translation'));
  
  if(translationNodes.length> 0){
    translationNodes.forEach(element=>{
      //console.log(element);
      let children = Array.from(element.children);
      if(children.length>0){
        children.forEach(child=>{
          console.log(child);
          if(child.nodeName == 'P'){
            translations.push(child.innerHTML)
          }
        })
      }
    })
  }

  console.log(translations)
  return translations;
}
 */