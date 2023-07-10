import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, NavigationStart, Params, Router } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { BehaviorSubject, catchError, debounceTime, delay, EMPTY, filter, iif, map, Observable, of, Subject, Subscription, switchMap, take, takeUntil, tap, timeout } from 'rxjs';
import { CenturyPipe } from 'src/app/pipes/century-pipe/century-pipe.pipe';
import { BibliographyService } from 'src/app/services/bibliography/bibliography.service';
import { LexicalElement, LexiconService } from 'src/app/services/lexicon/lexicon.service';
import { GlobalGeoDataModel, MapsService } from 'src/app/services/maps/maps.service';
import { TextMetadata, TextsService } from 'src/app/services/text/text.service';
import { AuthorCounter, DateCounter, StatisticsCounter } from '../lexicon/lexicon.component';
import { AutoCompleteEvent, CenturiesCounter, DuctusCounter, LanguagesCounter, LocationsCounter, MaterialCounter, ObjectTypeCounter, TextFilter, TypesCounter, WordDivisionTypeCounter } from '../texts/texts.component';
import { groupByAuthors, groupByCenturies, groupByDates, groupByLexicalEntry, groupDuctus, groupLanguages, groupLocations, groupMaterial, groupObjectTypes, groupTypes, groupWordDivisionType } from '../texts/utils';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class AdvancedSearchComponent implements OnInit, OnDestroy {


  isActiveInterval : boolean = false;
  allowedCenturies : number[] = [0, 100];
  start : number = 0;

  get mappingRange(): number[] {
    let min = -200;
    let max = 300;
    let minSlider = 0;
    let maxSlider = 100;
    return this.allowedCenturies.map(value => (value - minSlider) * (max - min) / (maxSlider - minSlider) + min);
  }

  get mapSingle(): number {
    let min = -200;
    let max = 300;
    let minSlider = 0;
    let maxSlider = 100;
    return (this.start - minSlider) * (max - min) / (maxSlider - minSlider) + min;
  }


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
    material: new FormControl(null),
    ductus : new FormControl(null),
    wordDivisionType : new FormControl(null),
    lexicalElement : new FormControl(null),
    lexicalElementType : new FormControl(null),
    lexicalElementPos : new FormControl(null),
    lexicalElementAuthor : new FormControl(null),
    lexicalElementLanguage : new FormControl(null),
    lexicalElementStatus : new FormControl(null),
    bibliographyTitle : new FormControl(null),
    bibliographyID : new FormControl(null),
    bibliographyFromDate : new FormControl(null),
    bibliographyToDate : new FormControl(null),
    bibliographyAuthor : new FormControl(null),
  });

  first: number = 0;
  rows: number = 6;
  

  autocompleteLocationReq$ : BehaviorSubject<AutoCompleteEvent> = new BehaviorSubject<AutoCompleteEvent>({originalEvent: {}, query: ''});
  autocompleteLexiconReq$ : BehaviorSubject<AutoCompleteEvent> = new BehaviorSubject<AutoCompleteEvent>({originalEvent: {}, query: ''});

  typesList : Observable<StatisticsCounter[]> = this.lexiconService.types$;
  posList : Observable<StatisticsCounter[]> = this.lexiconService.pos$;
  authorsList : Observable<StatisticsCounter[]> = this.lexiconService.authors$;
  languagesList : Observable<StatisticsCounter[]> = this.lexiconService.languages$;
  statusList : Observable<StatisticsCounter[]> = this.lexiconService.status$;

  
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

  groupDuctus : Observable<DuctusCounter[]> = this.textService.texts$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts=> groupDuctus(texts)),
  )

  groupWordDivisionType : Observable<WordDivisionTypeCounter[]> = this.textService.texts$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts=> groupWordDivisionType(texts)),
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

  groupDates : Observable<DateCounter[]> = this.bibliographyService.books$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(books=> groupByDates(books)),
  )

  groupAuthors : Observable<AuthorCounter[]> = this.bibliographyService.books$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(books=> groupByAuthors(books)),
  )
  
  searchLocations : Observable<LocationsCounter[]> = this.autocompleteLocationReq$.pipe(
    debounceTime(1000),
    filter(autoCompleteEvent => autoCompleteEvent.query != ''),
    switchMap(autoCompleteEvent=> this.textService.searchLocation(autoCompleteEvent.query)),
    map(texts=> groupLocations(texts, true)),
    tap(results => this.autocompleteLocations = results)
  )

  searchLexicon : Observable<LexicalElement[]> = this.autocompleteLexiconReq$.pipe(
    debounceTime(1000),
    filter(autoCompleteEvent => autoCompleteEvent.query != ''),
    switchMap(autoCompleteEvent=> this.lexiconService.getFormsList(autoCompleteEvent.query)),
    map(elements => groupByLexicalEntry(elements)),
  )

  somethingWrong: boolean = false;
  showSpinner: boolean = true;

  constructor(private route: Router, 
              private activatedRoute : ActivatedRoute, 
              private textService : TextsService,
              private mapsService : MapsService,
              private lexiconService : LexiconService,
              private bibliographyService : BibliographyService) { }

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
    console.log(formData)
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
      queryParts.push(` _doc__title="${formData.title}"`);
    }

    if (formData.id) {
      queryParts.push(` _doc__id="${formData.id}"`);
    }

    if (formData.dateOfOriginNotBefore) {
      queryParts.push(` _doc__dateOfOriginNotBefore="${formData.dateOfOriginNotBefore}"`);
    }

    if (formData.dateOfOriginNotAfter) {
      queryParts.push(` _doc__dateOfOriginNotAfter="${formData.dateOfOriginNotAfter}"`);
    }

    if (formData.ancientName) {
      queryParts.push(` _doc__originalPlace__ancientName="${formData.ancientName}"`);
    }

    if (formData.language) {
      queryParts.push(` _doc__language__ident="${formData.language}"`);
    }

    if (formData.inscriptionType) {
      queryParts.push(` _doc__inscriptionType="${formData.inscriptionType}"`);
    }

    if (formData.objectType) {
      queryParts.push(` _doc__support__objectType="${formData.objectType}"`);
    }

    if (formData.material) {
      queryParts.push(` _doc__support__material="${formData.material}"`);
    }

    if (formData.ductus) {
      queryParts.push(` _doc__bodytextpart__ductus="${formData.ductus}"`);
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

  pagination(event: Paginator, ...args : any[]){
    if(Object.keys(event).length != 0){this.first = event.first; this.rows = event.rows;}
    if(Object.keys(event).length == 0){this.first = 0; this.rows = 6;}

    let rows = (this.first != this.rows) && (this.first < this.rows) ? this.rows : this.first + this.rows;
    if(args.length>0){args =args.filter(query=>query != null)}

    if(args.length == 0){
      this.getAllData(this.first, rows);
    }else{
      this.paginationItems = this.textService.sliceFilteredAttestations(this.first, rows);
    }
  }

  getAllData(f? : number, r? : number): void {
    let rows = 0;
    if(f && r){this.first = f; rows = r; }
    if(!f && !r){this.first = 0; this.rows = 6;}
    
   
    this.paginationItems = this.textService.texts$.pipe(map(texts => texts.slice(this.first, rows == 0 ? this.rows : rows)));
    this.totalRecords = this.textService.texts$.pipe(map(texts=>texts.length || 0))
  }

  filterText(){

  }

  clearDates(){
    this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(null, {emitEvent: true})
  }

  clearLocation(){
    this.advancedSearchForm.get('ancientName')?.setValue(null, {emitEvent: true})
  }

  clearLexicalEntry(){
    this.advancedSearchForm.get('lexicalElement')?.setValue(null, {emitEvent: true})
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
    this.paginationItems = this.textService.texts$.pipe(map(texts => texts.slice(0, 6)));
    this.totalRecords = this.textService.texts$.pipe(map(texts=>texts.length || 0))
  }

  handleAutocompleteFilter(evt: any){
    
    this.advancedSearchForm.markAllAsTouched();

    if(evt.ancientPlaceLabel != ''){
      this.advancedSearchForm.get('ancientName')?.setValue(evt.ancientPlaceLabel, {emitEvent: false})
    }

    this.advancedSearchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
  }

  handleAutocompleteFilterLocation(evt: any){
    
    this.advancedSearchForm.markAllAsTouched();

    if(evt.ancientPlaceLabel != ''){
      this.advancedSearchForm.get('lexicalElement')?.setValue(evt.ancientPlaceLabel, {emitEvent: false})
    }

    this.advancedSearchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
  }

  onChangeSlider(event : any){
    this.markAsTouched();
    if(event.value){
      this.advancedSearchForm.get('dateOfOriginNotBefore')?.setValue(this.mapSingle)
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(null)

    }

    if(event.values){
      this.advancedSearchForm.get('dateOfOriginNotBefore')?.setValue(this.mappingRange[0])
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(this.mappingRange[1])

    }
  }

  
}