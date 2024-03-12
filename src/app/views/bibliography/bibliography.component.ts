import { HttpResponseBase } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { TreeNode } from 'primeng/api';
import { Paginator } from 'primeng/paginator';
import { BehaviorSubject, catchError, debounceTime, delay, EMPTY, filter, forkJoin, iif, map, Observable, of, Subject, Subscription, switchMap, take, takeUntil, tap, timeout, withLatestFrom } from 'rxjs';
import { BibliographyService, Book } from 'src/app/services/bibliography/bibliography.service';
import { FormElementTree, LexicalElement, LexiconService } from 'src/app/services/lexicon/lexicon.service';
import { TextsService } from 'src/app/services/text/text.service';
import { AlphaCounter, AuthorCounter, DateCounter, LexiconFilter, TreeEvent } from '../lexicon/lexicon.component';
import { AutoCompleteEvent, LocationsCounter, PaginatorEvent } from '../texts/texts.component';

@Component({
  selector: 'app-bibliography',
  templateUrl: './bibliography.component.html',
  styleUrls: ['./bibliography.component.scss']
})
export class BibliographyComponent implements OnInit {

  destroy$: Subject<boolean> = new Subject<boolean>();
  autocomplete$ : BehaviorSubject<AutoCompleteEvent> = new BehaviorSubject<AutoCompleteEvent>({originalEvent: {}, query: ''});
  first: number = 0;
  rows: number = 8;

  startIndex : number = 0;

  somethingWrong: boolean = false;
  treeLoading : boolean = true;
  currentBook: string = '';

  isActiveSearchForm: boolean = false;

  allowedOperators: string[] = ['filter', 'author', 'name', 'letter', 'year', 'book'];
  allowedFilters: string[] = ['all']; /* 'argument' */ /* , 'author', 'title', 'date' */

  alphabet : string[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

  lexiconTree : Observable<TreeNode[]> = this.lexiconService.lexicon$.pipe(
    map(lexicon => this.mapLexicalElement(lexicon)),
    tap(x => this.treeLoading = false)
  );

  selectedFile: any = undefined;
  minDate: Date = new Date();
  maxDate: Date = new Date();
  showSpinner: boolean = false;

  mapLexicalElement(lexicon : LexicalElement[]) : TreeNode[] {
    return lexicon.map((lexEl : LexicalElement) => ({
      label : lexEl.label,
      data: lexEl,
      children : [],
      leaf : !lexEl.hasChildren,
      draggable: false,
      droppable: false
    }))
  }

  resetLexicalChoices(){
    this.selectedFile = undefined;
  }

  setLexicalInstanceName(){
    console.log(this.selectedFile)

    let nodeData = this.selectedFile.data;

    let instanceName = nodeData.lexicalEntry && nodeData.form ? nodeData.form : nodeData.lexicalEntry
    this.bibliographySearchForm.get('lexicalInstanceName')?.setValue(instanceName);
    
  }

  loadNode$ : BehaviorSubject<TreeEvent> = new BehaviorSubject<TreeEvent>({node: {}, originalEvent: new PointerEvent('')});
  getChildren : Observable<TreeNode[]> = this.loadNode$.pipe(
    filter(event => Object.keys(event.node).length > 0),
    switchMap(event => this.lexiconService.getForms(event.node.data.lexicalEntry).pipe(
      map(forms=> this.mapFormElement(forms)),
      map(formsNodes => event.node.children = formsNodes),
    )),
  )

  mapFormElement(lexicon : FormElementTree[]) : TreeNode[] {
    if(lexicon.length == 0){
      return [{
        label : 'No children',
        data : null,
        leaf : true,
        draggable : false,
        droppable : false,
        selectable : false,
      }]
    }
    return lexicon.map((lexEl : FormElementTree) => ({
      label : lexEl.label,
      data: lexEl,
      leaf : true,
      draggable: false,
      droppable: false
    }))
  }


  activeTab: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.filter),
    tap(x=> {
      if(x=='search'){
        this.isActiveSearchForm = true;
      }else{
        this.isActiveSearchForm = false;
      }
    })
  );

  activeLetter : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.letter)
  )

  activeBook : Observable<any> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.book),
    tap( book => book ? this.currentBook = book : null),
