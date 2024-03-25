import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import {
  ActivatedRoute,
  NavigationEnd,
  NavigationStart,
  Params,
  Router,
} from '@angular/router';
import { Paginator } from 'primeng/paginator';
import {
  BehaviorSubject,
  catchError,
  debounceTime,
  delay,
  EMPTY,
  filter,
  iif,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  Subscription,
  switchMap,
  take,
  takeUntil,
  tap,
  timeout,
  withLatestFrom,
} from 'rxjs';
import { CenturyPipe } from 'src/app/pipes/century-pipe/century-pipe.pipe';
import { AdvancedsearchService } from 'src/app/services/advancedsearch/advancedsearch.service';
import { BibliographyService } from 'src/app/services/bibliography/bibliography.service';
import {
  LexicalElement,
  LexiconService,
} from 'src/app/services/lexicon/lexicon.service';
import {
  GlobalGeoDataModel,
  MapsService,
} from 'src/app/services/maps/maps.service';
import { TextMetadata, TextsService } from 'src/app/services/text/text.service';
import {
  AuthorCounter,
  DateCounter,
  StatisticsCounter,
} from '../lexicon/lexicon.component';
import {
  AlphabetCounter,
  AutoCompleteEvent,
  CenturiesCounter,
  DuctusCounter,
  LanguagesCounter,
  LocationsCounter,
  MaterialCounter,
  ObjectTypeCounter,
  TextFilter,
  TypesCounter,
  WordDivisionTypeCounter,
} from '../texts/texts.component';
import {
  groupAlphabet,
  groupByAuthors,
  groupByCenturies,
  groupByDates,
  groupByLexicalEntry,
  groupDuctus,
  groupLanguages,
  groupMaterial,
  groupObjectTypes,
  groupTypes,
  groupWordDivisionType,
} from '../texts/utils';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class AdvancedSearchComponent implements OnInit, OnDestroy {
  isActiveInscriptionInterval: boolean = false;
  isActiveBibliographyInterval: boolean = false;

  allowedInscriptionInterval: number[] = [0, 100];
  allowedBibliographyInterval: number[] = [1500, 2023];

  get mappingBibliograpgyRange(): number[] {
    return this.allowedBibliographyInterval; // Direttamente ritornare il valore attuale perché già mappato nel range [1500, 2023]
  }

  get mapBibliographySingle(): number {
    return this.startBiblio; // Direttamente ritornare il valore attuale perché già mappato nel range [1500, 2023]
  }

  start: number = -600;
  startBiblio: number = 1500;

  get mappingInscriptionRange(): number[] {
    let min = -600;
    let max = 100;
    let minSlider = 0;
    let maxSlider = 100;
    return this.allowedInscriptionInterval.map(
      (value) =>
        ((value - minSlider) * (max - min)) / (maxSlider - minSlider) + min
    );
  }

  lexiconOptions = [
    { name: 'Entry' },
    { name: 'Form' },
    { name: 'Autocomplete' },
  ];
  lexiconSearchMode = [
    { name: 'Start', value: 'startsWith' },
    { name: 'Contains', value: 'contains' },
    { name: 'End', value: 'endsWith' },
    { name: 'Equals', value: 'equals' },
  ];
  formSearchMode = [
    { name: 'Start', value: 'startsWith' },
    { name: 'Contains', value: 'contains' },
    { name: 'End', value: 'endsWith' },
    { name: 'Equals', value: 'equals' },
  ];
  inscriptionSearchMode = [
    { name: 'Start', value: 'startsWith' },
    { name: 'Contains', value: 'contains' },
    { name: 'End', value: 'endsWith' },
    { name: 'Equals', value: 'equals' },
  ];
  selectedLexiconOption: string = 'Entry';
  selectedInscriptionSearchMode: string = 'contains';

  advancedSearchForm: FormGroup = new FormGroup({
    word: new FormControl(null),
    wordSearchMode: new FormControl('contains'),
    title: new FormControl(null),
    id: new FormControl(null),
    otherId: new FormControl(null),
    language: new FormControl(null),
    alphabet: new FormControl(null),
    dateOfOriginNotBefore: new FormControl(-200),
    dateOfOriginNotAfter: new FormControl(null),
    modernName: new FormControl(null),
    inscriptionType: new FormControl(null),
    objectType: new FormControl(null),
    material: new FormControl(null),
    ductus: new FormControl(null),
    wordDivisionType: new FormControl(null),
    lexicalEntryText: new FormControl(null),
    lexicalEntrySearchMode: new FormControl('contains'),
    lexicalEntryType: new FormControl(null),
    lexicalEntryPos: new FormControl(null),
    lexicalEntryAuthor: new FormControl(null),
    lexicalEntryLanguage: new FormControl(null),
    lexicalEntryStatus: new FormControl(null),
    formText: new FormControl(null),
    formSearchMode: new FormControl('contains'),
    formAuthor: new FormControl(null),
    lexicalElementLabel: new FormControl(null),
    lexicalElementIRI: new FormControl(null),
    bibliographyTitle: new FormControl(null),
    bibliographyID: new FormControl(null),
    bibliographyDate: new FormControl(null),
    bibliographyAuthor: new FormControl(null),
  });

  first: number = 0;
  rows: number = 8;
  isActiveInterval: boolean = false;
  minDate = new Date(1700, 0, 1); // 1 gennaio 1980
  maxDate = new Date(); // Data odierna

  autocompleteLocationReq$: BehaviorSubject<AutoCompleteEvent> =
    new BehaviorSubject<AutoCompleteEvent>({ originalEvent: {}, query: '' });
  autocompleteLexiconReq$: BehaviorSubject<AutoCompleteEvent> =
    new BehaviorSubject<AutoCompleteEvent>({ originalEvent: {}, query: '' });
  getFileByIdReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  typesList: Observable<StatisticsCounter[]> = this.lexiconService.types$;
  posList: Observable<StatisticsCounter[]> = this.lexiconService.pos$;
  authorsList: Observable<StatisticsCounter[]> = this.lexiconService.authors$;
  languagesList: Observable<StatisticsCounter[]> =
    this.lexiconService.languages$;
  statusList: Observable<StatisticsCounter[]> = this.lexiconService.status$;

  autocompleteLocations: Array<LocationsCounter> = [];
  destroy$: Subject<boolean> = new Subject<boolean>();

  // Questo codice definisce una serie di variabili osservabili che rappresentano diverse parti dello stato dell'applicazione.
  // Le osservabili sono definite in base ai parametri di query dell'URL.

  // Variabile osservabile per il filtro attivo del testo.
  activeTab: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$), // Emette i valori fino a quando il componente è distrutto.
    filter((params) => Object.keys(params).length != 0), // Filtra solo i parametri non vuoti.
    map((queryParams: Params) => queryParams as TextFilter), // Mappa i parametri di query come oggetto TextFilter.
    map((filter: TextFilter) => filter.filter) // Estrae il filtro dalla struttura dati.
  );

  // Variabile osservabile per la data attiva.
  activeDate: Observable<number> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if (filter.date) return filter.date; // Restituisce la data se presente.
      return NaN; // Altrimenti restituisce NaN.
    })
  );

  // Variabile osservabile per la località attiva.
  activeLocation: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if (filter.place) return filter.place; // Restituisce la località se presente.
      return ''; // Altrimenti restituisce una stringa vuota.
    })
  );

  // Variabile osservabile per il tipo attivo.
  activeType: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as TextFilter),
    map((filter: TextFilter) => {
      if (filter.type) return filter.type; // Restituisce il tipo se presente.
      return ''; // Altrimenti restituisce una stringa vuota.
    })
  );

  // Variabile osservabile per il file attivo.
  activeFile: Observable<string | undefined> =
    this.activatedRoute.queryParams.pipe(
      takeUntil(this.destroy$),
      map((queryParams: Params) => queryParams as TextFilter),
      map((filter: TextFilter) => {
        if (filter.file) return filter.file; // Restituisce il file se presente.
        return undefined; // Altrimenti restituisce undefined.
      })
    );

  // Variabile osservabile per il numero totale di record.
  totalRecords: Observable<number> = this.textService.countFiles().pipe(
    takeUntil(this.destroy$) // Emette i valori fino a quando il componente è distrutto.
  );

  // Variabile osservabile per gli elementi di paginazione.
  paginationItems: Observable<TextMetadata[]> = this.textService
    .paginationItems()
    .pipe(
      tap((x) => (this.showSpinner = true)), // Visualizza lo spinner.
      catchError((err) =>
        iif(
          () => err,
          this.thereWasAnError(), // Mostra un errore se presente.
          of([])
        )
      ),
      takeUntil(this.destroy$), // Emette i valori fino a quando il componente è distrutto.
      tap((x) => (this.showSpinner = false)) // Nasconde lo spinner.
    );

  // Variabile osservabile per il raggruppamento dei secoli.
  groupCenturies: Observable<CenturiesCounter[]> = this.textService
    .getUniqueMetadata('_doc__dateOfOriginNotBefore')
    .pipe(
      takeUntil(this.destroy$), // Emette i valori fino a quando il componente è distrutto.
      map((texts) => groupByCenturies(texts)) // Raggruppa i testi per secolo.
    );

  // Variabile osservabile per il raggruppamento dei tipi.
  groupTypes: Observable<any[]> = this.textService
    .getUniqueMetadata('_doc__inscriptionType')
    .pipe(
      catchError((err) =>
        iif(
          () => err,
          this.thereWasAnError(), // Mostra un errore se presente.
          of([])
        )
      ),
      takeUntil(this.destroy$), // Emette i valori fino a quando il componente è distrutto.
      map((texts) => texts.filter((text: any) => text && text.trim() !== '')), // Filtra le stringhe vuote.
      map((texts) => texts.map((text: any) => ({ inscriptionType: text }))) // Mappa i tipi di iscrizione.
    );

  // Variabile osservabile per il raggruppamento delle lingue.
  groupLanguages: Observable<LanguagesCounter[]> = this.textService
    .getUniqueMetadata('_doc__language__ident')
    .pipe(
      catchError((err) =>
        iif(
          () => err,
          this.thereWasAnError(), // Mostra un errore se presente.
          of([])
        )
      ),
      takeUntil(this.destroy$), // Emette i valori fino a quando il componente è distrutto.
      map((texts) =>
        texts.filter(
          (text: any) => text && text.trim() !== '' && !text.includes('Ital-x')
        )
      ), // Filtra le lingue.
      map(
        (lang) => lang.map((l: any) => ({ language: l.replace(/[\"]/g, '') })) // Mappa le lingue.
      )
    );

  // Observable per raggruppare le contate delle lettere dell'alfabeto
  groupAlphabet: Observable<AlphabetCounter[]> = this.textService
    .getUniqueMetadata('_doc__writingSystem')
    .pipe(
      catchError((err) =>
        // Se si verifica un errore, gestiscilo
        iif(
          () => err,
          this.thereWasAnError(), // Se c'è un errore, emetti un errore
          of([]) // Altrimenti emetti un array vuoto
        )
      ),
      takeUntil(this.destroy$), // Unisciti alla distruzione dell'observable
      // Mappa gli alfabeti in un formato specifico per il conteggio
      map((alphabets) => alphabets.map((alpha: any) => ({ alphabet: alpha })))
    );

  // Observable per raggruppare i contatori dei tipi di oggetti
  groupObjectTypes: Observable<ObjectTypeCounter[]> = this.textService
    .getUniqueMetadata('_doc__support__objectType')
    .pipe(
      catchError((err) => iif(() => err, this.thereWasAnError(), of([]))),
      takeUntil(this.destroy$),
      // Mappa i tipi di oggetti in un formato specifico per il conteggio
      map((objectTypes) =>
        objectTypes.map((obj: any) => ({
          objectType: obj.replace(/[\"]/g, ''),
        }))
      )
    );

  // Observable per raggruppare i contatori dei materiali
  groupMaterial: Observable<MaterialCounter[]> = this.textService
    .getUniqueMetadata('_doc__support__material')
    .pipe(
      catchError((err) => iif(() => err, this.thereWasAnError(), of([]))),
      takeUntil(this.destroy$),
      // Mappa i materiali in un formato specifico per il conteggio
      map((materials) =>
        materials.map((mat: any) => ({ material: mat.replace(/[\"]/g, '') }))
      )
    );

  // Observable per raggruppare i contatori del ductus
  groupDuctus: Observable<DuctusCounter[]> = this.textService
    .getUniqueMetadata('_doc__bodytextpart__ductus')
    .pipe(
      catchError((err) => iif(() => err, this.thereWasAnError(), of([]))),
      takeUntil(this.destroy$),
      // Filtra i testi vuoti e mappa il ductus in un formato specifico per il conteggio
      map((texts) => texts.filter((text: any) => text && text.trim() !== '')),
      map((materials) =>
        materials.map((mat: any) => ({ ductus: mat.replace(/[\"]/g, '') }))
      )
    );

  // Observable per raggruppare i contatori del tipo di divisione delle parole
  groupWordDivisionType: Observable<WordDivisionTypeCounter[]> =
    this.textService.getUniqueMetadata('_doc__wordDivisionType').pipe(
      catchError((err) => iif(() => err, this.thereWasAnError(), of([]))),
      takeUntil(this.destroy$),
      // Mappa il tipo di divisione delle parole in un formato specifico per il conteggio
      map((materials) =>
        materials.map((mat: any) => ({ type: mat.replace(/[\"]/g, '') }))
      )
    );

  // Observable per ottenere dati geografici
  geoData = this.textService.geoData
    .pipe
    /* switchMap(locations => this.mapsService.getGeoPlaceData(locations)), */
    ();

  // Observable per la ricerca di posizioni
  searchLocations: Observable<any[]> = this.autocompleteLocationReq$.pipe(
    // Filtra gli eventi di completamento automatico con query non vuote
    filter((autoCompleteEvent) => autoCompleteEvent.query != ''),
    // Combina con i dati geografici e restituisce solo quelli che corrispondono alla query
    withLatestFrom(this.geoData),
    map(([query, r]) => {
      return r.filter((item) => item.modernName.includes(query.query));
    })
  );

  // Observable per la ricerca lessicale
  searchLexicon: Observable<LexicalElement[]> =
    this.autocompleteLexiconReq$.pipe(
      debounceTime(1000), // Attendi 1 secondo tra le richieste di completamento automatico
      // Filtra gli eventi di completamento automatico con query non vuote e passa alla ricerca nel servizio lessicale
      filter((autoCompleteEvent) => autoCompleteEvent.query != ''),
      switchMap((autoCompleteEvent) =>
        this.lexiconService.getFormsList(autoCompleteEvent.query)
      ),
      // Raggruppa gli elementi lessicali in base all'entrata lessicale
      map((elements) => groupByLexicalEntry(elements))
    );

  somethingWrong: boolean = false;
  showSpinner: boolean = true;

  initialFormValues = {
    word: null,
    title: null,
    titleExactMatch: false,
    id: null,
    idExactMatch: false,
    language: null,
    alphabet: null,
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
    bibliographyAuthor: null,
  };

  constructor(
    private activatedRoute: ActivatedRoute,
    private textService: TextsService,
    private mapsService: MapsService,
    private lexiconService: LexiconService,
    private bibliographyService: BibliographyService,
    private advancedSearchService: AdvancedsearchService
  ) {}

  ngOnInit(): void {
    // Imposta la data minima al 1 gennaio 1700
    this.minDate = new Date(1700, 0, 1);
    // Imposta la data massima alla data odierna
    this.maxDate = new Date();
    // Iscrizione agli eventi dei parametri della query dell'URL e interruzione quando il componente viene distrutto
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event) {
          // Estrae le chiavi e i valori dagli eventi della query
          const keys = Object.keys(event);
          const values = Object.values(event);
          if (keys.length == 0) {
            // Se non ci sono chiavi, esegue una funzione per andare all'URL predefinito
            //this.goToDefaultUrl();
            return;
          }
          if (keys) {
            // Itera tra le chiavi e i valori degli eventi
            for (const [key, value] of Object.entries(event)) {
              /*  Se il valore non è incluso negli operatori consentiti,
              o se è vuoto,
              o se è un array con più di un elemento,
              esegue una funzione per andare all'URL predefinito */
              /*  if (!this.allowedOperators.includes(key) ||  
                event[key] == '' || 
                (Array.isArray(event[key]) && Array.from(event[key]).length > 1))
            {
              this.goToDefaultUrl(); 
              return;
            } */
            }
          }

          // Se la prima chiave è 'file', richiede il file
          if (keys[0] == 'file') {
            let fileId = values[0];
            this.getFileByIdReq$.next(fileId);
          }
        }
      });
  }

  buildTextQuery() {
    const formValues = this.advancedSearchForm.getRawValue(); // Ottiene tutti i valori dal form group
    const shouldStartQuery = Object.keys(formValues).some((key) => {
      const control = this.advancedSearchForm.get(key);
      return control && control.touched && control.value !== null;
    });

    let result = true; // Imposta il valore di default su true

    // Controlla se l'intervallo di date della bibliografia è valido
    if (
      Array.isArray(formValues.bibliographyDate) &&
      formValues.bibliographyDate[1] === null
    ) {
      result = false;
    }

    // Se nessun controllo è stato toccato o modificato e l'intervallo di date della bibliografia non è valido, interrompi la query
    if (!shouldStartQuery && !result) {
      console.log(
        'Nessun controllo è stato toccato e modificato. Interrompendo la query.'
      );
      return;
    }

    this.somethingWrong = false; // Imposta il flag di errore su false

    this.paginationItems = of([]); // Inizializza l'elenco di paginazione con un Observable vuoto
    this.totalRecords = of(NaN); // Inizializza il numero totale di record con un Observable contenente NaN

    this.paginationItems = this.advancedSearchService
      .crossQuery(this.advancedSearchForm.value, this.advancedSearchForm)
      .pipe(
        catchError((error) => {
          console.error('Si è verificato un errore:', error); // Stampa l'errore sulla console
          if (error.status != 200) this.thereWasAnError(); // Gestisce l'errore se lo stato non è 200
          return of([]); // Ritorna un Observable con una struttura di AnnotationsRows vuota
        }),
        tap((res) => {
          setTimeout(() => {
            this.totalRecords = of(res.length); // Imposta il numero totale di record nel risultato della query
          }, 100);
        }),
        map((texts) => texts.slice(this.first, this.rows)) // Esegue il paging dei risultati della query
      );
  }

  ngOnDestroy(): void {
    this.destroy$.next(true); // Invia un segnale per distruggere l'Observable
    this.destroy$.complete(); // Completa il ciclo di vita dell'Observable
  }

  // Funzione per gestire la paginazione dei risultati
  pagination(event: Paginator, ...args: any[]) {
    // Attiva lo spinner di caricamento
    this.showSpinner = true;

    // Se ci sono dati nell'evento della paginazione, imposta i valori di 'first' e 'rows' di conseguenza
    if (Object.keys(event).length != 0) {
      this.first = event.first;
      this.rows = event.rows;
    }
    // Altrimenti, reimposta 'first' a 0 e 'rows' a 8
    if (Object.keys(event).length == 0) {
      this.first = 0;
      this.rows = 8;
    }

    // Calcola il numero di righe da visualizzare
    let rows =
      this.first != this.rows && this.first < this.rows
        ? this.rows
        : this.first + this.rows;

    // Filtra gli argomenti rimuovendo eventuali valori nulli
    if (args.length > 0) {
      args = args.filter((query) => query != null);
    }

    // Se non ci sono risultati filtrati, ottieni tutti i dati
    if (this.advancedSearchService.getFilteredResults().length == 0) {
      this.getAllData(this.first, rows);
    } else {
      // Altrimenti, esegui una query incrociata utilizzando i criteri di ricerca avanzata
      let rows = this.first >= this.rows ? this.first + this.rows : this.rows;
      this.paginationItems = this.advancedSearchService
        .crossQuery(this.advancedSearchForm.value, this.advancedSearchForm)
        .pipe(
          // Nasconde lo spinner una volta completata la query
          tap((x) => (this.showSpinner = false)),
          // Limita i risultati alla pagina corrente
          map((texts) => texts.slice(this.first, rows)),
          // Condivide i risultati in modo che più sottoscrizioni condividano la stessa sequenza di risultati
          shareReplay()
        );
    }
  }

  // Ottiene tutti i dati paginati
  getAllData(f?: number, r?: number): void {
    this.showSpinner = true;
    let rows = 0;
    if (f && r) {
      this.first = f;
      rows = r;
    }
    if (!f && !r) {
      this.first = 0;
      this.rows = 8;
    }

    // Ottiene i dati paginati utilizzando il servizio di testo
    this.paginationItems = this.textService
      .paginationItems(this.first + 1, this.rows)
      .pipe(
        // Nasconde lo spinner una volta completata la query
        tap((x) => (this.showSpinner = false)),
        // Condivide i risultati in modo che più sottoscrizioni condividano la stessa sequenza di risultati
        shareReplay()
      );

    // Ottiene il numero totale di record
    this.totalRecords = this.textService.countFiles();
  }

  // Resetta la data di origine
  clearDates() {
    this.advancedSearchForm
      .get('dateOfOriginNotAfter')
      ?.setValue(null, { emitEvent: true });
  }

  // Resetta la data bibliografica
  clearBiblioDate() {
    this.advancedSearchForm
      .get('bibliographyDate')
      ?.setValue(null, { emitEvent: true });
  }

  // Resetta la località
  clearLocation() {
    this.advancedSearchForm
      .get('modernName')
      ?.setValue(null, { emitEvent: true });
  }

  // Resetta l'elemento lessicale
  clearLexicalEntry() {
    this.advancedSearchForm
      .get('lexicalElement')
      ?.setValue(null, { emitEvent: true });
  }

  // Gestisce il cambio di opzione nel lessico
  onLexiconOptionChange() {
    // Campi da reimpostare
    const fieldsToReset = [
      'lexicalEntryText',
      'lexicalEntryType',
      'lexicalEntryPos',
      'lexicalEntryAuthor',
      'lexicalEntryLanguage',
      'lexicalEntryStatus',
      'formText',
      'formAuthor',
      'lexicalElementLabel',
      'lexicalElementIRI',
    ];

    // Reimposta i valori dei campi specificati
    fieldsToReset.forEach((field) => {
      this.advancedSearchForm.get(field)?.reset();
    });

    // Imposta la modalità di ricerca dell'elemento lessicale su 'contains'
    this.advancedSearchForm.get('lexicalEntrySearchMode')?.setValue('contains');
  }

  // Notifica un errore
  thereWasAnError() {
    // Imposta il flag di errore su true e ritorna un observable vuoto
    this.somethingWrong = true;
    return EMPTY;
  }

  // Resetta tutti i campi del form
  resetFields() {
    // Segna il form come non toccato e reimposta i valori iniziali
    this.advancedSearchForm.markAsUntouched();
    this.advancedSearchForm.patchValue(this.initialFormValues);
    this.first = 0;
    this.rows = 8;

    // Ottiene i dati paginati e il conteggio totale dei record
    this.paginationItems = this.textService
      .paginationItems(this.first, this.rows)
      .pipe(
        // Nasconde lo spinner una volta completata la query
        tap((x) => (this.showSpinner = false)),
        // Condivide i risultati in modo che più sottoscrizioni condividano la stessa sequenza di risultati
        shareReplay()
      );
    this.totalRecords = this.textService.countFiles();
  }

  // Gestisce il filtro di autocompletamento per la posizione
  handleAutocompleteFilterLocation(evt: any) {
    // Segna il campo 'modernName' come toccato
    this.advancedSearchForm.get('modernName')?.markAsTouched();
    // Aggiorna la validità del form
    this.advancedSearchForm.updateValueAndValidity({
      onlySelf: false,
      emitEvent: true,
    });

    // Se il valore di 'modernName' non è vuoto, imposta il valore del campo con l'URI moderno senza emettere un evento
    if (evt.modernName != '') {
      this.advancedSearchForm
        .get('modernName')
        ?.setValue(evt.modernUri, { emitEvent: false });
    }

    // Costruisce la query di testo
    this.buildTextQuery();
  }

  // Gestisce il filtro di autocompletamento
  handleAutocompleteFilter(evt: any) {
    // Segna tutti i campi come toccati
    this.advancedSearchForm.markAllAsTouched();

    // Se il valore del campo non è vuoto, imposta i valori dei campi 'lexicalElementIRI' e 'lexicalElementLabel' senza emettere eventi
    if (evt.form != '') {
      this.advancedSearchForm
        .get('lexicalElementIRI')
        ?.setValue(evt.form, { emitEvent: false });
      this.advancedSearchForm
        .get('lexicalElementLabel')
        ?.setValue(evt.label, { emitEvent: false });
    }

    // Aggiorna la validità del form
    this.advancedSearchForm.updateValueAndValidity({
      onlySelf: false,
      emitEvent: true,
    });
  }

  // Seleziona l'entry lessicale
  onSelectLexicalEntry(evt: any) {
    // Segna tutti i campi come toccati
    this.advancedSearchForm.markAllAsTouched();

    // Se il valore non è vuoto, imposta i valori dei campi 'lexicalElementIRI' e 'lexicalElementLabel' senza emettere eventi
    if (evt.value != '') {
      this.advancedSearchForm
        .get('lexicalElementIRI')
        ?.setValue(evt.value, { emitEvent: false });
      this.advancedSearchForm
        .get('lexicalElementLabel')
        ?.setValue(evt.label, { emitEvent: false });
    }

    // Aggiorna la validità del form
    this.advancedSearchForm.updateValueAndValidity({
      onlySelf: false,
      emitEvent: true,
    });
  }

  // Gestisce il cambiamento dello slider per la data di origine
  onChangeSlider(event: any) {
    // Se è stato selezionato un singolo valore, imposta il valore di 'dateOfOriginNotBefore' al valore iniziale e 'dateOfOriginNotAfter' a null
    if (event.value) {
      this.advancedSearchForm.get('dateOfOriginNotBefore')?.markAsTouched();
      this.advancedSearchForm
        .get('dateOfOriginNotBefore')
        ?.setValue(this.start);
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(null);
    }

    // Se sono stati selezionati due valori, imposta i valori di 'dateOfOriginNotBefore' e 'dateOfOriginNotAfter' al range mappato
    if (event.values) {
      this.advancedSearchForm.get('dateOfOriginNotBefore')?.markAsTouched();
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.markAsTouched();

      this.advancedSearchForm
        .get('dateOfOriginNotBefore')
        ?.setValue(this.mappingInscriptionRange[0]);
      this.advancedSearchForm
        .get('dateOfOriginNotAfter')
        ?.setValue(this.mappingInscriptionRange[1]);
    }
  }

  // Gestisce il cambiamento dello slider per la bibliografia
  onChangeBibliographySlider(event: any) {
    // Se è stato selezionato un singolo valore, imposta il valore di 'bibliographyFromDate' al valore mappato per singolo
    // e 'bibliographyToDate' a null
    if (event.value) {
      this.advancedSearchForm
        .get('bibliographyFromDate')
        ?.setValue(this.mapBibliographySingle);
      this.advancedSearchForm.get('bibliographyToDate')?.setValue(null);
    }

    // Se sono stati selezionati due valori, imposta i valori di 'bibliographyFromDate' e 'bibliographyToDate' al range mappato
    if (event.values) {
      this.advancedSearchForm
        .get('bibliographyFromDate')
        ?.setValue(this.mappingBibliograpgyRange[0]);
      this.advancedSearchForm
        .get('bibliographyToDate')
        ?.setValue(this.mappingBibliograpgyRange[1]);
    }
  }

  // Imposta l'intervallo di data dell'iscrizione
  setInscriptionDateInterval() {
    // Se l'intervallo di iscrizione è attivo, imposta il valore di 'dateOfOriginNotBefore' e 'dateOfOriginNotAfter' al range mappato
    // altrimenti imposta 'dateOfOriginNotBefore' al valore iniziale e 'dateOfOriginNotAfter' a null
    if (this.isActiveInscriptionInterval) {
      this.advancedSearchForm
        .get('dateOfOriginNotBefore')
        ?.setValue(this.mappingInscriptionRange[0]);
      this.advancedSearchForm
        .get('dateOfOriginNotAfter')
        ?.setValue(this.mappingInscriptionRange[1]);
    } else {
      this.advancedSearchForm
        .get('dateOfOriginNotBefore')
        ?.setValue(this.start);
      this.advancedSearchForm.get('dateOfOriginNotAfter')?.setValue(null);
    }
  }

  // Imposta l'intervallo di data della bibliografia
  setBibliographyDateInterval() {
    // Se l'intervallo di bibliografia è attivo, imposta il valore di 'bibliographyFromDate' e 'bibliographyToDate' al range mappato
    // altrimenti imposta 'bibliographyFromDate' al valore mappato per singolo e 'bibliographyToDate' a null
    if (this.isActiveBibliographyInterval) {
      this.advancedSearchForm
        .get('bibliographyFromDate')
        ?.setValue(this.mappingBibliograpgyRange[0]);
      this.advancedSearchForm
        .get('bibliographyToDate')
        ?.setValue(this.mappingBibliograpgyRange[1]);
    } else {
      this.advancedSearchForm
        .get('bibliographyFromDate')
        ?.setValue(this.mapBibliographySingle);
      this.advancedSearchForm.get('bibliographyToDate')?.setValue(null);
    }
  }
}
