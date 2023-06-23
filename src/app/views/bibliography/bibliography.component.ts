import { HttpResponseBase } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { TreeNode } from 'primeng/api';
import { Paginator } from 'primeng/paginator';
import { BehaviorSubject, catchError, debounceTime, delay, EMPTY, filter, iif, map, Observable, of, Subject, Subscription, switchMap, takeUntil, tap, timeout } from 'rxjs';
import { BibliographyService, Book } from 'src/app/services/bibliography/bibliography.service';
import { FormElementTree, LexicalElement, LexiconService } from 'src/app/services/lexicon/lexicon.service';
import { TextMetadata, TextsService } from 'src/app/services/text/text.service';
import * as data from '../../../assets/mock/words.json'
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
  rows: number = 6;
  somethingWrong: boolean = false;
  treeLoading : boolean = true;
  currentBook: string = '';

  allowedOperators: string[] = ['filter', 'author', 'name', 'letter', 'year', 'book'];
  allowedFilters: string[] = ['all', 'author', 'title', 'date']; /* 'argument' */

  lexiconTree : Observable<TreeNode[]> = this.lexiconService.lexicon$.pipe(
    map(lexicon => this.mapLexicalElement(lexicon)),
    tap(x => this.treeLoading = false)
  );

  selectedFile: any = undefined;

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
    map((filter: LexiconFilter) => filter.filter)
  );

  activeLetter : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.letter)
  )

  activeBook : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.book),
    tap( book => this.currentBook = book)
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

  groupTitles : Observable<AlphaCounter[]> = this.bibliographyService.books$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(books=> groupTitles(books)),
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

  groupTexts : Observable<TextMetadata[]> = this.textsService.texts$.pipe(
    tap(x=> console.log(x))
  );

  paginationItems: Observable<Book[]> = this.bibliographyService.books$.pipe(
    timeout(15000),
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(), // -- true, 
        of([])
      )),
    takeUntil(this.destroy$),
    map((books) => books.slice(this.first, this.rows)),
    //tap((x) => this.showSpinner = false)
  );

  totalRecords: Observable<number> = this.bibliographyService.books$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), // -- true, 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map((lexicon) => lexicon.length || 0),
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
    fromDate : new FormControl(null),
    toDate : new FormControl(null),
    author : new FormControl(null),
    location : new FormControl(null),
    inscriptionId : new FormControl(null),
    word : new FormControl(null)
  });

  getBookPaginationIndexReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getBookByIndexReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  getBookIdByIndexReq$ : BehaviorSubject<number> = new BehaviorSubject<number>(NaN);

  getBookPaginationIndex : Observable<number> = this.getBookPaginationIndexReq$.pipe(
    switchMap(fileId => fileId != '' ? this.bibliographyService.getIndexOfText(fileId) : of()),
    tap(index => this.getBookByIndexReq$.next(index))
  )

  getBookIdByIndex : Observable<string> = this.getBookIdByIndexReq$.pipe(
    switchMap(index => !isNaN(index) ? this.bibliographyService.getBookKeyByIndex(index) : of()),
    tap(bookId => {
      if(bookId != ''){
        this.route.navigate(['/bibliography'], {queryParams : {book : bookId}})
      }
    }),
  )

  getBookByIndex : Observable<Book> = this.getBookByIndexReq$.pipe(
    switchMap(index => !isNaN(index) ? this.bibliographyService.getBookByIndex(index) : of()),
    tap(book => {
      if(book){
        /* this.getTextContentReq$.next(file['element-id']);
        this.isBodyTextPartArray = Array.isArray(file.bodytextpart) */
      }
    })
  )

  textPagination(event: PaginatorEvent){
    let indexRequested = event.page;
    this.getBookIdByIndexReq$.next(indexRequested);
  }

  constructor(private activatedRoute: ActivatedRoute,
              private route: Router,
              private bibliographyService : BibliographyService,
              private textsService : TextsService,
              private lexiconService : LexiconService) { }

  ngOnInit(): void {

    this.bibliographySearchForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(2000)).subscribe(
      data=>{
        if(this.bibliographySearchForm.touched){

          let shouldStart = Object.values(data).some(value => value !== null && value !== '');
          if(shouldStart){
            this.buildBibliographyCrossQuery(data)
          }else{
            this.getAllData()
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
          if (keys.length > 1 && keys[0] == 'filter') {
            this.pagination({} as Paginator, keys[1], values[1])
          }

          if(keys.length == 1 && values[0] == 'title'){
            this.goToDefaultUrlTitles();
          }

          if(keys[0] == 'book'){

            let fileId = values[0];
            this.getBookPaginationIndexReq$.next(fileId);

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

  buildBibliographyCrossQuery(formValues : FormGroup){
    
    this.paginationItems = of([]);
    this.totalRecords = of(NaN)

    this.route.navigate(
      [],
      {
        relativeTo: this.activatedRoute,
        queryParams: {filter : 'search'}, 
        
      }
    )
    
    this.paginationItems = this.bibliographyService.combineResults(formValues).pipe(
      catchError(error => {
        console.error('An error occurred:', error);
        if(error.status != 200) this.thereWasAnError() // Stampa l'errore sulla console
        return of([])// Ritorna un Observable con una struttura di AnnotationsRows vuota
      }),
      tap(res => this.filteredResults = of(res)),
      tap(res=> {
        setTimeout(() => {
          this.totalRecords = of(res.length)
        }, 100);
      }),
      map(res => res.slice(0, 6))
    )
    
  }

  resetFields(){
    this.bibliographySearchForm.reset();
    this.first = 0;
    this.rows = 6;
    this.paginationItems = this.bibliographyService.books$.pipe(map(books => books.slice(0, 6)));
    this.totalRecords = this.bibliographyService.books$.pipe(map(books=>books.length || 0))
  }

  clearDates(){
    this.bibliographySearchForm.get('toDate')?.setValue(null, {emitEvent: true})
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
  searchLocations : Observable<LocationsCounter[]> = this.autocomplete$.pipe(
    debounceTime(1000),
    filter(autoCompleteEvent => autoCompleteEvent.query != ''),
    switchMap(autoCompleteEvent=> this.textsService.searchLocation(autoCompleteEvent.query)),
    map(texts=> groupLocations(texts, true)),
    tap(results => this.autocompleteLocations = results)
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
    this.route.navigate(['/bibliography'], { queryParams: { filter: 'all'} });
  }

  goToDefaultUrlTitles() {
    this.route.navigate(['/bibliography'], { queryParams: { filter: 'title', letter : 'a'} });
  }

  

  pagination(event: Paginator, ...args: any[]) {
    if (Object.keys(event).length != 0) { this.first = event.first; this.rows = event.rows; }
    if (Object.keys(event).length == 0) { this.first = 0; this.rows = 6; }

    let rows = (this.first != this.rows) && (this.first < this.rows) ? this.rows : this.first + this.rows;
    if (args.length > 0) { args = args.filter(query => query != null) }
    if(args.length==1){
      if(args[0] == 'all'){
        this.getAllData(this.first, rows);
      }else if(args[0]=='search'){
        if(this.filteredResults != undefined){
          this.paginationItems = this.filteredResults.pipe(
            map((res:any)=> {
              if(res.length >0){
                res.slice(this.first, rows)
              }else{
                this.getAllData(this.first, rows);
              }
            })
          );
        }else{
          this.getAllData(this.first, rows)
        }
        
      }
      
      return;
    }
    if (args.length > 1) {
      let filter = args[0];
      let value = !isNaN(parseInt(args[1])) ? parseInt(args[1]) : args[1];

      switch (filter) {
        case 'name': this.filterByAuthor(this.first, rows, value); break;
        case 'letter' : this.filterByLetter(this.first, rows, value); break;
        case 'year' : this.filterByYear(this.first, rows, value); break;
       
      }
      return;
    }
  }

  filterByAuthor(f?: number, r?: number, authorName?: string): void {
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 6; }

    this.paginationItems = this.bibliographyService.filterByAuthor((authorName)||'').pipe(map(book=>book.slice(f, r)))
    this.totalRecords = this.bibliographyService.filterByAuthor((authorName)||'').pipe(map(books=>books.length || 0))
    
  }

  filterByYear(f?: number, r?: number, date?: string): void {
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 6; }

    this.paginationItems = this.bibliographyService.filterByYear((date)||'').pipe(map(book=>book.slice(f, r)))
    this.totalRecords = this.bibliographyService.filterByYear((date)||'').pipe(map(books=>books.length || 0))
    
  }

  filterByLetter(f?: number, r?: number, letter?: string): void {
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 6; }

    this.paginationItems = this.bibliographyService.filterByLetter((letter)||'').pipe(map(book=>book.slice(f, r)))
    this.totalRecords = this.bibliographyService.filterByLetter((letter)||'').pipe(map(books=>books.length || 0))
    
  }

  getAllData(f? : number, r? : number): void {
    let rows = 0;
    if(f && r){this.first = f; rows = r; }
    if(!f && !r){this.first = 0; this.rows = 6;}
    
   
    this.paginationItems = this.bibliographyService.books$.pipe(map(books => books.slice(this.first, rows == 0 ? this.rows : rows)));
    this.totalRecords = this.bibliographyService.books$.pipe(map(books=>books.length || 0))
  }

  

}


function groupTitles(books: Book[]): AlphaCounter[] {
  let tmp: AlphaCounter[] = [];
  let count: number = 0;
  books.forEach(lexEl => {
    // Normalize title by removing non-alphabetic characters
    const normalizedTitle = lexEl.title.toLowerCase().replace(/[^a-z]/gi, '');

    count = books.reduce((acc, cur) => {
      const normalizedCurTitle = cur.title.toLowerCase().replace(/[^a-z]/gi, '');
      return normalizedCurTitle[0].toLowerCase() == normalizedTitle[0].toLowerCase() ? ++acc : acc;
    }, 0);

    if(count > 0) {
      tmp.push({ letter: normalizedTitle[0].toLowerCase(), count: count });
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({ ...acc, [object.letter]: object }), {})
  );

  tmp.sort((a, b) => {
    if (a.letter < b.letter) {
      return -1;
    }
    if (a.letter > b.letter) {
      return 1;
    }
    return 0;
  });
  
  return tmp;
}

function groupByAuthors(books: Book[]) : AuthorCounter[]{
  let tmp : AuthorCounter[] = [];
  let count : number = 0;
  books.forEach(book=> {
    count = books.reduce((acc, cur) => cur.author == book.author ? ++acc : acc , 0);
    if(count > 0) {tmp.push({name: book.author, count: count})}
  })

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.name] : object}), {})
  )

  
  return tmp;
}

function groupByDates(books: Book[]): DateCounter[] {
  let tmp: DateCounter[] = [];
  let count: number = 0;
  books.forEach(book => {
    // Normalize date by extracting year and removing square brackets
    const yearRegex = /\d{4}/;
    const match = book.date.match(yearRegex);
    const normalizedDate = match ? match[0] : '';

    count = books.reduce((acc, cur) => {
      const curMatch = cur.date.match(yearRegex);
      const normalizedCurDate = curMatch ? curMatch[0] : '';
      return normalizedCurDate == normalizedDate ? ++acc : acc;
    }, 0);

    if(count > 0 &&  normalizedDate != '') {
     
      tmp.push({ date: normalizedDate, count: count });
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({ ...acc, [object.date]: object }), {})
  );

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
