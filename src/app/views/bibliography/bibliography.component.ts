import { HttpResponseBase } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { catchError, debounceTime, EMPTY, filter, iif, map, Observable, of, Subject, Subscription, takeUntil, tap, timeout } from 'rxjs';
import { BibliographyService, Book } from 'src/app/services/bibliography/bibliography.service';
import * as data from '../../../assets/mock/words.json'
import { AlphaCounter, AuthorCounter, DateCounter, LexiconFilter } from '../lexicon/lexicon.component';

@Component({
  selector: 'app-bibliography',
  templateUrl: './bibliography.component.html',
  styleUrls: ['./bibliography.component.scss']
})
export class BibliographyComponent implements OnInit {

  destroy$: Subject<boolean> = new Subject<boolean>();
  first: number = 0;
  rows: number = 6;
  somethingWrong: boolean = false;
  currentBook: string = '';

  allowedOperators: string[] = ['filter', 'author', 'name', 'letter', 'year', 'form', 'language', 'pos', 'senseType', 'conceptType'];
  allowedFilters: string[] = ['all', 'author', 'title', 'date']; /* 'argument' */


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


  constructor(private activatedRoute: ActivatedRoute,
              private route: Router,
              private bibliographyService : BibliographyService) { }

  ngOnInit(): void {
    
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

          if(keys[0] == 'word'){

            //è una lexical entry
            /* if(keys.length == 1){
              this.getLexicalEntryReq$.next(values[0])
            } */

            //è una form
            /* if(keys.length == 2){
              this.getFormReq$.next(values[1]);
              this.getAttestationsReq$.next(values[1])
            } */

          }
        }
      }
    );

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
      this.getAllData(this.first, rows);
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