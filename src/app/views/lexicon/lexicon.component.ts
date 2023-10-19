import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { BehaviorSubject, catchError, debounceTime, delay, distinctUntilChanged, EMPTY, filter, iif, map, mergeMap, Observable, of, repeat, retry, startWith, Subject, switchMap, take, takeLast, takeUntil, takeWhile, tap, throttle, throwError, timeout } from 'rxjs';
import { CognateElement, EtymologyElement, EtymologyTreeElement, FormElement, FormElementLabels, FormElementTree, LexicalElement, LexiconQueryFilter, LexiconService, SenseElement } from 'src/app/services/lexicon/lexicon.service';
import {TreeNode} from 'primeng/api';
import { FormControl, FormGroup } from '@angular/forms';
import { HttpResponseBase } from '@angular/common/http';
import { Annotation, TextsService } from 'src/app/services/text/text.service';

export interface TreeEvent {
  node : TreeNode,
  originalEvent : PointerEvent
}
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

export interface AuthorCounter {
  name : string,
  count : number
}

export interface DateCounter {
  date : string,
  count : number
}

export interface LexiconFilter {
  name : string,
  year : string,
  filter: string,
  letter: string,
  word: string,
  form: string,
  language: string,
  pos : string,
  book : string
}

export interface StatisticsCounter {
  label : string,
  count : number
}

@Component({
  selector: 'app-lexicon',
  templateUrl: './lexicon.component.html',
  styleUrls: ['./lexicon.component.scss']
})
export class LexiconComponent implements OnInit {

  //RXJS
  destroy$: Subject<boolean> = new Subject<boolean>();
  loadNode$ : BehaviorSubject<TreeEvent> = new BehaviorSubject<TreeEvent>({node: {}, originalEvent: new PointerEvent('')});

  selectedFile : TreeNode[] = [];

  allowedFilters: string[] = ['all', 'language', 'pos',]; /*  'sense', 'concept' */
  allowedOperators: string[] = ['filter', 'letter', 'word', 'form', 'language', 'pos', 'senseType', 'conceptType'];

