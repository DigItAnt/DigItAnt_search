import { HttpResponseBase } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { TreeNode } from 'primeng/api';
import { Paginator } from 'primeng/paginator';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  delay,
  EMPTY,
  filter,
  forkJoin,
  iif,
  map,
  Observable,
  of,
  Subject,
  Subscription,
  switchMap,
  take,
  takeUntil,
  tap,
  timeout,
  withLatestFrom,
} from 'rxjs';
import {
  BibliographyService,
  Book,
} from 'src/app/services/bibliography/bibliography.service';
import {
  FormElementTree,
  LexicalElement,
  LexiconService,
} from 'src/app/services/lexicon/lexicon.service';
import { TextsService } from 'src/app/services/text/text.service';
import {
  AlphaCounter,
  AuthorCounter,
  DateCounter,
  LexiconFilter,
  TreeEvent,
} from '../lexicon/lexicon.component';
import {
  AutoCompleteEvent,
  LocationsCounter,
  PaginatorEvent,
} from '../texts/texts.component';

@Component({
  selector: 'app-bibliography',
  templateUrl: './bibliography.component.html',
  styleUrls: ['./bibliography.component.scss'],
})
export class BibliographyComponent implements OnInit {
  destroy$: Subject<boolean> = new Subject<boolean>();
  autocomplete$: BehaviorSubject<AutoCompleteEvent> =
    new BehaviorSubject<AutoCompleteEvent>({ originalEvent: {}, query: '' });
  first: number = 0;
  rows: number = 8;

  startIndex: number = 0;

  somethingWrong: boolean = false;
  treeLoading: boolean = true;
  currentBook: string = '';

  isActiveSearchForm: boolean = false;

  allowedOperators: string[] = [
    'filter',
    'author',
    'name',
    'letter',
    'year',
    'book',
  ];
  allowedFilters: string[] = [
    'all',
  ]; /* 'argument' */ /* , 'author', 'title', 'date' */