/*     switchMap( bookKey => this.bibliographyService.getBookDetails(bookKey)),
 */    switchMap(bookKey => 
      bookKey !== undefined ? 
      this.bibliographyService.getBookDetails(bookKey) : 
      of(null) // Restituisce null se bookKey è undefined o null
    ),
    tap( res => console.log(res))
  )

  activeAuthor : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.name)
  )

  activeDate : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.year)
  )

  bookOrLetter: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => {
      if(filter.letter)return 'letter';
      if(filter.book) return 'book';
      return '';
    })
  )

  getAttestations : Observable<any[]> = this.activeBook.pipe(
    filter(book => book != undefined && book.key != ''),
    takeUntil(this.destroy$),
    switchMap(book => this.bibliographyService.getAttestationsByBookKey(book.key)),
    tap(x => console.log(x))
  )

  getLexicalEntries : Observable<any> = this.getAttestations.pipe(
    //TODO: CHECK
    filter(anno => anno != undefined && Array.isArray(anno) && anno.length > 0),
    takeUntil(this.destroy$),
    switchMap(anno=> this.bibliographyService.getAnnotations(anno)),
    map(entries => entries.filter((entry:any) => {
      const biblio = entry.attributes.bibliography;
      // Controlla se biblio è un array
      if (Array.isArray(biblio)) {
        // Scorri l'array e controlla se almeno un elemento ha la key corrispondente a currentBook
        return biblio.some(b => b.key === this.currentBook);
      } else if (biblio) {
        // Se biblio è un oggetto, controlla direttamente la key
        return biblio.key === this.currentBook;
      }
      // Escludi l'elemento se biblio non esiste o non soddisfa le condizioni
      return false;
    })),
    tap(x=>console.log(x))
  )

  loadingGeoData = false;
  geoData = this.textsService.geoData;
  
 

  paginationItems: Observable<Book[]> = this.bibliographyService.paginationItems().pipe(
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

  totalRecords: Observable<number> = this.bibliographyService.countTotalBooks().pipe(
    takeUntil(this.destroy$),
  );
  

  thereWasAnError(err? : HttpResponseBase, source? : string){
    if(err?.status != 200){
      this.somethingWrong = true;
      return EMPTY;
    }
    

    return of()
  }


  @ViewChild('paginator', { static: true }) paginator: Paginator | undefined

  isActiveInterval : boolean = false;
  displayModal : boolean = false;

  bibliographySearchForm: FormGroup = new FormGroup({ 
    title: new FormControl(null), 
    id : new FormControl(null),
    date : new FormControl(null),
    author : new FormControl(null),
    location : new FormControl(null),
    inscriptionId : new FormControl(null),
    word : new FormControl(null)
  });

  constructor(private activatedRoute: ActivatedRoute,
              private route: Router,
              private bibliographyService : BibliographyService,
              private textsService : TextsService,
              private lexiconService : LexiconService) { }

  ngOnInit(): void {
    this.minDate = new Date(1700, 0, 1); // 1 gennaio 1980
    this.maxDate = new Date(); // Data odierna
    
    this.bibliographySearchForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(2000)).subscribe(
      data=>{
        if(this.bibliographySearchForm.touched){
         
          let shouldStart = Object.values(data).some(value => value !== null && value !== '');
          let result = true; // Imposta il valore di default su true

          if (Array.isArray(data.date) && data.date[1] === null) {
            result = false;
          }

          if(shouldStart && result){
            
            this.buildBibliographyCrossQuery(data)
          }
        }
      }
    )
    
    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(
      (event) => {
        if (event) {
          const keys = Object.keys(event);
          const values = Object.values(event);
          if (keys.length == 0 || (keys.length == 1 && keys[0] == 'filter' && values[0] == 'all')) {
            this.goToDefaultUrl();
            return;
          }
          if (keys) {
            for (const [key, value] of Object.entries(event)) {
              if (!this.allowedOperators.includes(key) ||
                event[key] == '' ||
                (Array.isArray(event[key]) && Array.from(event[key]).length > 1)) {
                this.goToDefaultUrl();
                return;
              }
            }
          }

          if (keys.length > 1) {
            this.currentBook = '';
            
            this.pagination({} as Paginator, keys[1], values[1])
          }

          if(keys.length == 1 && values[0] == 'search'){
            this.currentBook = '';
            
            this.buildBibliographyCrossQuery(this.bibliographySearchForm.value);
          }
        }
      }
    );

  }



  showModalDialog() {
    this.selectedFile = undefined;
    this.bibliographySearchForm.markAsTouched();
    this.displayModal = true;
  }

  filteredResults : any;

  buildBibliographyCrossQuery(formValues : FormGroup, f?: number, r? : number){
    this.isActiveSearchForm = true;
    //this.paginationItems = of([]);
    //this.totalRecords = of(NaN);
    this.first = 0;
    this.rows = 8;
    this.showSpinner = true;
    this.route.navigate(
      [],
      {
        relativeTo: this.activatedRoute,
        queryParams: { filter: 'search' },
      }
    )

    const shouldStartQuery = Object.keys(formValues).some(key => {
      const control = this.bibliographySearchForm.get(key);
      return control && control.touched && control.value !== null;
    });

    if(shouldStartQuery){
      let rows = this.first >= this.rows ? this.first + this.rows : this.rows;
      this.paginationItems = this.bibliographyService.combineResults(formValues).pipe(
        catchError(error => {
          console.error('An error occurred:', error);
          if(error.status != 200) this.thereWasAnError(); this.showSpinner = false; // Stampa l'errore sulla console
          return of([])// Ritorna un Observable con una struttura di AnnotationsRows vuota
        }),
        tap(res => {
          if(res && res.length >= 0){
            this.totalRecords = of(res.length)
          }else{
            this.totalRecords = of(0)
          }
        }),
        map(res => {
          if(res && res.length>0){
            this.showSpinner = false;
            return res.slice(this.first, rows);

          }else{
            this.showSpinner = false;
            return []
          }
        })
      )

      /* this.totalRecords = this.bibliographyService.countTotalBooks(formValues).pipe(
        takeUntil(this.destroy$)
      ) */
    }else{

    }
    
    
  }

  resetFields(){
    this.bibliographySearchForm.reset();
    this.bibliographyService.emptyCachedResults();
    this.paginationItems = this.bibliographyService.paginationItems(this.first, this.rows);
    this.totalRecords = this.bibliographyService.countTotalBooks().pipe(
      takeUntil(this.destroy$),
    );
  }

  clearDates(){
    this.bibliographySearchForm.get('date')?.setValue(null, {emitEvent: true})
  }

  clearLocation(){
    this.bibliographySearchForm.get('location')?.setValue(null, {emitEvent: true})
  }

  clearInscription(){
    this.bibliographySearchForm.get('inscriptionId')?.setValue(null, {emitEvent: true})
  }

  handleAutocompleteFilter(evt: any){
    
    this.bibliographySearchForm.markAllAsTouched();

    if(evt.ancientPlaceId != ''){
      this.bibliographySearchForm.get('location')?.setValue(evt.ancientPlaceLabel)
    }

    this.bibliographySearchForm.updateValueAndValidity({ onlySelf: false, emitEvent: true })
  }

  autocompleteLocations: Array<LocationsCounter> = [];

  searchLocations: Observable<any[]> = this.autocomplete$.pipe(
    debounceTime(1000),
    filter(autoCompleteEvent => autoCompleteEvent.query != ''),
    withLatestFrom(this.textsService.geoData),
    map(([query, r]) => {
      return r.filter(item => item.modernName.includes(query.query))
    })
  )

  markAsTouched(){
    this.bibliographySearchForm.markAllAsTouched();
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

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  goToDefaultUrl() {
    this.route.navigate(['/bibliography'], { queryParams: { filter: 'all', letter : 'a'} });
  }

  pagination(event: Paginator, ...args: any[]) {
    this.showSpinner = true;
    if (Object.keys(event).length != 0) { this.first = event.first; this.rows = event.rows; }
    if (Object.keys(event).length == 0) { this.first = 0; this.rows = 8; }
    let rows = this.first >= this.rows ? this.first + this.rows : this.rows;

    if (args.length == 2 && args[1]==null) {

      const shouldStartQuery = Object.keys(this.bibliographySearchForm.value).some(key => {
        const control = this.bibliographySearchForm.get(key);
        return control && control.touched && control.value !== null;
      });

      if (this.bibliographyService.getCachedResults() && this.bibliographyService.getCachedResults().length > 0) {
        this.paginationItems = of(this.bibliographyService.getCachedResults().slice(this.first, rows))
        this.showSpinner = false;
      }else{
        this.paginationItems = this.bibliographyService.paginationItems(this.first, this.rows);
        this.showSpinner = false;
      }

     
    }
    if (args.length > 1) {
      let filter = args[0];
      let value = !isNaN(parseInt(args[1])) ? parseInt(args[1]) : args[1];

      switch (filter) {
        case 'letter': this.filterByLetter(value); break;
      }
      return;
    }
    
  }


  filterByLetter(letter : string) : void {
    this.showSpinner = true;
    this.paginationItems = this.bibliographyService.filterByLetter(letter).pipe(
      tap(x => this.totalRecords = of(x.length)),
      tap(x => this.showSpinner = false)
    )
  }
}

