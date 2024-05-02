import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  delay,
  distinctUntilChanged,
  EMPTY,
  filter,
  iif,
  map,
  mergeMap,
  Observable,
  of,
  repeat,
  retry,
  startWith,
  Subject,
  switchMap,
  take,
  takeLast,
  takeUntil,
  takeWhile,
  tap,
  throttle,
  throwError,
  timeout,
} from 'rxjs';
import {
  CognateElement,
  ConceptElement,
  EtymologyElement,
  EtymologyTreeElement,
  FormElement,
  FormElementLabels,
  FormElementTree,
  LexicalElement,
  LexiconQueryFilter,
  LexiconService,
  SenseElement,
} from 'src/app/services/lexicon/lexicon.service';
import { TreeNode } from 'primeng/api';
import { FormControl, FormGroup } from '@angular/forms';
import { HttpResponseBase } from '@angular/common/http';
import { Annotation, TextsService } from 'src/app/services/text/text.service';

export interface TreeEvent {
  node: TreeNode;
  originalEvent: PointerEvent;
}
export interface LanguagesCounter {
  language: string;
  count: number;
}

export interface PosCounter {
  pos: string;
  count: number;
}
export interface AlphaCounter {
  letter: string;
  count: number;
}

export interface AuthorCounter {
  name: string;
  count: number;
}

export interface DateCounter {
  date: string;
  count: number;
}

export interface LexiconFilter {
  name: string;
  year: string;
  filter: string;
  letter: string;
  word: string;
  form: string;
  language: string;
  pos: string;
  book: string;
}

export interface StatisticsCounter {
  label: string;
  count: number;
}

@Component({
  selector: 'app-lexicon',
  templateUrl: './lexicon.component.html',
  styleUrls: ['./lexicon.component.scss'],
})
export class LexiconComponent implements OnInit {
  //RXJS
  destroy$: Subject<boolean> = new Subject<boolean>();
  loadNode$: BehaviorSubject<TreeEvent> = new BehaviorSubject<TreeEvent>({
    node: {},
    originalEvent: new PointerEvent(''),
  });

  loadSkosNode$: BehaviorSubject<TreeEvent> = new BehaviorSubject<TreeEvent>({
    node: {},
    originalEvent: new PointerEvent(''),
  });

  selectedFile: TreeNode[] = [];

  allowedFilters: string[] = [
    'all',
    'language',
    'pos',
  ]; /*  'sense', 'concept' */
  allowedOperators: string[] = [
    'filter',
    'letter',
    'word',
    'form',
    'language',
    'pos',
    'senseType',
    'conceptType',
  ];

  first: number = 0;
  rows: number = 6;
  somethingWrong: boolean = false;

  // Definizione degli Observable per ottenere i parametri attivi dalla query URL
  // e mapparli alle proprietà pertinenti