  alphabet: string[] = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ];

  lexiconTree: Observable<TreeNode[]> = this.lexiconService.lexicon$.pipe(
    map((lexicon) => this.mapLexicalElement(lexicon)),
    tap((x) => (this.treeLoading = false))
  );

  selectedFile: any = undefined;
  minDate: Date = new Date();
  maxDate: Date = new Date();
  showSpinner: boolean = false;

  // Questa funzione mappa gli elementi lessicali in nodi dell'albero
  mapLexicalElement(lexicon: LexicalElement[]): TreeNode[] {
    return lexicon.map((lexEl: LexicalElement) => ({
      label: lexEl.label,
      data: lexEl,
      children: [],
      // Un nodo foglia se non ha figli
      leaf: !lexEl.hasChildren,
      draggable: false,
      droppable: false,
    }));
  }

  // Resetta le scelte lessicali
  resetLexicalChoices() {
    this.selectedFile = undefined;
  }

  // Imposta il nome dell'istanza lessicale
  setLexicalInstanceName() {
    console.log(this.selectedFile);

    let nodeData = this.selectedFile.data;

    // Sceglie il nome dell'istanza in base alla struttura dei dati
    let instanceName =
      nodeData.lexicalEntry && nodeData.form
        ? nodeData.form
        : nodeData.lexicalEntry;
    this.bibliographySearchForm
      .get('lexicalInstanceName')
      ?.setValue(instanceName);
  }

  // Observable per caricare i figli di un nodo
  loadNode$: BehaviorSubject<TreeEvent> = new BehaviorSubject<TreeEvent>({
    node: {},
    originalEvent: new PointerEvent(''),
  });
  getChildren: Observable<TreeNode[]> = this.loadNode$.pipe(
    // Filtra solo eventi con nodi validi
    filter((event) => Object.keys(event.node).length > 0),
    switchMap((event) =>
      this.lexiconService.getForms(event.node.data.lexicalEntry).pipe(
        // Mappa gli elementi delle forme nei nodi dell'albero
        map((forms) => this.mapFormElement(forms)),
        map((formsNodes) => (event.node.children = formsNodes))
      )
    )
  );

  // Mappa gli elementi delle forme nei nodi dell'albero
  mapFormElement(lexicon: FormElementTree[]): TreeNode[] {
    if (lexicon.length == 0) {
      return [
        {
          label: 'No children',
          data: null,
          leaf: true,
          draggable: false,
          droppable: false,
          selectable: false,
        },
      ];
    }
    return lexicon.map((lexEl: FormElementTree) => ({
      label: lexEl.label,
      data: lexEl,
      leaf: true,
      draggable: false,
      droppable: false,
    }));
  }

  // Observable per la scheda attiva
  activeTab: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    // Filtra solo i parametri validi
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.filter),
    tap((x) => {
      // Imposta isActiveSearchForm in base alla scheda attiva
      if (x == 'search') {
        this.isActiveSearchForm = true;
      } else {
        this.isActiveSearchForm = false;
      }
    })
  );

  // Observable per la lettera attiva
  activeLetter: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    // Filtra solo i parametri validi
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.letter)
  );

  // Questo Observable si occupa di recuperare il libro attivo basato sui parametri della query.
  // Viene utilizzato principalmente per ottenere i dettagli del libro attivo.
  activeBook: Observable<any> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$), // Assicura la distruzione dell'observable quando il componente viene distrutto
    filter((params) => Object.keys(params).length != 0), // Filtra solo i parametri non vuoti
    map((queryParams: Params) => queryParams as LexiconFilter), // Mappa i parametri della query a un oggetto di tipo LexiconFilter
    map((filter: LexiconFilter) => filter.book), // Estrae il valore del parametro "book"
    tap((book) => (book ? (this.currentBook = book) : null)), // Se è presente un libro, lo assegna alla variabile currentBook
    /*   switchMap( bookKey => this.bibliographyService.getBookDetails(bookKey)),
     */ switchMap(
      (bookKey) =>
        bookKey !== undefined
          ? this.bibliographyService.getBookDetails(bookKey)
          : of(null) // Restituisce null se bookKey è undefined o null
    ),
    tap((res) => console.log(res)) // Effettua il log della risposta
  );

  // Observable per recuperare l'autore attivo basato sui parametri della query.
  activeAuthor: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.name)
  );

  // Observable per recuperare la data attiva basata sui parametri della query.
  activeDate: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter((params) => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.year)
  );

  // Observable per determinare se l'elemento attivo è un libro o una lettera.
  bookOrLetter: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => {
      if (filter.letter) return 'letter';
      if (filter.book) return 'book';
      return '';
    })
  );

  // Observable per ottenere le attestazioni basate sul libro attivo.
  getAttestations: Observable<any[]> = this.activeBook.pipe(
    filter((book) => book != undefined && book.key != ''), // Filtra solo i libri validi con una chiave non vuota
    takeUntil(this.destroy$),
    switchMap((book) =>
      this.bibliographyService.getAttestationsByBookKey(book.key)
    ), // Ottiene le attestazioni dal servizio
    tap((x) => console.log(x)) // Effettua il log delle attestazioni
  );

  // Observable per ottenere le voci lessicali basate sulle attestazioni ottenute.
  getLexicalEntries: Observable<any> = this.getAttestations.pipe(
    filter(
      (anno) => anno != undefined && Array.isArray(anno) && anno.length > 0
    ), // Filtra le attestazioni valide
    takeUntil(this.destroy$),
    switchMap((anno) => this.bibliographyService.getAnnotations(anno)), // Ottiene le annotazioni basate sulle attestazioni
    map((entries) =>
      entries.filter((entry: any) => {
        const biblio = entry.attributes.bibliography;
        // Controlla se biblio è un array
        if (Array.isArray(biblio)) {
          // Scorri l'array e controlla se almeno un elemento ha la key corrispondente a currentBook
          return biblio.some((b) => b.key === this.currentBook);
        } else if (biblio) {
          // Se biblio è un oggetto, controlla direttamente la key
          return biblio.key === this.currentBook;
        }
        // Escludi l'elemento se biblio non esiste o non soddisfa le condizioni
        return false;
      })
    ),
    tap((x) => console.log(x)) // Effettua il log delle voci lessicali ottenute
  );

  // Variabile che indica se i dati geografici sono in fase di caricamento
  loadingGeoData = false;

  // Assegnazione dei dati geografici dal servizio di testo
  geoData = this.textsService.geoData;

  // Observable che rappresenta gli elementi della paginazione dei libri
  paginationItems: Observable<Book[]> = this.bibliographyService
    .paginationItems()
    .pipe(
      tap((x) => (this.showSpinner = true)), // Mostra il spinner durante il caricamento
      catchError((err) =>
        iif(
          () => err, // Se c'è un errore
          this.thereWasAnError(), // Gestisce l'errore
          of([]) // Altrimenti restituisce un array vuoto
        )
      ),
      takeUntil(this.destroy$), // Termina l'observable quando viene distrutto
      tap((x) => (this.showSpinner = false)) // Nasconde il spinner dopo il caricamento
    );

  // Observable che rappresenta il numero totale di libri
  totalRecords: Observable<number> = this.bibliographyService
    .countTotalBooks()
    .pipe(
      takeUntil(this.destroy$) // Termina l'observable quando viene distrutto
    );

  // Gestisce eventuali errori durante la richiesta HTTP
  thereWasAnError(err?: HttpResponseBase, source?: string) {
    if (err?.status != 200) {
      // Se lo stato della risposta non è 200 (OK)
      this.somethingWrong = true; // Imposta la flag "somethingWrong" a true
      return EMPTY; // Restituisce un observable vuoto
    }

    return of(); // Altrimenti restituisce un observable vuoto
  }

  @ViewChild('paginator', { static: true }) paginator: Paginator | undefined;

  isActiveInterval: boolean = false;
  displayModal: boolean = false;

  bibliographySearchForm: FormGroup = new FormGroup({
    title: new FormControl(null),
    id: new FormControl(null),
    date: new FormControl(null),
    author: new FormControl(null),
    location: new FormControl(null),
    inscriptionId: new FormControl(null),
    word: new FormControl(null),
  });

  constructor(
    private activatedRoute: ActivatedRoute,
    private route: Router,
    private bibliographyService: BibliographyService,
    private textsService: TextsService,
    private lexiconService: LexiconService
  ) {}

  /**
   * Questo metodo viene chiamato quando il componente è inizializzato.
   * Imposta le date minima e massima e inizializza un'osservazione sui cambiamenti del form di ricerca bibliografica.
   */
  ngOnInit(): void {
    // Imposta la data minima al 1 gennaio 1700
    this.minDate = new Date(1700, 0, 1);
    // Imposta la data massima alla data odierna
    this.maxDate = new Date();

    // Osserva i cambiamenti nel form di ricerca bibliografica
    this.bibliographySearchForm.valueChanges
      .pipe(
        takeUntil(this.destroy$), // Completa l'osservazione quando il componente viene distrutto
        debounceTime(2000) // Ritarda l'esecuzione della sottoscrizione per 2 secondi per evitare richieste troppo frequenti
      )
      .subscribe((data) => {
        // Verifica se il form è stato modificato
        if (this.bibliographySearchForm.touched) {
          // Verifica se ci sono dati inseriti nel form
          let shouldStart = Object.values(data).some(
            (value) => value !== null && value !== ''
          );
          // Imposta il risultato di default a true
          let result = true;

          // Se l'input per la data è un array e il secondo elemento è null, imposta il risultato a false
          if (Array.isArray(data.date) && data.date[1] === null) {
            result = false;
          }

          // Se ci sono dati nel form e il risultato è true, costruisci la query incrociata per la bibliografia
          if (shouldStart && result) {
            this.buildBibliographyCrossQuery(data);
          }
        }
      });

    // Osserva i cambiamenti nei parametri della query dell'URL
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event) {
          // Ottiene le chiavi e i valori dei parametri della query
          const keys = Object.keys(event);
          const values = Object.values(event);

          // Se non ci sono parametri o se c'è solo 'filter=all', torna alla URL predefinita
          if (
            keys.length == 0 ||
            (keys.length == 1 && keys[0] == 'filter' && values[0] == 'all')
          ) {
            this.goToDefaultUrl();
            return;
          }

          // Se ci sono parametri, verifica che siano validi e gestibili, altrimenti torna alla URL predefinita
          if (keys) {
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

          // Se ci sono più parametri, reimposta il libro corrente e aggiorna la paginazione
          if (keys.length > 1) {
            this.currentBook = '';
            this.pagination({} as Paginator, keys[1], values[1]);
          }

          // Se c'è solo un parametro e il suo valore è 'search', reimposta il libro corrente e costruisci la query incrociata per la bibliografia
          if (keys.length == 1 && values[0] == 'search') {
            this.currentBook = '';
            this.buildBibliographyCrossQuery(this.bibliographySearchForm.value);
          }
        }
      });
  }

  /**
   * Mostra il dialogo modale per l'aggiunta di un file.
   * Imposta il file selezionato su undefined e marca il form di ricerca bibliografica come toccato.
   */
  showModalDialog() {
    this.selectedFile = undefined;
    this.bibliographySearchForm.markAsTouched();
    this.displayModal = true;
  }

  filteredResults: any; // Risultati filtrati

  buildBibliographyCrossQuery(formValues: FormGroup, f?: number, r?: number) {
    this.isActiveSearchForm = true; // Imposta il flag per indicare che il modulo di ricerca è attivo
    this.first = 0; // Imposta l'indice del primo record visualizzato nella paginazione a 0
    this.rows = 8; // Imposta il numero di righe per pagina a 8
    this.showSpinner = true; // Mostra lo spinner di caricamento

    // Naviga senza aggiungere nuovi stati alla cronologia del browser, ma aggiunge il filtro 'search' come parametro di query
    this.route.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { filter: 'search' },
    });

    // Verifica se è necessario avviare la query in base ai valori del form
    const shouldStartQuery = Object.keys(formValues).some((key) => {
      const control = this.bibliographySearchForm.get(key);
      return control && control.touched && control.value !== null;
    });

    if (shouldStartQuery) {
      let rows = this.first >= this.rows ? this.first + this.rows : this.rows; // Calcola il numero di righe da recuperare per la pagina attuale
      this.paginationItems = this.bibliographyService
        .combineResults(formValues)
        .pipe(
          catchError((error) => {
            console.error('Si è verificato un errore:', error); // Log dell'errore sulla console
            if (error.status != 200) this.thereWasAnError(); // Se lo status dell'errore non è 200, mostra un messaggio di errore
            this.showSpinner = false; // Nasconde lo spinner di caricamento
            return of([]); // Restituisce un Observable con una struttura di AnnotationsRows vuota
          }),
          tap((res) => {
            if (res && res.length >= 0) {
              this.totalRecords = of(res.length); // Imposta il numero totale di record
            } else {
              this.totalRecords = of(0); // Imposta il numero totale di record a 0 se non ci sono risultati
            }
          }),
          map((res) => {
            if (res && res.length > 0) {
              this.showSpinner = false; // Nasconde lo spinner di caricamento
              return res.slice(this.first, rows); // Restituisce solo i record per la pagina corrente
            } else {
              this.showSpinner = false; // Nasconde lo spinner di caricamento
              return []; // Restituisce un array vuoto se non ci sono risultati
            }
          })
        );

      /* this.totalRecords = this.bibliographyService.countTotalBooks(formValues).pipe(
      takeUntil(this.destroy$)
    ) */
    } else {
    }
  }

  resetFields() {
    this.bibliographySearchForm.reset(); // Reimposta tutti i campi del form
    this.bibliographyService.emptyCachedResults(); // Svuota i risultati memorizzati nella cache
    this.paginationItems = this.bibliographyService.paginationItems(
      this.first,
      this.rows
    ); // Imposta i risultati della paginazione
    this.totalRecords = this.bibliographyService
      .countTotalBooks()
      .pipe(takeUntil(this.destroy$)); // Calcola il numero totale di libri
  }

  clearDates() {
    this.bibliographySearchForm
      .get('date')
      ?.setValue(null, { emitEvent: true }); // Pulisce il campo della data nel form
  }

  clearLocation() {
    this.bibliographySearchForm
      .get('location')
      ?.setValue(null, { emitEvent: true }); // Pulisce il campo della località nel form
  }

  clearInscription() {
    this.bibliographySearchForm
      .get('inscriptionId')
      ?.setValue(null, { emitEvent: true }); // Pulisce il campo dell'iscrizione nel form
  }

  handleAutocompleteFilter(evt: any) {
    this.bibliographySearchForm.markAllAsTouched(); // Segna tutti i campi del form come "touched"

    if (evt.ancientPlaceId != '') {
      this.bibliographySearchForm
        .get('location')
        ?.setValue(evt.ancientPlaceLabel); // Imposta il valore della località nel form
    }

    this.bibliographySearchForm.updateValueAndValidity({
      onlySelf: false,
      emitEvent: true,
    }); // Aggiorna lo stato di validità del form
  }

  autocompleteLocations: Array<LocationsCounter> = []; // Array per le località autocomplete

  searchLocations: Observable<any[]> = this.autocomplete$.pipe(
    debounceTime(1000), // Attende 1 secondo prima di eseguire la ricerca
    filter((autoCompleteEvent) => autoCompleteEvent.query != ''), // Filtra gli eventi di autocompletamento vuoti
    withLatestFrom(this.textsService.geoData), // Combina l'evento di autocompletamento con i dati geografici
    map(([query, r]) => {
      return r.filter((item) => item.modernName.includes(query.query)); // Filtra i dati geografici per il nome moderno che corrisponde alla query
    })
  );

  // Funzione per segnare tutti i campi del form come "touched"
  markAsTouched() {
    this.bibliographySearchForm.markAllAsTouched();
  }

  // Variabili per il trascinamento del bordo
  isDragging = false;
  startY = 0;
  startHeight = 0;

  // Gestione dell'evento del mouse quando viene premuto
  onMouseDown(event: MouseEvent) {
    const div = document.querySelector('.resizer') as HTMLElement;
    if (!div) return;

    // Se si è cliccato sul bordo inferiore
    if (event.offsetY > 45) {
      this.isDragging = true;
      this.startY = event.clientY;
      this.startHeight = div.clientHeight;

      // Aggiungi ascoltatori per mousemove e mouseup direttamente al documento
      document.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  // Gestione dell'evento del mouse quando viene spostato
  onMouseMove(event: MouseEvent) {
    const div = document.querySelector('.resizer') as HTMLElement;
    if (!div || !this.isDragging) return;

    const diff = event.clientY - this.startY;
    div.style.height = `${this.startHeight + diff}px`;
  }

  // Gestione dell'evento del mouse quando viene rilasciato
  onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;

      // Rimuovi gli ascoltatori per mousemove e mouseup dal documento
      document.removeEventListener('mousemove', this.onMouseMove.bind(this));
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  // Distrugge l'istanza corrente quando il componente viene distrutto
  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  // Naviga alla URL predefinita per la bibliografia
  goToDefaultUrl() {
    this.route.navigate(['/bibliography'], {
      queryParams: { filter: 'all', letter: 'a' },
    });
  }

  // Gestisce la paginazione dei risultati
  pagination(event: Paginator, ...args: any[]) {
    this.showSpinner = true;
    if (Object.keys(event).length != 0) {
      this.first = event.first;
      this.rows = event.rows;
    }
    if (Object.keys(event).length == 0) {
      this.first = 0;
      this.rows = 8;
    }
    let rows = this.first >= this.rows ? this.first + this.rows : this.rows;

    if (args.length == 2 && args[1] == null) {
      // Verifica se deve iniziare una query
      const shouldStartQuery = Object.keys(
        this.bibliographySearchForm.value
      ).some((key) => {
        const control = this.bibliographySearchForm.get(key);
        return control && control.touched && control.value !== null;
      });

      // Controlla se ci sono risultati memorizzati nella cache per la paginazione
      if (
        this.bibliographyService.getCachedResults() &&
        this.bibliographyService.getCachedResults().length > 0
      ) {
        this.paginationItems = of(
          this.bibliographyService.getCachedResults().slice(this.first, rows)
        );
        this.showSpinner = false;
      } else {
        this.paginationItems = this.bibliographyService.paginationItems(
          this.first,
          this.rows
        );
        this.showSpinner = false;
      }
    }
    if (args.length > 1) {
      let filter = args[0];
      let value = !isNaN(parseInt(args[1])) ? parseInt(args[1]) : args[1];

      switch (filter) {
        case 'letter':
          this.filterByLetter(value);
          break;
      }
      return;
    }
  }

  // Filtra gli elementi in base alla lettera specificata
  filterByLetter(letter: string): void {
    this.showSpinner = true;
    this.paginationItems = this.bibliographyService.filterByLetter(letter).pipe(
      tap((x) => (this.totalRecords = of(x.length))),
      tap((x) => (this.showSpinner = false))
    );
  }
}