  first: number = 0;
  rows: number = 6;
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
    map((filter: LexiconFilter) => filter.word),
    tap( word => this.currentLexicalEntry = word)
  )

  activeForm : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.form),
    tap( form => this.currentForm = form)
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

  treeLoading : boolean = true;

  lexiconTree : Observable<TreeNode[]> = this.lexiconService.lexicon$.pipe(
    map(lexicon => this.mapLexicalElement(lexicon)),
    tap(x => this.treeLoading = false)
  );

  
  
  getChildren : Observable<TreeNode[]> = this.loadNode$.pipe(
    filter(event => Object.keys(event.node).length > 0),
    switchMap(event => this.lexiconService.getForms(event.node.data.lexicalEntry).pipe(
      map(forms=> this.mapFormElement(forms)),
      map(formsNodes => event.node.children = formsNodes),
    )),
  )

  filterForm : FormGroup = new FormGroup({
    text: new FormControl(null),
    searchMode: new FormControl('contains'),
    type: new FormControl(null),
    pos: new FormControl(null),
    formType: new FormControl(null),
    author: new FormControl(null),
    lang: new FormControl(null),
    status: new FormControl(null),
    offset: new FormControl(0),
    limit: new FormControl(500)
  })

  searchModeOptions : Array<object> = [
    {label : 'Equals', value: 'equals'},
    {label : 'Starts', value: 'startsWith'},
    {label : 'Contains', value: 'contains'},
    {label : 'Ends', value: 'ends'},
  ]

  formTypeOptions : Array<object> = [
    {label : 'Entry', value: 'entry'},
    {label : 'Flexed', value: 'flexed'}
  ]

  activeState : boolean = false;
  
  typesList : Observable<StatisticsCounter[]> = this.lexiconService.types$;
  posList : Observable<StatisticsCounter[]> = this.lexiconService.pos$;
  authorsList : Observable<StatisticsCounter[]> = this.lexiconService.authors$;
  languagesList : Observable<StatisticsCounter[]> = this.lexiconService.languages$;
  statusList : Observable<StatisticsCounter[]> = this.lexiconService.status$;
  
  getLexicalEntryReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getFormReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getSensesReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getEtymologiesListReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getEtymologyDataReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getCognatesReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getFormsListReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getAttestationsReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');
  getAttestationsLexEntryReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');

  getBibliographyReq$ : BehaviorSubject<string> = new BehaviorSubject<string>('');

  formRequestComplete : boolean = false;

  currentLexicalEntry : string = '';
  currentForm : string = '';

  getLexicalEntry : Observable<LexicalElement> = this.getLexicalEntryReq$.pipe(
    delay(100),
    takeUntil(this.destroy$),
    tap(instanceName => {
      if(instanceName != ''){
        this.getSensesReq$.next(instanceName);
        this.getEtymologiesListReq$.next(instanceName);
        this.getCognatesReq$.next(instanceName);
        this.getFormsListReq$.next(instanceName);
        this.getBibliographyReq$.next(instanceName)
      }
    }),
    switchMap(instanceName => (instanceName != '' && instanceName == this.currentLexicalEntry) ? this.lexiconService.getLexicalEntryData(instanceName).pipe(catchError(err => this.thereWasAnError())) : of()),
    tap(lex => console.log(lex))
  ) 
  
  getLexicalEntryFromForm : Observable<LexicalElement> = this.getLexicalEntryReq$.pipe(
    delay(100),
    takeUntil(this.destroy$),
    switchMap(instanceName => (instanceName != '') ? this.lexiconService.getLexicalEntryData(instanceName).pipe(catchError(err => this.thereWasAnError())) : of()),
    tap(lex => console.log(lex))
  ) 

  getForm : Observable<FormElement> = this.getFormReq$.pipe(
    delay(100),
    takeUntil(this.destroy$),
    switchMap(instanceName => (instanceName != '' && instanceName == this.currentForm) ? this.lexiconService.getFormData(instanceName).pipe(catchError(err => this.thereWasAnError())) : of()),
    tap(form => {
      console.log(form)
    })
  )

  getSenses : Observable<SenseElement[]> = this.getSensesReq$.pipe(
    takeUntil(this.destroy$),
    switchMap(instanceName => instanceName != '' ? this.lexiconService.getSenses(instanceName).pipe(catchError(err => this.thereWasAnError())) : of([])),
  )


  getFormsList : Observable<FormElementTree[]> = this.getFormsListReq$.pipe(
    takeUntil(this.destroy$),
    switchMap(instanceName => (instanceName != '' && instanceName == this.currentLexicalEntry) ? this.lexiconService.getForms(instanceName) : of([])),
    switchMap(forms => forms.length> 0 ? this.textService.getAnnotationsByForms(forms) : of([])),
    tap(forms => console.log(forms))
  )

  
  getEtymologiesList : Observable<EtymologyTreeElement[]> = this.getEtymologiesListReq$.pipe(
    take(1),
    switchMap(instanceName => instanceName != ''  ? this.lexiconService.getEtymologiesList(instanceName).pipe(catchError(err => this.thereWasAnError())) : of()),
    tap(etymologies => {
      if(etymologies.length > 0){
        etymologies.forEach(etymology => this.getEtymologyDataReq$.next(etymology.etymology))
      }else{
        this.getEtymologyDataReq$.next('')
      }
    }),
  );

  getEtymologyData : Observable<EtymologyElement> = this.getEtymologyDataReq$.pipe(
    takeUntil(this.destroy$),
    switchMap(instanceName => instanceName != ''  ? this.lexiconService.getEtymologyData(instanceName).pipe(catchError(err => this.thereWasAnError())) : of()),
    tap(etymologyData => console.log(etymologyData))
  );


  getCognates : Observable<CognateElement[]> = this.getCognatesReq$.pipe(
    take(1),
    tap(x => this.noCognates = false),
    switchMap(instanceName => instanceName != ''  ? this.lexiconService.getCognates(instanceName).pipe(catchError(err => this.thereWasAnError(err, 'cognates'))) : of()),
    map(cognates => this.mapCognates(cognates)),
    tap(x=> console.log(x))
  )

  noCognates: boolean = false;

  getAttestations : Observable<any> | undefined = this.getAttestationsReq$.pipe(
    
    filter(instanceName => instanceName != ''),
    takeUntil(this.destroy$),
    switchMap(instanceName => this.textService.searchAttestations(instanceName)),
    
   /*  switchMap(nodeIds => {
      return this.textService.texts$.pipe(
        map(textsArray => {
          return textsArray.filter(text => nodeIds.includes(text['element-id']));
        })
      );
    }),
   
    map(res => res.map(el=> el.itAnt_ID)),
     */
  )

  getAttestationsLexEntry : Observable<any> | undefined = this.getAttestationsLexEntryReq$.pipe(
    
    filter(instanceName => instanceName != ''),
    takeUntil(this.destroy$),
    switchMap(instanceName => this.textService.searchAttestationsLexEntry(instanceName, 100, 0)),
    /* switchMap(nodeIds => {
      return this.textService.texts$.pipe(
        map(textsArray => {
          return textsArray.filter(text => nodeIds.includes(text['element-id']));
        })
      );
    }),
   
    map(res => res.map(el=> el.trismegistos.trismegistosID)), */
  )

  getBibliography : Observable<any> | undefined = this.getBibliographyReq$.pipe(
    filter(instanceName => instanceName != ''),
    switchMap(instanceName => this.lexiconService.getBibliographyByEntity(instanceName)),
    tap(results => console.log(results))
  )

  constructor(private route: Router,
              private activatedRoute: ActivatedRoute,
              private lexiconService: LexiconService,
              private textService : TextsService,
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
          if (keys.length > 1 && keys[0] == 'filter') {
            this.pagination({} as Paginator, keys[1], values[1])
          }
          if(keys[0] == 'word'){

            //è una lexical entry
            if(keys.length == 1){
              this.getLexicalEntryReq$.next(values[0])
              this.getAttestationsLexEntryReq$.next(values[0])
            }

            //è una form
            if(keys.length == 2){
              this.getLexicalEntryReq$.next(values[0])
              this.getFormReq$.next(values[1]);
              this.getAttestationsReq$.next(values[1])
            }

          }
        }
      }
    );

    this.filterForm.valueChanges.pipe(takeUntil(this.destroy$), debounceTime(500)).subscribe(

      (data : LexiconQueryFilter)=>{
        console.log(data);
        Object.entries(data).forEach(([key, value], index) => {
          const k = key as keyof LexiconQueryFilter;
          if(data[k as keyof LexiconQueryFilter] == null){
            data[k as keyof LexiconQueryFilter] = '' as never;
          }
        })
        this.treeLoading = true;
        this.lexiconTree = this.lexiconService.getLexicalEntryList(data).pipe(
          take(1),
          map(list => this.mapLexicalElement(list)),
          tap(x => this.treeLoading = false),
        )
      }
    )
  }


  nodeSelect(event:TreeEvent){
    console.log(event);

    let node : TreeNode = event.node;
    let lexicalInstanceName : string = '';
    let form : string = '';
    this.somethingWrong = false;
    if(node.data.lexicalEntry != undefined && node.data.form == undefined){
      lexicalInstanceName = node.data.lexicalEntry;
      this.route.navigate(['/lexicon'], { queryParams: { word: lexicalInstanceName } });
    }

    if(node.data.lexicalEntry != undefined && node.data.form != undefined){
      lexicalInstanceName = node.data.lexicalEntry;
      form = node.data.form;
      this.route.navigate(['/lexicon'], { queryParams: { word: lexicalInstanceName, form: form } });
    }

    
  }

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

  

  mapCognates(cognates : CognateElement[]) : CognateElement[] {

    return cognates.map((cog : CognateElement) => ({
      inferred : cog.inferred,
      label : cog.label,
      entity : cog.entity,
      entityType : cog.entityType,
      link : cog.link,
      linkType : cog.linkType,
    }))
  }

  mapCognatesLanguage(instanceName : string) : string{
    let array = instanceName.split('_');
    return array[array.length-2]
  }

  getAllData(f? : number, r? : number): void {
    let rows = 0;
    if(f && r){this.first = f; rows = r; }
    if(!f && !r){this.first = 0; this.rows = 6;}
    
   
    this.paginationItems = this.lexiconService.lexicon$.pipe(map(lexicon => lexicon.slice(this.first, rows == 0 ? this.rows : rows)));
    this.totalRecords = this.lexiconService.lexicon$.pipe(map(lexicon=>lexicon.length || 0))
  }

  filterByLetter(f?: number, r?: number, letter?: string): void {
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 6; }

    this.paginationItems = this.lexiconService.filterByLetter((letter)||'').pipe(tap(x=> this.somethingWrong=false),map(text=>text.slice(f, r)))
    this.totalRecords = this.lexiconService.filterByLetter((letter)||'').pipe(tap(x=> this.somethingWrong=false),map(texts=>texts.length || 0))
    
  }


  filterByLanguage(f?: number, r?: number, lang?: string): void {
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 6; }

    this.paginationItems = this.lexiconService.filterByLanguage((lang)||'').pipe(map(lexicon=>lexicon.slice(f, r)))
    this.totalRecords = this.lexiconService.filterByLanguage((lang)||'').pipe(map(lexicon=>lexicon.length || 0))
    
  }

  filterByPos(f?: number, r?: number, pos?: string): void {
    let rows = 0;
    if (f && r) { this.first = f; rows = r; }
    if (!f && !r) { this.first = 0; this.rows = 6; }

    this.paginationItems = this.lexiconService.filterByPos((pos)||'').pipe(map(lexicon=>lexicon.slice(f, r)))
    this.totalRecords = this.lexiconService.filterByPos((pos)||'').pipe(map(lexicon=>lexicon.length || 0))
    
  }

  goToDefaultUrl() {
    this.route.navigate(['/lexicon'], { queryParams: { filter: 'all', letter: '*' } });
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
        case 'letter': this.filterByLetter(this.first, rows, value); break;
        case 'language' : this.filterByLanguage(this.first, rows, value); break;
        case 'pos' : this.filterByPos(this.first, rows, value); break;
        // case 'type' : this.filterByType(value, this.first, rows); break;
      }
      return;
    }
  }


  thereWasAnError(err? : HttpResponseBase, source? : string){
    if(err?.status != 200){
      this.somethingWrong = true;
      return EMPTY;
    }
    
    if(source == 'cognates'){
      this.noCognates = true;
    }
    return of()
  }

  toggle() {
    this.activeState = !this.activeState;
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