  activeTab: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.filter)
  );

  activeLetter: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.letter)
  );

  activeWord: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.word),
    tap((word) => (this.currentLexicalEntry = word))
  );

  activeForm: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.form),
    tap((form) => (this.currentForm = form))
  );

  activeLanguage: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.language)
  );

  activePos: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.pos)
  );

  // Observable per determinare se la query URL indica una lettera o una parola attiva
  wordOrLetter: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => {
      if (filter.letter) return 'letter';
      if (filter.word) return 'word';
      return '';
    })
  );

  // Gruppi di conteggio alfabetici, di parte del discorso e di lingue
  groupAlphabet: Observable<AlphaCounter[]> = this.lexiconService.lexicon$.pipe(
    timeout(15000),
    catchError((err) => iif(() => err, this.thereWasAnError(), of([]))),
    takeUntil(this.destroy$),
    map((lexicon) => groupAlphabet(lexicon))
  );

  groupPos: Observable<PosCounter[]> = this.lexiconService.lexicon$.pipe(
    timeout(15000),
    catchError((err) => iif(() => err, this.thereWasAnError(), of([]))),
    takeUntil(this.destroy$),
    map((lexicon) => groupByPos(lexicon))
  );

  groupLanguages: Observable<LanguagesCounter[]> =
    this.lexiconService.lexicon$.pipe(
      takeUntil(this.destroy$),
      map((lexicon) => groupByLanguages(lexicon))
    );

  // Numero totale di record nella lista lessicale
  totalRecords: Observable<number> = this.lexiconService.lexicon$.pipe(
    timeout(15000),
    catchError((err) => iif(() => err, this.thereWasAnError(), of([]))),
    takeUntil(this.destroy$),
    map((lexicon) => lexicon.length || 0)
  );

  // Elementi per la paginazione della lista lessicale
  paginationItems: Observable<LexicalElement[]> =
    this.lexiconService.lexicon$.pipe(
      timeout(15000),
      catchError((err) => iif(() => err, this.thereWasAnError(), of([]))),
      takeUntil(this.destroy$),
      map((lexicon) => lexicon.slice(this.first, this.rows))
    );

  // Caricamento dell'albero lessicale
  treeLoading: boolean = true;

  lexiconTree: Observable<TreeNode[]> = this.lexiconService.lexicon$.pipe(
    map((lexicon) => this.mapLexicalElement(lexicon)),
    tap((x) => (this.treeLoading = false))
  );

  skosTree: Observable<TreeNode[]> = this.lexiconService.concepts$.pipe(
    map((concepts) => this.mapSkosElement(concepts)),
    tap((x) => (this.treeLoading = false))
  );

  // Ottieni i figli di un nodo dell'albero lessicale
  getChildren: Observable<TreeNode[]> = this.loadNode$.pipe(
    filter((event) => Object.keys(event.node).length > 0),
    switchMap((event) =>
      this.lexiconService.getForms(event.node.data.lexicalEntry).pipe(
        map((forms) => this.mapFormElement(forms)),
        map((formsNodes) => (event.node.children = formsNodes))
      )
    )
  );

  getSkosChildren: Observable<TreeNode[]> = this.loadSkosNode$.pipe(
    filter((event) => Object.keys(event.node).length > 0),
    switchMap((event) =>
      this.lexiconService.getNarrowers(event.node.data.lexicalConcept).pipe(
        map((forms) => this.mapSkosElement(forms)),
        map((formsNodes) => (event.node.children = formsNodes))
      )
    )
  )

  // Form per il filtraggio della lista lessicale
  filterForm: FormGroup = new FormGroup({
    text: new FormControl(null),
    searchMode: new FormControl('contains'),
    type: new FormControl('word'),
    pos: new FormControl(null),
    formType: new FormControl(null),
    author: new FormControl(null),
    lang: new FormControl(null),
    status: new FormControl(null),
    offset: new FormControl(0),
    limit: new FormControl(500),
  });

  skosForm: FormGroup = new FormGroup({
    text : new FormControl(null)
  })

  // Opzioni di modalità di ricerca
  searchModeOptions: Array<object> = [
    { label: 'Equal', value: 'equals' },
    { label: 'Starts with', value: 'startsWith' },
    { label: 'Contains', value: 'contains' },
    { label: 'End with', value: 'endsWith' },
  ];

  // Opzioni di tipo di modulo
  formTypeOptions: Array<object> = [
    { label: 'Voce', value: 'voce' },
    { label: 'Flessa', value: 'flessa' },
  ];

  // Stato attivo
  activeState: boolean = false;

  // Liste osservabili
  typesList: Observable<StatisticsCounter[]> = this.lexiconService.types$;
  posList: Observable<StatisticsCounter[]> = this.lexiconService.pos$;
  authorsList: Observable<StatisticsCounter[]> = this.lexiconService.authors$;
  languagesList: Observable<StatisticsCounter[]> =
    this.lexiconService.languages$;
  statusList: Observable<StatisticsCounter[]> = this.lexiconService.status$;

  // Richieste BehaviorSubject
  getLexicalEntryReq$: BehaviorSubject<string> = new BehaviorSubject<string>(
    ''
  );
  getFormReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getSensesReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getEtymologiesListReq$: BehaviorSubject<string> = new BehaviorSubject<string>(
    ''
  );
  getEtymologyDataReq$: BehaviorSubject<string> = new BehaviorSubject<string>(
    ''
  );
  getCognatesReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getFormsListReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getAttestationsReq$: BehaviorSubject<string> = new BehaviorSubject<string>(
    ''
  );
  getAttestationsLexEntryReq$: BehaviorSubject<string> =
    new BehaviorSubject<string>('');
  getBibliographyReq$: BehaviorSubject<string> = new BehaviorSubject<string>(
    ''
  );

  // Richiesta del modulo completata
  formRequestComplete: boolean = false;

  // Voce lessicale e modulo correnti
  currentLexicalEntry: string = '';
  currentForm: string = '';

  // Osservabile per ottenere una voce lessicale
  getLexicalEntry: Observable<LexicalElement> = this.getLexicalEntryReq$.pipe(
    delay(100),
    takeUntil(this.destroy$),
    tap((instanceName) => {
      if (instanceName != '') {
        this.getSensesReq$.next(instanceName);
        this.getEtymologiesListReq$.next(instanceName);
        this.getCognatesReq$.next(instanceName);
        this.getFormsListReq$.next(instanceName);
        this.getBibliographyReq$.next(instanceName);
      }
    }),
    switchMap((instanceName) =>
      instanceName != '' && instanceName == this.currentLexicalEntry
        ? this.lexiconService
            .getLexicalEntryData(instanceName)
            .pipe(catchError((err) => this.thereWasAnError()))
        : of()
    ),
    tap((lex) => console.log(lex))
  );

  // Osservabile per ottenere una voce lessicale da un modulo
  getLexicalEntryFromForm: Observable<LexicalElement> =
    this.getLexicalEntryReq$.pipe(
      delay(100),
      takeUntil(this.destroy$),
      switchMap((instanceName) =>
        instanceName != ''
          ? this.lexiconService
              .getLexicalEntryData(instanceName)
              .pipe(catchError((err) => this.thereWasAnError()))
          : of()
      ),
      tap((lex) => console.log(lex))
    );

  // Osservabile per ottenere un modulo
  getForm: Observable<FormElement> = this.getFormReq$.pipe(
    delay(100),
    takeUntil(this.destroy$),
    switchMap((instanceName) =>
      instanceName != '' && instanceName == this.currentForm
        ? this.lexiconService
            .getFormData(instanceName)
            .pipe(catchError((err) => this.thereWasAnError()))
        : of()
    ),
    tap((form) => {
      console.log(form);
    })
  );

  // Osservabile per ottenere i sensi
  getSenses: Observable<SenseElement[]> = this.getSensesReq$.pipe(
    takeUntil(this.destroy$),
    switchMap((instanceName) =>
      instanceName != ''
        ? this.lexiconService
            .getSenses(instanceName)
            .pipe(catchError((err) => this.thereWasAnError()))
        : of([])
    )
  );

  // Osservabile per ottenere l'elenco dei moduli
  getFormsList: Observable<FormElementTree[]> = this.getFormsListReq$.pipe(
    takeUntil(this.destroy$),
    switchMap((instanceName) =>
      instanceName != '' && instanceName == this.currentLexicalEntry
        ? this.lexiconService.getForms(instanceName)
        : of([])
    ),
    switchMap((forms) =>
      forms.length > 0 ? this.textService.getAnnotationsByForms(forms) : of([])
    ),
    tap((forms) => console.log(forms))
  );

  // Osservabile per ottenere l'elenco delle etimologie
  getEtymologiesList: Observable<EtymologyTreeElement[]> =
    this.getEtymologiesListReq$.pipe(
      take(1),
      switchMap((instanceName) =>
        instanceName != ''
          ? this.lexiconService
              .getEtymologiesList(instanceName)
              .pipe(catchError((err) => this.thereWasAnError()))
          : of()
      ),
      tap((etymologies) => {
        if (etymologies.length > 0) {
          etymologies.forEach((etymology) =>
            this.getEtymologyDataReq$.next(etymology.etymology)
          );
        } else {
          this.getEtymologyDataReq$.next('');
        }
      })
    );

  // Osservabile per ottenere i dati dell'etimologia
  getEtymologyData: Observable<EtymologyElement> =
    this.getEtymologyDataReq$.pipe(
      takeUntil(this.destroy$),
      switchMap((instanceName) =>
        instanceName != ''
          ? this.lexiconService
              .getEtymologyData(instanceName)
              .pipe(catchError((err) => this.thereWasAnError()))
          : of()
      ),
      tap((etymologyData) => console.log(etymologyData))
    );

  // Osservabile per ottenere i cognati
  getCognates: Observable<CognateElement[]> = this.getCognatesReq$.pipe(
    take(1),
    tap((x) => (this.noCognates = false)),
    switchMap((instanceName) =>
      instanceName != ''
        ? this.lexiconService
            .getCognates(instanceName)
            .pipe(catchError((err) => this.thereWasAnError(err, 'cognates')))
        : of()
    ),
    map((cognates) => this.mapCognates(cognates)),
    tap((x) => console.log(x))
  );

  // Flag per indicare l'assenza di cognati
  noCognates: boolean = false;

  // Osservabile per ottenere le attestazioni
  getAttestations: Observable<any> | undefined = this.getAttestationsReq$.pipe(
    filter((instanceName) => instanceName != ''),
    takeUntil(this.destroy$),
    switchMap((instanceName) =>
      this.textService.searchAttestations(instanceName)
    )
  );

  // Osservabile per ottenere le attestazioni per una voce lessicale
  getAttestationsLexEntry: Observable<any> | undefined =
    this.getAttestationsLexEntryReq$.pipe(
      filter((instanceName) => instanceName != ''),
      takeUntil(this.destroy$),
      switchMap((instanceName) =>
        this.textService.searchAttestationsLexEntry(instanceName, 100, 0)
      )
    );

  // Dichiarazione di una variabile di tipo Observable<any> | undefined per contenere la richiesta di bibliografia.
  // Inizialmente non è definita.
  getBibliography: Observable<any> | undefined = this.getBibliographyReq$.pipe(
    // Filtra il flusso di richieste per assicurarsi che il nome dell'istanza non sia vuoto.
    filter((instanceName) => instanceName != ''),

    // Effettua il passaggio a un nuovo flusso che richiede la bibliografia per l'entità specificata.
    switchMap((instanceName) =>
      this.lexiconService.getBibliographyByEntity(instanceName)
    ),

    // Emette i risultati ottenuti dalla richiesta e li stampa sulla console.
    tap((results) => console.log(results))
  );

  treeViewOpt : any[] = [{name : 'lexicalEntry'}, {name: 'lexicalConcept'}];
  treeViewSelected: any = {name: 'lexicalEntry'}

  tabViewIndex : number = 1;

  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private lexiconService: LexiconService,
    private textService: TextsService
  ) {}

  ngOnInit(): void {
    // Sottoscrizione ai parametri della query quando la route è attiva
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event) {
          // Estraiamo le chiavi e i valori degli eventi
          const keys = Object.keys(event);
          const values = Object.values(event);

          // Se non ci sono parametri o se c'è solo un parametro 'filter' con valore 'all', reindirizziamo all'URL predefinito
          if (
            keys.length == 0 ||
            (keys.length == 1 && keys[0] == 'filter' && values[0] == 'all')
          ) {
            this.goToDefaultUrl();
            return;
          }

          // Se ci sono parametri
          if (keys) {
            // Verifichiamo se i parametri sono supportati e validi
            for (const [key, value] of Object.entries(event)) {
              if (
                !this.allowedOperators.includes(key) ||
                event[key] == '' ||
                (Array.isArray(event[key]) && Array.from(event[key]).length > 1)
              ) {
                this.goToDefaultUrl();
                return;
              }
            }
          }

          // Se ci sono più parametri e il primo è 'filter', paginiamo i risultati
          if (keys.length > 1 && keys[0] == 'filter') {
            this.pagination({} as Paginator, keys[1], values[1]);
          }

          // Se il primo parametro è 'word'
          if (keys[0] == 'word') {
            // Se è un'entry lessicale
            if (keys.length == 1) {
              this.getLexicalEntryReq$.next(values[0]);
              this.getAttestationsLexEntryReq$.next(values[0]);
            }
            // Se è una forma
            if (keys.length == 2) {
              this.getLexicalEntryReq$.next(values[0]);
              this.getFormReq$.next(values[1]);
              this.getAttestationsReq$.next(values[1]);
            }
          }
        }
      });

    // Sottoscrizione ai cambiamenti del valore del filtro
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(500))
      .subscribe((data: LexiconQueryFilter) => {
        console.log(data);
        // Verifichiamo se i valori sono nulli e li impostiamo a stringa vuota
        Object.entries(data).forEach(([key, value], index) => {
          const k = key as keyof LexiconQueryFilter;
          if (data[k as keyof LexiconQueryFilter] == null) {
            data[k as keyof LexiconQueryFilter] = '' as never;
          }
        });
        // Attiviamo il caricamento dell'albero lessicale
        this.treeLoading = true;
        this.lexiconTree = this.lexiconService.getLexicalEntryList(data).pipe(
          take(1),
          map((list) => this.mapLexicalElement(list)),
          tap((x) => (this.treeLoading = false))
        );
      });
  }



  // Funzione che gestisce la selezione di un nodo nell'albero
  nodeSelect(event: TreeEvent) {

    let node: TreeNode = event.node; // Otteniamo il nodo selezionato dall'evento
    let lexicalInstanceName: string = ''; // Nome dell'istanza lessicale
    let form: string = ''; // Forma
    this.somethingWrong = false; // Flag per segnalare eventuali errori

    // Se il nodo ha un'entrata lessicale ma non ha una forma specificata
    if (node.data.lexicalEntry !== undefined && node.data.form === undefined) {
      lexicalInstanceName = node.data.lexicalEntry; // Otteniamo il nome dell'istanza lessicale dal nodo
      // Naviga verso la pagina del lessico, passando il nome dell'istanza come parametro nella query string
      this.route.navigate(['/lexicon'], {
        queryParams: { word: lexicalInstanceName },
      });
    }

    // Se il nodo ha un'entrata lessicale e ha anche una forma specificata
    if (node.data.lexicalEntry !== undefined && node.data.form !== undefined) {
      lexicalInstanceName = node.data.lexicalEntry; // Otteniamo il nome dell'istanza lessicale dal nodo
      form = node.data.form; // Otteniamo la forma dal nodo
      // Naviga verso la pagina del lessico, passando il nome dell'istanza e la forma come parametri nella query string
      this.route.navigate(['/lexicon'], {
        queryParams: { word: lexicalInstanceName, form: form },
      });
    }

    if(node.data.lexicalConcept !== undefined){
      lexicalInstanceName = node.data.lexicalConcept;
      
      this.route.navigate(['/lexicon'], {
        queryParams: { filter: 'concept'}
      })
    }
  }

  // Funzione per mappare gli elementi lessicali in nodi dell'albero
  mapLexicalElement(lexicon: LexicalElement[]): TreeNode[] {
    return lexicon.map((lexEl: LexicalElement) => ({
      label: lexEl.label, // Etichetta del nodo
      data: lexEl, // Dati associati al nodo
      children: [], // Lista dei figli del nodo (vuota perché non è ancora stata popolata)
      leaf: !lexEl.hasChildren, // Indica se il nodo è una foglia (non ha figli)
      draggable: false, // Indica se il nodo può essere trascinato
      droppable: false, // Indica se il nodo può essere usato come destinazione per il trascinamento di altri nodi
    }));
  }

  mapSkosElement(concept : ConceptElement[]) : TreeNode[] {
    return concept.map((lexEl: ConceptElement) => ({
      label: lexEl.defaultLabel, // Etichetta del nodo
      data: lexEl, // Dati associati al nodo
      children: [], // Lista dei figli del nodo (vuota perché non è ancora stata popolata)
      leaf: lexEl.children == 0, // Indica se il nodo è una foglia (non ha figli)
      draggable: false, // Indica se il nodo può essere trascinato
      droppable: false, // Indica se il nodo può essere usato come destinazione per il trascinamento di altri nodi
    }));
  }

  // Funzione per mappare gli elementi di forma in nodi dell'albero
  mapFormElement(lexicon: FormElementTree[]): TreeNode[] {
    if (lexicon.length === 0) {
      // Se non ci sono elementi nell'array
      return [
        {
          // Restituiamo un nodo che indica l'assenza di figli
          label: 'Nessun figlio', // Etichetta del nodo
          data: null, // Dati associati al nodo (null perché non ci sono dati)
          leaf: true, // Il nodo è una foglia
          draggable: false, // Il nodo non è trascinabile
          droppable: false, // Il nodo non può essere usato come destinazione per il trascinamento
          selectable: false, // Il nodo non è selezionabile
        },
      ];
    }
    return lexicon.map((lexEl: FormElementTree) => ({
      label: lexEl.label, // Etichetta del nodo
      data: lexEl, // Dati associati al nodo
      leaf: true, // Il nodo è una foglia
      draggable: false, // Il nodo non è trascinabile
      droppable: false, // Il nodo non può essere usato come destinazione per il trascinamento
    }));
  }

  // Funzione per mappare i cognati
  mapCognates(cognates: CognateElement[]): CognateElement[] {
    return cognates.map((cog: CognateElement) => ({
      inferred: cog.inferred, // Flag che indica se il cognato è stato inferito
      label: cog.label, // Etichetta del cognato
      entity: cog.entity, // Entità del cognato
      entityType: cog.entityType, // Tipo di entità del cognato
      link: cog.link, // Link associato al cognato
      linkType: cog.linkType, // Tipo di link associato al cognato
    }));
  }

  // Funzione per estrarre la lingua dai nomi delle istanze
  mapCognatesLanguage(instanceName: string): string {
    let array = instanceName.split('_'); // Suddivide il nome dell'istanza utilizzando il carattere '_'
    return array[array.length - 2]; // Restituisce il penultimo elemento dell'array, che dovrebbe essere il nome della lingua
  }

  // Funzione per ottenere tutti i dati (usata per la paginazione)
  getAllData(f?: number, r?: number): void {
    let rows = 0; // Numero di righe
    if (f && r) {
      // Se i parametri first e rows sono definiti
      this.first = f; // Imposta il valore di first
      rows = r; // Imposta il valore di rows
    }
    if (!f && !r) {
      // Se first e rows non sono definiti
      this.first = 0; // Imposta first a 0
      this.rows = 6; // Imposta rows a 6
    }

    // Ottiene i dati del lessico in base alla paginazione
    this.paginationItems = this.lexiconService.lexicon$.pipe(
      map((lexicon) => lexicon.slice(this.first, rows == 0 ? this.rows : rows))
    );
    // Ottiene il numero totale di record nel lessico
    this.totalRecords = this.lexiconService.lexicon$.pipe(
      map((lexicon) => lexicon.length || 0)
    );
  }

  // Funzione per filtrare i dati per lettera (usata per la paginazione)
  filterByLetter(f?: number, r?: number, letter?: string): void {
    let rows = 0; // Numero di righe
    if (f && r) {
      // Se i parametri first e rows sono definiti
      this.first = f; // Imposta il valore di first
      rows = r; // Imposta il valore di rows
    }
    if (!f && !r) {
      // Se first e rows non sono definiti
      this.first = 0; // Imposta first a 0
      this.rows = 6; // Imposta rows a 6
    }

    // Filtra i dati del lessico per lettera
    this.paginationItems = this.lexiconService
      .filterByLetter(letter || '')
      .pipe(
        tap((x) => (this.somethingWrong = false)),
        map((text) => text.slice(f, r))
      );
    // Ottiene il numero totale di record nel lessico dopo il filtro per lettera
    this.totalRecords = this.lexiconService.filterByLetter(letter || '').pipe(
      tap((x) => (this.somethingWrong = false)),
      map((texts) => texts.length)
    );
  }

  // Funzione per filtrare gli elementi per lingua
  filterByLanguage(f?: number, r?: number, lang?: string): void {
    let rows = 0; // Inizializza il conteggio delle righe
    if (f && r) {
      this.first = f;
      rows = r;
    } // Imposta il primo elemento e il numero di righe se entrambi sono definiti
    if (!f && !r) {
      this.first = 0;
      this.rows = 6;
    } // Se non sono definiti, reimposta il primo elemento a 0 e il numero di righe a 6

    // Effettua la chiamata al servizio per filtrare gli elementi per lingua e li ritorna paginati
    this.paginationItems = this.lexiconService
      .filterByLanguage(lang || '')
      .pipe(map((lexicon) => lexicon.slice(f, r)));
    // Imposta il numero totale di record ottenuti dalla chiamata al servizio per filtrare gli elementi per lingua
    this.totalRecords = this.lexiconService
      .filterByLanguage(lang || '')
      .pipe(map((lexicon) => lexicon.length || 0));
  }

  // Funzione per filtrare gli elementi per parte del discorso
  filterByPos(f?: number, r?: number, pos?: string): void {
    let rows = 0; // Inizializza il conteggio delle righe
    if (f && r) {
      this.first = f;
      rows = r;
    } // Imposta il primo elemento e il numero di righe se entrambi sono definiti
    if (!f && !r) {
      this.first = 0;
      this.rows = 6;
    } // Se non sono definiti, reimposta il primo elemento a 0 e il numero di righe a 6

    // Effettua la chiamata al servizio per filtrare gli elementi per parte del discorso e li ritorna paginati
    this.paginationItems = this.lexiconService
      .filterByPos(pos || '')
      .pipe(map((lexicon) => lexicon.slice(f, r)));
    // Imposta il numero totale di record ottenuti dalla chiamata al servizio per filtrare gli elementi per parte del discorso
    this.totalRecords = this.lexiconService
      .filterByPos(pos || '')
      .pipe(map((lexicon) => lexicon.length || 0));
  }

  // Naviga all'URL predefinito
  goToDefaultUrl() {
    this.route.navigate(['/lexicon'], {
      queryParams: { filter: 'all', letter: 'a' },
    });
  }

  // Gestisce la paginazione
  pagination(event: Paginator, ...args: any[]) {
    if (Object.keys(event).length != 0) {
      this.first = event.first;
      this.rows = event.rows;
    } // Imposta il primo elemento e il numero di righe se l'evento non è vuoto
    if (Object.keys(event).length == 0) {
      this.first = 0;
      this.rows = 6;
    } // Se l'evento è vuoto, reimposta il primo elemento a 0 e il numero di righe a 6

    let rows =
      this.first != this.rows && this.first < this.rows
        ? this.rows
        : this.first + this.rows; // Calcola il numero di righe
    if (args.length > 0) {
      args = args.filter((query) => query != null);
    } // Filtra gli argomenti non nulli
    if (args.length == 1) {
      this.getAllData(this.first, rows); // Ottiene tutti i dati
      return;
    }
    if (args.length > 1) {
      let filter = args[0]; // Ottiene il tipo di filtro
      let value = !isNaN(parseInt(args[1])) ? parseInt(args[1]) : args[1]; // Ottiene il valore del filtro

      switch (filter) {
        case 'letter':
          this.filterByLetter(this.first, rows, value);
          break; // Filtra per lettera
        case 'language':
          this.filterByLanguage(this.first, rows, value);
          break; // Filtra per lingua
        case 'pos':
          this.filterByPos(this.first, rows, value);
          break; // Filtra per parte del discorso
      }
      return;
    }
  }

  // Gestisce eventuali errori
  thereWasAnError(err?: HttpResponseBase, source?: string) {
    if (err?.status != 200) {
      // Se lo stato non è 200
      this.somethingWrong = true; // Segnala un problema
      return EMPTY; // Restituisce un observable vuoto
    }

    if (source == 'cognates') {
      // Se la sorgente è 'cognates'
      this.noCognates = true; // Segnala la mancanza di parole affini
    }
    return of(); // Restituisce un observable
  }

  // Cambia lo stato attivo
  toggle() {
    this.activeState = !this.activeState;
  }
}

