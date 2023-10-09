import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, NavigationStart, Params, Router } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { BehaviorSubject, catchError, debounceTime, delay, EMPTY, filter, iif, map, Observable, of, Subject, Subscription, switchMap, take, takeUntil, tap, timeout } from 'rxjs';
import { CenturyPipe } from 'src/app/pipes/century-pipe/century-pipe.pipe';
import { AdvancedsearchService } from 'src/app/services/advancedsearch/advancedsearch.service';
import { BibliographyService } from 'src/app/services/bibliography/bibliography.service';
import { LexicalElement, LexiconService } from 'src/app/services/lexicon/lexicon.service';
import { GlobalGeoDataModel, MapsService } from 'src/app/services/maps/maps.service';
import { TextMetadata, TextsService } from 'src/app/services/text/text.service';
import { AuthorCounter, DateCounter, StatisticsCounter } from '../lexicon/lexicon.component';
import { AlphabetCounter, AutoCompleteEvent, CenturiesCounter, DuctusCounter, LanguagesCounter, LocationsCounter, MaterialCounter, ObjectTypeCounter, TextFilter, TypesCounter, WordDivisionTypeCounter } from '../texts/texts.component';
import { groupAlphabet, groupByAuthors, groupByCenturies, groupByDates, groupByLexicalEntry, groupDuctus, groupLanguages, groupLocations, groupMaterial, groupObjectTypes, groupTypes, groupWordDivisionType } from '../texts/utils';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class AdvancedSearchComponent implements OnInit, OnDestroy {


  isActiveInscriptionInterval : boolean = false;
  isActiveBibliographyInterval : boolean = false;

  allowedInscriptionInterval : number[] = [0, 100];
  allowedBibliographyInterval: number[] = [1500, 2023];

  get mappingBibliograpgyRange(): number[] {
    return this.allowedBibliographyInterval;  // Direttamente ritornare il valore attuale perché già mappato nel range [1500, 2023]
  }

  get mapBibliographySingle(): number {
    return this.startBiblio;  // Direttamente ritornare il valore attuale perché già mappato nel range [1500, 2023]
  }

  start : number = -200;
  startBiblio : number = 1500;

  get mappingInscriptionRange(): number[] {
    let min = -200;
    let max = 300;
    let minSlider = 0;
    let maxSlider = 100;
    return this.allowedInscriptionInterval.map(value => (value - minSlider) * (max - min) / (maxSlider - minSlider) + min);
  }

  

  /* get mapInscriptionSingle(): number {
    let min = -200;
    let max = 300;
    let minSlider = 0;
    let maxSlider = 100;
    return (this.start - minSlider) * (max - min) / (maxSlider - minSlider) + min;
  } */

  lexiconOptions = [{name: 'Entry'}, {name: 'Form'}, {name:'Autocomplete'}]
  lexiconSearchMode = [{name: 'Start', value: 'startsWith'}, {name: 'Contains', value: 'contains'}, {name:'End', value: 'endsWith'}, {name:'Equals', value: 'equals'}]
  formSearchMode = [{name: 'Start', value: 'startsWith'}, {name: 'Contains', value: 'contains'}, {name:'End', value: 'endsWith'}, {name:'Equals', value: 'equals'}]
  inscriptionSearchMode = [{name: 'Start', value: 'startsWith'}, {name: 'Contains', value: 'contains'}, {name:'End', value: 'endsWith'}, {name:'Equals', value: 'equals'}]
  selectedLexiconOption: string = 'Entry';
  selectedInscriptionSearchMode: string = 'contains';


  advancedSearchForm: FormGroup = new FormGroup({
    word: new FormControl(null),
    wordSearchMode : new FormControl('contains'),
    title: new FormControl(null),
    id: new FormControl(null),
    otherId : new FormControl(null),
    language: new FormControl(null),
    alphabet : new FormControl(null),
    dateOfOriginNotBefore: new FormControl(-200),
    dateOfOriginNotAfter: new FormControl(null),
    modernName: new FormControl(null),
    inscriptionType: new FormControl(null),
    objectType: new FormControl(null),
    material: new FormControl(null),
    ductus : new FormControl(null),
    wordDivisionType : new FormControl(null),
    lexicalEntryText : new FormControl(null),
    lexicalEntrySearchMode : new FormControl('contains'),
    lexicalEntryType : new FormControl(null),
    lexicalEntryPos : new FormControl(null),
    lexicalEntryAuthor : new FormControl(null),
    lexicalEntryLanguage : new FormControl(null),
    lexicalEntryStatus : new FormControl(null),
    formText : new FormControl(null),
    formSearchMode : new FormControl('contains'),
    formAuthor : new FormControl(null),
    lexicalElementLabel : new FormControl(null),
    lexicalElementIRI : new FormControl(null),
    bibliographyTitle : new FormControl(null),
    bibliographyID : new FormControl(null),
    bibliographyFromDate : new FormControl(1500),
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
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts=> groupLanguages(texts)),
  )

  groupAlphabet : Observable<AlphabetCounter[]> = this.textService.texts$.pipe(
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts=> groupAlphabet(texts)),
  )

  groupObjectTypes : Observable<ObjectTypeCounter[]> = this.textService.texts$.pipe(
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

  initialFormValues = {
    word: null,
    title: null,
    titleExactMatch: false,
    id: null,
    idExactMatch: false,
    language: null,
    alphabet : null,
    dateOfOriginNotBefore: -200,
    dateOfOriginNotAfter: null,
    modernName: null,
    inscriptionType: null,
    objectType: null,
    material: null,
    ductus: null,
    wordDivisionType: null,
    lexicalEntryText: null,
    lexicalEntryType: null,
    lexicalEntryPos: null,
    lexicalEntryAuthor: null,
    lexicalEntryLanguage: null,
    lexicalEntryStatus: null,
    formText: null,
    formAuthor: null,
    lexicalElementLabel: null,
    lexicalElementIRI: null,
    bibliographyTitle: null,
    bibliographyID: null,
    bibliographyFromDate: null,
    bibliographyToDate: null,
    bibliographyAuthor: null
  };;

  constructor(private activatedRoute : ActivatedRoute, 
              private textService : TextsService,
              private mapsService : MapsService,
              private lexiconService : LexiconService,
              private bibliographyService : BibliographyService,
              private advancedSearchService : AdvancedsearchService) { }

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

    /* this.advancedSearchForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      delay(100),
      debounceTime(1000)).subscribe(
      data=>{
        if(this.advancedSearchForm.touched){
          this.buildTextQuery(data)
        }
      }
    ) */
  }

  buildTextQuery(){

    const formValues = this.advancedSearchForm.getRawValue(); // Ottiene tutti i valori dal form group
    const shouldStartQuery = Object.keys(formValues).some(key => {
      const control = this.advancedSearchForm.get(key);
      return control && control.touched && control.value !== null;
    });

    if (!shouldStartQuery) {
      console.log("Nessun controllo è stato toccato e modificato. Interrompendo la query.");
      return;
    }
    
    this.somethingWrong = false;
    
    this.paginationItems = of([]);
    this.totalRecords = of(NaN)

    this.paginationItems = this.advancedSearchService.crossQuery(this.advancedSearchForm.value, this.advancedSearchForm).pipe(
      catchError(error => {
        console.error('An error occurred:', error);
        if(error.status != 200) this.thereWasAnError() // Stampa l'errore sulla console
        return of([])// Ritorna un Observable con una struttura di AnnotationsRows vuota
      }),
      tap(res=> {
        setTimeout(() => {
          this.totalRecords = of(res.length)
        }, 100);
      }),
      map(res => res.slice(0, 6))
    )
    console.log(this.advancedSearchForm.value)
    
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

    if(this.advancedSearchService.getFilteredResults().length == 0){
      this.getAllData(this.first, rows);
    }else{
      this.paginationItems = this.advancedSearchService.sliceFilteredAttestations(this.first, rows);
    }
  }

  getAllData(f? : number, r? : number): void {
    let rows = 0;
    if(f && r){this.first = f; rows = r; }
    if(!f && !r){this.first = 0; this.rows = 6;}
    
   
    this.paginationItems = this.textService.texts$.pipe(map(texts => texts.slice(this.first, rows == 0 ? this.rows : rows)));
    this.totalRecords = this.textService.texts$.pipe(map(texts=>texts.length || 0))
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

  onLexiconOptionChange() {
    const fieldsToReset = [
        'lexicalEntryText', 'lexicalEntryType', 'lexicalEntryPos', 'lexicalEntryAuthor', 
        'lexicalEntryLanguage', 'lexicalEntryStatus', 'formText', 'formAuthor',
        'lexicalElementLabel', 'lexicalElementIRI'
    ];
    
    fieldsToReset.forEach(field => {
        this.advancedSearchForm.get(field)?.reset();
    });

    this.advancedSearchForm.get('lexicalEntrySearchMode')?.setValue('contains')
  }

  thereWasAnError(){
    this.somethingWrong = true;
    return EMPTY;
  }

  /* markAsTouched(){
    this.advancedSearchForm.markAllAsTouched();
  }
 */
  resetFields(){
    this.advancedSearchForm.markAsUntouched();
    this.advancedSearchForm.patchValue(this.initialFormValues);
    this.first = 0;
    this.rows = 6;
    this.paginationItems = this.textService.texts$.pipe(map(texts => texts.slice(0, 6)));
    this.totalRecords = this.textService.texts$.pipe(map(texts=>texts.length || 0))
  }

  handleAutocompleteFilterLocation(evt: any){
    
    this.advancedSearchForm.markAllAsTouched();

    if(evt.ancientPlaceLabel != ''){
      this.advancedSearchForm.get('modernName')?.setValue(evt.modernPlaceLabel, {emitEvent: false})
    }

    this.advancedSearchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
  }

  handleAutocompleteFilter(evt: any){
    
    this.advancedSearchForm.markAllAsTouched();

    if(evt.form != ''){
      this.advancedSearchForm.get('lexicalElementIRI')?.setValue(evt.form, {emitEvent: false})
      this.advancedSearchForm.get('lexicalElementLabel')?.setValue(evt.label, {emitEvent: false})
    }

    this.advancedSearchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
  }

  onSelectLexicalEntry(evt : any){

    this.advancedSearchForm.markAllAsTouched();

    if(evt.value != ''){
      this.advancedSearchForm.get('lexicalElementIRI')?.setValue(evt.value, {emitEvent: false})
      this.advancedSearchForm.get('lexicalElementLabel')?.setValue(evt.label, {emitEvent: false})
    }

    this.advancedSearchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
  }

  onChangeSlider(event : any){
    
    if(event.value){
      this.advancedSearchForm.get('dateOfOriginNotBefore')?.markAsTouched();
      this.advancedSearchForm.get('dateOfOriginNotBefore')?.setValue(this.start)
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(null)

    }

    if(event.values){
      this.advancedSearchForm.get('dateOfOriginNotBefore')?.markAsTouched();
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.markAsTouched();

      this.advancedSearchForm.get('dateOfOriginNotBefore')?.setValue(this.mappingInscriptionRange[0])
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(this.mappingInscriptionRange[1])

    }
  }

  onChangeBibliographySlider(event : any){
    
    if(event.value){
      this.advancedSearchForm.get('bibliographyFromDate')?.setValue(this.mapBibliographySingle)
      this.advancedSearchForm.get('bibliographyToDate')?.setValue(null)

    }

    if(event.values){
      this.advancedSearchForm.get('bibliographyFromDate')?.setValue(this.mappingBibliograpgyRange[0])
      this.advancedSearchForm.get('bibliographyToDate')?.setValue(this.mappingBibliograpgyRange[1])

    }
  }

  setInscriptionDateInterval(){
    if(this.isActiveInscriptionInterval){
      this.advancedSearchForm.get('dateOfOriginNotBefore')?.setValue(this.mappingInscriptionRange[0])
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(this.mappingInscriptionRange[1])
    }else{
      this.advancedSearchForm.get('dateOfOriginNotBefore')?.setValue(this.start)
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(null)
    }
  }

  setBibliographyDateInterval(){
    if(this.isActiveBibliographyInterval){
      this.advancedSearchForm.get('bibliographyFromDate')?.setValue(this.mappingBibliograpgyRange[0])
      this.advancedSearchForm.get('bibliographyToDate')?.setValue(this.mappingBibliograpgyRange[1])
    }else{
      this.advancedSearchForm.get('bibliographyFromDate')?.setValue(this.mapBibliographySingle)
      this.advancedSearchForm.get('bibliographyToDate')?.setValue(null)
    }
  }

  
}