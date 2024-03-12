import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, NavigationStart, Params, Router } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { BehaviorSubject, catchError, debounceTime, delay, EMPTY, filter, iif, map, Observable, of, shareReplay, Subject, Subscription, switchMap, take, takeUntil, tap, timeout, withLatestFrom } from 'rxjs';
import { CenturyPipe } from 'src/app/pipes/century-pipe/century-pipe.pipe';
import { AdvancedsearchService } from 'src/app/services/advancedsearch/advancedsearch.service';
import { BibliographyService } from 'src/app/services/bibliography/bibliography.service';
import { LexicalElement, LexiconService } from 'src/app/services/lexicon/lexicon.service';
import { GlobalGeoDataModel, MapsService } from 'src/app/services/maps/maps.service';
import { TextMetadata, TextsService } from 'src/app/services/text/text.service';
import { AuthorCounter, DateCounter, StatisticsCounter } from '../lexicon/lexicon.component';
import { AlphabetCounter, AutoCompleteEvent, CenturiesCounter, DuctusCounter, LanguagesCounter, LocationsCounter, MaterialCounter, ObjectTypeCounter, TextFilter, TypesCounter, WordDivisionTypeCounter } from '../texts/texts.component';
import { groupAlphabet, groupByAuthors, groupByCenturies, groupByDates, groupByLexicalEntry, groupDuctus, groupLanguages, groupMaterial, groupObjectTypes, groupTypes, groupWordDivisionType } from '../texts/utils';

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

  start : number = -600;
  startBiblio : number = 1500;

  get mappingInscriptionRange(): number[] {
    let min = -600;
    let max = 100;
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
    bibliographyDate : new FormControl(null),
    bibliographyAuthor : new FormControl(null),
  });

  first: number = 0;
  rows: number = 8;
  isActiveInterval : boolean = false;
  minDate = new Date(1700, 0, 1); // 1 gennaio 1980
  maxDate = new Date(); // Data odierna

  autocompleteLocationReq$ : BehaviorSubject<AutoCompleteEvent> = new BehaviorSubject<AutoCompleteEvent>({originalEvent: {}, query: ''});
  autocompleteLexiconReq$ : BehaviorSubject<AutoCompleteEvent> = new BehaviorSubject<AutoCompleteEvent>({originalEvent: {}, query: ''});
  getFileByIdReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  typesList : Observable<StatisticsCounter[]> = this.lexiconService.types$;
  posList : Observable<StatisticsCounter[]> = this.lexiconService.pos$;
  authorsList : Observable<StatisticsCounter[]> = this.lexiconService.authors$;
  languagesList : Observable<StatisticsCounter[]> = this.lexiconService.languages$;
  statusList : Observable<StatisticsCounter[]> = this.lexiconService.status$;

  
  autocompleteLocations: Array<LocationsCounter> = [];
  destroy$: Subject<boolean> = new Subject<boolean>();




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

  totalRecords: Observable<number> = this.textService.countFiles().pipe(
    takeUntil(this.destroy$),
  );

  paginationItems: Observable<TextMetadata[]> = this.textService.paginationItems().pipe(
    tap(x=> this.showSpinner = true),
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(), // -- true, 
        of([])
      )),
    takeUntil(this.destroy$),
    tap((x) => this.showSpinner = false)
  );



  groupCenturies: Observable<CenturiesCounter[]> = this.textService.getUniqueMetadata('_doc__dateOfOriginNotBefore').pipe(
    takeUntil(this.destroy$),
    map(texts => groupByCenturies(texts)),
  )

  /* groupLocations: Observable<LocationsCounter[]> = this.textService.getUniqueMetadata('_doc__originalPlace__modernNameUrl').pipe(
    takeUntil(this.destroy$),
    map(data => data.map((item : any) => {
      const match = item.match(/(\d+)(?="?$)/);
      return match ? match[1] : null;
    }).filter((id : any) => id)),   // Filtra gli eventuali valori null
    map(data => data.map((item : any) => ({ modernPlaceId: item }))),
    tap(x => console.log(x))
  )
 */
  groupTypes: Observable<any[]> = this.textService.getUniqueMetadata('_doc__inscriptionType').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(texts => texts.filter((text : any) => text && text.trim() !== '')), // Filtra le stringhe vuot
    map(texts => texts.map((text : any) => ({inscriptionType : text})))
  )

  groupLanguages: Observable<LanguagesCounter[]> = this.textService.getUniqueMetadata('_doc__language__ident').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(texts => texts.filter((text : any) => text && text.trim() !== '' && !text.includes('Ital-x'))),
    map(lang => lang.map((l : any) => ({ language : l.replace(/[\"]/g,'')}))
    ) 
  )

  groupAlphabet: Observable<AlphabetCounter[]> = this.textService.getUniqueMetadata('_doc__alphabet').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(alphabets => alphabets.map((alpha : any) => ({alphabet : alpha}))),
  )

  groupObjectTypes: Observable<ObjectTypeCounter[]> = this.textService.getUniqueMetadata('_doc__support__objectType').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(objectTypes => objectTypes.map((obj : any) => ({objectType : obj.replace(/[\"]/g,'')}))),
  )

  groupMaterial: Observable<MaterialCounter[]> = this.textService.getUniqueMetadata('_doc__support__material').pipe(
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(),
        of([])
      )),
    takeUntil(this.destroy$),
    map(materials => materials.map((mat : any) => ({material : mat.replace(/[\"]/g,'')}))),
  ) 

  groupDuctus : Observable<DuctusCounter[]> = this.textService.getUniqueMetadata('_doc__bodytextpart__ductus').pipe(
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(texts => texts.filter((text : any) => text && text.trim() !== '')), 
    map(materials => materials.map((mat : any) => ({ductus : mat.replace(/[\"]/g,'')}))),
  )

  groupWordDivisionType : Observable<WordDivisionTypeCounter[]> = this.textService.getUniqueMetadata('_doc__wordDivisionType').pipe(
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(materials => materials.map((mat : any) => ({type : mat.replace(/[\"]/g,'')}))),
  )

  geoData = this.textService.geoData.pipe(
    /* switchMap(locations => this.mapsService.getGeoPlaceData(locations)), */
  )
  
  
  
  searchLocations: Observable<any[]> = this.autocompleteLocationReq$.pipe(
    filter(autoCompleteEvent => autoCompleteEvent.query != ''),
    withLatestFrom(this.geoData),
    map(([query, r]) => {
      return r.filter(item => item.modernName.includes(query.query))
    }),
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
    bibliographyDate: null,
    bibliographyAuthor: null
  };;

  constructor(private activatedRoute : ActivatedRoute, 
              private textService : TextsService,
              private mapsService : MapsService,
              private lexiconService : LexiconService,
              private bibliographyService : BibliographyService,
              private advancedSearchService : AdvancedsearchService) { }

  ngOnInit(): void {


    this.minDate = new Date(1700, 0, 1); // 1 gennaio 1980
    this.maxDate = new Date(); // Data odierna
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
          
          if(keys[0] == 'file'){
            
            let fileId = values[0];
            this.getFileByIdReq$.next(fileId);
          }
          
        }
      }
    );

  
  }

  buildTextQuery(){

    const formValues = this.advancedSearchForm.getRawValue(); // Ottiene tutti i valori dal form group
    const shouldStartQuery = Object.keys(formValues).some(key => {
      const control = this.advancedSearchForm.get(key);
      return control && control.touched && control.value !== null;
    });

    let result = true; // Imposta il valore di default su true

    if (Array.isArray(formValues.bibliographyDate) && formValues.bibliographyDate[1] === null) {
      result = false;
    }

    if (!shouldStartQuery && !result) {
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
      map(texts => texts.slice(this.first, this.rows))
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
    this.showSpinner = true;
    if(Object.keys(event).length != 0){this.first = event.first; this.rows = event.rows;}
    if(Object.keys(event).length == 0){this.first = 0; this.rows = 8;}

    let rows = (this.first != this.rows) && (this.first < this.rows) ? this.rows : this.first + this.rows;
    if(args.length>0){args =args.filter(query=>query != null)}

    if(this.advancedSearchService.getFilteredResults().length == 0){
      this.getAllData(this.first, rows);
    }else{

      let rows = this.first >= this.rows ? this.first + this.rows : this.rows;
      this.paginationItems = this.advancedSearchService.crossQuery(this.advancedSearchForm.value, this.advancedSearchForm).pipe(
        tap(x => this.showSpinner =false),
        map(texts => texts.slice(this.first, rows)),
        shareReplay(),
      );

    }
  }

  getAllData(f? : number, r? : number): void {
    this.showSpinner = true;
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 8; }


    this.paginationItems = this.textService.paginationItems(this.first+1, this.rows).pipe(
      tap(x => this.showSpinner =false),
      shareReplay(),
    );

    this.totalRecords = this.textService.countFiles();
  }

  clearDates(){
    this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(null, {emitEvent: true})
  }

  clearBiblioDate(){
    this.advancedSearchForm.get('bibliographyDate')?.setValue(null, {emitEvent: true})
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

  
  resetFields(){
    this.advancedSearchForm.markAsUntouched();
    this.advancedSearchForm.patchValue(this.initialFormValues);
    this.first = 0;
    this.rows = 8;
    this.paginationItems = this.textService.paginationItems(this.first+1, this.rows).pipe(
      tap(x => this.showSpinner =false),
      shareReplay(),
    );

    this.totalRecords = this.textService.countFiles();
  }

  handleAutocompleteFilterLocation(evt: any){
    this.advancedSearchForm.get('modernName')?.markAsTouched();
    //this.advancedSearchForm.markAllAsTouched();

    if(evt.modernName != ''){
      this.advancedSearchForm.get('modernName')?.setValue(evt.modernUri, {emitEvent: false})
    }

    this.advancedSearchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
    this.buildTextQuery();
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