/**
 * Questa funzione raggruppa gli elementi lessicali in base alla prima lettera del loro etichetta e conta quanti elementi appartengono a ciascun gruppo.
 * @param lexicalElements Un array di elementi lessicali da raggruppare.
 * @returns Un array di oggetti AlphaCounter contenenti la lettera e il conteggio degli elementi corrispondenti.
 */
function groupAlphabet(lexicalElements: LexicalElement[]): AlphaCounter[] {
  let tmp: AlphaCounter[] = [];
  let count: number = 0;

  lexicalElements.forEach((lexEl) => {
    count = lexicalElements.reduce(
      (acc, cur) =>
        cur.label[0].toLowerCase() == lexEl.label[0].toLowerCase()
          ? ++acc
          : acc,
      0
    );
    if (count > 0) {
      tmp.push({ letter: lexEl.label[0].toLowerCase(), count: count });
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

/**
 * Questa funzione raggruppa gli elementi lessicali in base alla lingua e conta quanti elementi appartengono a ciascun gruppo.
 * @param lexicon Un array di elementi lessicali da raggruppare per lingua.
 * @returns Un array di oggetti LanguagesCounter contenenti la lingua e il conteggio degli elementi corrispondenti.
 */
function groupByLanguages(lexicon: LexicalElement[]): LanguagesCounter[] {
  let tmp: LanguagesCounter[] = [];
  let count: number = 0;

  lexicon.forEach((lexicalElement) => {
    count = lexicon.reduce(
      (acc, cur) => (cur.language == lexicalElement.language ? ++acc : acc),
      0
    );
    if (count > 0) {
      tmp.push({ language: lexicalElement.language, count: count });
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({ ...acc, [object.language]: object }), {})
  );

  return tmp;
}

/**
 * Questa funzione raggruppa gli elementi lessicali in base alla parte del discorso e conta quanti elementi appartengono a ciascun gruppo.
 * @param lexicon Un array di elementi lessicali da raggruppare per parte del discorso.
 * @returns Un array di oggetti PosCounter contenenti la parte del discorso e il conteggio degli elementi corrispondenti.
 */
function groupByPos(lexicon: LexicalElement[]): PosCounter[] {
  let tmp: PosCounter[] = [];
  let count: number = 0;

  lexicon.forEach((lexicalElement) => {
    count = lexicon.reduce(
      (acc, cur) => (cur.pos == lexicalElement.pos ? ++acc : acc),
      0
    );
    if (count > 0) {
      tmp.push({ pos: lexicalElement.pos, count: count });
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({ ...acc, [object.pos]: object }), {})
  );

  return tmp;
}
