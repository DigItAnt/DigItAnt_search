import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, NavigationStart, Params, Router } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { BehaviorSubject, catchError, debounceTime, delay, EMPTY, filter, iif, map, Observable, of, Subject, Subscription, switchMap, take, takeUntil, tap, timeout } from 'rxjs';
import { CenturyPipe } from 'src/app/pipes/century-pipe/century-pipe.pipe';
import { GlobalGeoDataModel, MapsService } from 'src/app/services/maps/maps.service';
import { TextMetadata, TextsService } from 'src/app/services/text/text.service';
import { AutoCompleteEvent, CenturiesCounter, LanguagesCounter, LocationsCounter, MaterialCounter, ObjectTypeCounter, TextFilter, TypesCounter } from '../texts/texts.component';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class AdvancedSearchComponent implements OnInit, OnDestroy {


  isActiveInterval : boolean = false;

  advancedSearchForm: FormGroup = new FormGroup({
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

  first: number = 0;
  rows: number = 6;

  autocomplete$ : BehaviorSubject<AutoCompleteEvent> = new BehaviorSubject<AutoCompleteEvent>({originalEvent: {}, query: ''});
  autocompleteLocations: Array<LocationsCounter> = [];
  destroy$: Subject<boolean> = new Subject<boolean>();


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

  activeFile : Observable<string|undefined> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams : Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if(filter.file) return filter.file;
      return undefined;
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
    
  )
  
  searchLocations : Observable<LocationsCounter[]> = this.autocomplete$.pipe(
    debounceTime(1000),
    filter(autoCompleteEvent => autoCompleteEvent.query != ''),
    switchMap(autoCompleteEvent=> this.textService.searchLocation(autoCompleteEvent.query)),
    map(texts=> groupLocations(texts, true)),
    tap(results => this.autocompleteLocations = results)
  )
  somethingWrong: boolean = false;
  showSpinner: boolean = true;

  constructor(private formBuilder: FormBuilder,
              private route: Router, 
              private activatedRoute : ActivatedRoute, 
              private textService : TextsService,
              private mapsService : MapsService) { }

  ngOnInit(): void {

    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(
      (event)=>{
        if(event){
          const keys  = Object.keys(event);
          const values = Object.values(event);
          if(keys.length == 0) {
            //this.goToDefaultUrl(); 
            return;
          }
          if(keys){
            for(const [key, value] of Object.entries(event)) {
             /*  if(!this.allowedOperators.includes(key) ||  
                  event[key] == '' || 
                  (Array.isArray(event[key]) && Array.from(event[key]).length > 1))
              {
                this.goToDefaultUrl(); 
                return;
              } */
            }
          }
          if(keys.length>1){
            //this.pagination({} as Paginator, keys[1], values[1])
          }
          if(keys[0] == 'file'){
            
            /* let fileId = values[0];
            this.getTextPaginationIndexReq$.next(fileId); */
          }
          
        }
      }
    );

    this.advancedSearchForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      delay(100),
      debounceTime(1000),).subscribe(
      data=>{
        if(this.advancedSearchForm.touched){
          this.buildTextQuery(data)
        }
      }
    )
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

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  search(){
    
  }

  resetForm(){
    
  }

  pagination(event?: any) {
    
  }

  filterText(){

  }

  clearDates(){
    this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(null, {emitEvent: true})
  }

  clearLocation(){
    this.advancedSearchForm.get('ancientName')?.setValue(null, {emitEvent: true})
  }

  thereWasAnError(){
    this.somethingWrong = true;
    return EMPTY;
  }

  markAsTouched(){
    this.advancedSearchForm.markAllAsTouched();
  }

  resetFields(){
    this.advancedSearchForm.reset();
    this.first = 0;
    this.rows = 6;
    /* this.paginationItems = this.textService.texts$.pipe(map(texts => texts.slice(0, 6)));
    this.totalRecords = this.textService.texts$.pipe(map(texts=>texts.length || 0)) */
  }

  handleAutocompleteFilter(evt: any){
    
    this.advancedSearchForm.markAllAsTouched();

    if(evt.ancientPlaceLabel != ''){
      this.advancedSearchForm.get('ancientName')?.setValue(evt.ancientPlaceLabel, {emitEvent: false})
    }

    this.advancedSearchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
  }
}

const allowedCenturies : number[] = [-600, -500, -400, -300, -200, -100, 100];

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