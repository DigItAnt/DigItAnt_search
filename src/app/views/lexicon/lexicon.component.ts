import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { catchError, EMPTY, filter, iif, map, Observable, of, Subject, takeLast, takeUntil, tap, timeout } from 'rxjs';
import { LexicalElement, LexiconService } from 'src/app/services/lexicon/lexicon.service';

export interface LanguagesCounter {
  language : string,
  count : number,
}

export interface PosCounter {
  pos : string,
  count : number,
}
export interface AlphaCounter {
  letter : string,
  count : number
}
export interface LexiconFilter {
  filter: string,
  letter: string,
  word: string,
  language: string,
  pos : string,
}

@Component({
  selector: 'app-lexicon',
  templateUrl: './lexicon.component.html',
  styleUrls: ['./lexicon.component.scss']
})
export class LexiconComponent implements OnInit {

  //RXJS
  destroy$: Subject<boolean> = new Subject<boolean>();

  allowedFilters: string[] = ['all', 'language', 'pos', 'sense', 'concept'];
  allowedOperators: string[] = ['filter', 'letter', 'word', 'language', 'pos', 'senseType', 'conceptType'];

  first: number = 0;
  rows: number = 10;
  somethingWrong: boolean = false;

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

  activeWord : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.word)
  )

  activeLanguage : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.language)
  )

  activePos : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.pos)
  )

  wordOrLetter: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => {
      if(filter.letter)return 'letter';
      if(filter.word) return 'word';
      return '';
    })
  )

  groupAlphabet : Observable<AlphaCounter[]> = this.lexiconService.lexicon$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(lexicon=> groupAlphabet(lexicon)),
  )

  groupPos : Observable<PosCounter[]> = this.lexiconService.lexicon$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), 
        of([]) 
    )),
    takeUntil(this.destroy$),
    map(lexicon=> groupByPos(lexicon)),
  )
      
  groupLanguages: Observable<LanguagesCounter[]> = this.lexiconService.lexicon$.pipe(
    takeUntil(this.destroy$),
    map(lexicon => groupByLanguages(lexicon)),
  )

  totalRecords: Observable<number> = this.lexiconService.lexicon$.pipe(
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

  paginationItems: Observable<LexicalElement[]> = this.lexiconService.lexicon$.pipe(
    timeout(15000),
    catchError(err =>
      iif(
        () => err,
        this.thereWasAnError(), // -- true, 
        of([])
      )),
    takeUntil(this.destroy$),
    map((lexicon) => lexicon.slice(this.first, this.rows)),
    //tap((x) => this.showSpinner = false)
  );

  constructor(private route: Router,
    private activatedRoute: ActivatedRoute,
    private lexiconService: LexiconService
  ) { }

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
          if (keys.length > 1) {
            this.pagination({} as Paginator, keys[1], values[1])
          }

        }
      }
    );
  }

  getAllData(f? : number, r? : number): void {
    let rows = 0;
    if(f && r){this.first = f; rows = r; }
    if(!f && !r){this.first = 0; this.rows = 10;}
    
   
    this.paginationItems = this.lexiconService.lexicon$.pipe(map(lexicon => lexicon.slice(this.first, rows == 0 ? this.rows : rows)));
    this.totalRecords = this.lexiconService.lexicon$.pipe(map(lexicon=>lexicon.length || 0))
  }

  filterByLetter(f?: number, r?: number, letter?: string): void {
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 12; }

    this.paginationItems = this.lexiconService.filterByLetter((letter)||'').pipe(map(text=>text.slice(f, r)))
    this.totalRecords = this.lexiconService.filterByLetter((letter)||'').pipe(map(texts=>texts.length || 0))
    
  }


  filterByLanguage(f?: number, r?: number, lang?: string): void {
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 12; }

    this.paginationItems = this.lexiconService.filterByLanguage((lang)||'').pipe(map(lexicon=>lexicon.slice(f, r)))
    this.totalRecords = this.lexiconService.filterByLanguage((lang)||'').pipe(map(lexicon=>lexicon.length || 0))
    
  }

  filterByPos(f?: number, r?: number, pos?: string): void {
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 12; }

    this.paginationItems = this.lexiconService.filterByPos((pos)||'').pipe(map(lexicon=>lexicon.slice(f, r)))
    this.totalRecords = this.lexiconService.filterByPos((pos)||'').pipe(map(lexicon=>lexicon.length || 0))
    
  }

  goToDefaultUrl() {
    this.route.navigate(['/lexicon'], { queryParams: { filter: 'all', letter: '*' } });
  }

  pagination(event: Paginator, ...args: any[]) {
    if (Object.keys(event).length != 0) { this.first = event.first; this.rows = event.rows; }
    if (Object.keys(event).length == 0) { this.first = 0; this.rows = 10; }

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
        case 'letter': this.filterByLetter(this.first, rows, value); break;
        case 'language' : this.filterByLanguage(this.first, rows, value); break;
        case 'pos' : this.filterByPos(this.first, rows, value); break;
        // case 'type' : this.filterByType(value, this.first, rows); break;
      }
      return;
    }
  }


  thereWasAnError(){
    this.somethingWrong = true;
    return EMPTY;
  }
}


function groupAlphabet(lexicalElements : LexicalElement[]) : AlphaCounter[]{
  let tmp : AlphaCounter[] = [];
  let count : number = 0;
  lexicalElements.forEach(lexEl => {
    count = lexicalElements.reduce((acc, cur) => cur.label[0].toLowerCase() == lexEl.label[0].toLowerCase() ? ++acc : acc, 0);
    if(count > 0) {tmp.push({ letter : lexEl.label[0].toLowerCase(), count : count} )
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.letter] : object}), {})
  )

  return tmp;
}

function groupByLanguages(lexicon: LexicalElement[]) : LanguagesCounter[]{
  let tmp : LanguagesCounter[] = [];
  let count : number = 0;
  lexicon.forEach(lexicalElement=> {
    count = lexicon.reduce((acc, cur) => cur.language == lexicalElement.language ? ++acc : acc , 0);
    if(count > 0) {tmp.push({language: lexicalElement.language, count: count})}
  })

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.language] : object}), {})
  )

  
  return tmp;

}

function groupByPos(lexicon: LexicalElement[]) : PosCounter[]{
  let tmp : PosCounter[] = [];
  let count : number = 0;
  lexicon.forEach(lexicalElement=> {
    count = lexicon.reduce((acc, cur) => cur.pos == lexicalElement.pos ? ++acc : acc , 0);
    if(count > 0) {tmp.push({pos: lexicalElement.pos, count: count})}
  })

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.pos] : object}), {})
  )

  
  return tmp;

}