import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  ElementRef,
  NgZone,
  OnInit,
  Renderer2,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import * as L from 'leaflet';
import { circle, tileLayer } from 'leaflet';
import { MenuItem } from 'primeng/api';
import { Paginator } from 'primeng/paginator';
import {
  map,
  tap,
  Subject,
  takeUntil,
  BehaviorSubject,
  Observable,
  switchMap,
  take,
  filter,
  debounceTime,
  timeout,
  catchError,
  iif,
  throwError,
  of,
  EMPTY,
  shareReplay,
  mergeMap,
  flatMap,
  delay,
  forkJoin,
  withLatestFrom,
  ObservableLike,
} from 'rxjs';
import { CenturyPipe } from 'src/app/pipes/century-pipe/century-pipe.pipe';
import {
  FormElement,
  LexiconService,
} from 'src/app/services/lexicon/lexicon.service';
import {
  GlobalGeoDataModel,
  MapsService,
} from 'src/app/services/maps/maps.service';
import { PopupService } from 'src/app/services/maps/popup/popup.service';
import {
  AnnotationsRows,
  BibliographicElement,
  BookAuthor,
  BookEditor,
  Graphic,
  ListAndId,
  TextMetadata,
  TextsService,
  TextToken,
  XmlAndId,
} from 'src/app/services/text/text.service';
import { environment } from 'src/environments/environment';
import { DynamicOverlayComponent } from './dynamic-overlay/dynamic-overlay.component';
import {
  buildCustomInterpretative,
  getApparatus,
  getBibliography,
  getCommentaryXml,
  getCustomFacsimile,
  getFacsimile,
  getInscriptionType,
  getTeiChildren,
  getTranslationByXml,
  groupAlphabet,
  groupByCenturies,
  groupLanguages,
  groupMaterial,
  groupObjectTypes,
  groupTypes,
  leidenDiplomaticBuilder,
} from './utils';

export interface CenturiesCounter {
  century: number;
  count: number;
  label: string;
}

export interface LocationsCounter {
  ancientPlaceUrl: string;
  ancientPlaceId: string;
  ancientPlaceLabel: string;
  modernPlaceUrl: string;
  modernPlaceId: string;
  modernPlaceLabel: string;
  count: number;
}

export interface TypesCounter {
  inscriptionType: string;
  count: number;
}

export interface AlphabetCounter {
  alphabet: string;
  count: number;
}

export interface LanguagesCounter {
  language: string;
  count: number;
}

export interface ObjectTypeCounter {
  objectType: string;
  count: number;
}

export interface WordDivisionTypeCounter {
  count: number;
  type: string;
}

export interface MaterialCounter {
  material: string;
  count: number;
}

export interface DuctusCounter {
  ductus: string;
  count: number;
}

export interface TextFilter {
  filter: string;
  date: number;
  place: string;
  type: string;
  file: string;
}

export interface AutoCompleteEvent {
  originalEvent: object;
  query: string;
}

export interface PaginatorEvent {
  page: number;
  first: number;
  rows: number;
  pageCount: number;
}

const allowedCenturies: number[] = [-600, -500, -400, -300, -200, -100, 100];

@Component({
  selector: 'app-texts',
  templateUrl: './texts.component.html',
  styleUrls: ['./texts.component.scss'],
})
export class TextsComponent implements OnInit {
  //RXJS
  destroy$: Subject<boolean> = new Subject<boolean>();
  autocomplete$: BehaviorSubject<AutoCompleteEvent> =
    new BehaviorSubject<AutoCompleteEvent>({ originalEvent: {}, query: '' });
  autocompleteLocations: Array<LocationsCounter> = [];
  getGeoData: BehaviorSubject<LocationsCounter[]> = new BehaviorSubject<
    LocationsCounter[]
  >([]);

  somethingWrong: boolean = false;
  showSpinner: boolean = true;
  isActiveInterval: boolean = false;
  first: number = 0;
  rows: number = 8;
  allowedFilters: string[] = ['date', 'location', 'type', 'search'];
  allowedOperators: string[] = ['filter', 'date', 'place', 'type', 'file'];
  searchOptions: Array<string> = ['start', 'equals', 'contains', 'ends'];

  // MAP
  leafletMapOptions: any;
  layers: Array<L.Circle> = [];

  singleMap: L.Map | undefined;
  singleCircle: L.Circle | undefined;
  bounds = new L.LatLngBounds(
    new L.LatLng(33.802052, 4.239242),
    new L.LatLng(50.230863, 19.812745)
  );

  activeTab: Observable<string | null> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$), // Prende i valori fino a che non si verifica un evento di distruzione
    map((queryParams: Params) =>
      // Controlla se i parametri della query sono vuoti, ritorna null in tal caso, altrimenti il filtro testuale
      Object.keys(queryParams).length === 0 ? null : (queryParams as TextFilter)
    ),
    map((filter: TextFilter | null) =>
      // Ottiene il filtro dalla query se presente, altrimenti null
      filter ? filter.filter : null
    ),
    tap((index) =>
      // Imposta l'indice attivo a 1 se la scheda di ricerca è selezionata, altrimenti a 0
      index === 'search' ? (this.activeIndex = 1) : (this.activeIndex = 0)
    )
  );

  // Definisce un Observable per tenere traccia della data attiva basata sui parametri della query
  activeDate: Observable<number> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$), // Prende i valori fino a che non si verifica un evento di distruzione
    map((queryParams: Params) => queryParams as TextFilter), // Converte i parametri della query in filtro testuale
    map((filter: TextFilter) => {
      // Ritorna la data dal filtro, se presente, altrimenti NaN
      if (filter.date) return filter.date;
      return NaN;
    })
  );

  // Definisce un Observable per tenere traccia della posizione attiva basata sui parametri della query
  activeLocation: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$), // Prende i valori fino a che non si verifica un evento di distruzione
    map((queryParams: Params) => queryParams as TextFilter), // Converte i parametri della query in filtro testuale
    map((filter: TextFilter) => {
      // Ritorna il luogo dal filtro, se presente, altrimenti una stringa vuota
      if (filter.place) return filter.place;
      return '';
    })
  );

  // Definisce un Observable per tenere traccia del tipo attivo basato sui parametri della query
  activeType: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$), // Prende i valori fino a che non si verifica un evento di distruzione
    map((queryParams: Params) => queryParams as TextFilter), // Converte i parametri della query in filtro testuale
    map((filter: TextFilter) => {
      // Ritorna il tipo dal filtro, se presente, altrimenti una stringa vuota
      if (filter.type) return filter.type;
      return '';
    })
  );

  // Definisce un Observable per tenere traccia del file attivo basato sui parametri della query
  activeFile: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$), // Prende i valori fino a che non si verifica un evento di distruzione
    map((queryParams: Params) => queryParams as TextFilter), // Converte i parametri della query in filtro testuale
    map((filter: TextFilter) => {
      // Ritorna il file dal filtro, se presente, altrimenti una stringa vuota
      if (filter.file) return filter.file;
      return '';
    }),
    tap(x=> console.log(x))
  );

  // Definisce un Observable per tenere traccia del numero totale di record
  totalRecords: Observable<number> = this.textService.countFiles().pipe(
    takeUntil(this.destroy$) // Prende i valori fino a che non si verifica un evento di distruzione
  );

  // Definisce un Observable per gli elementi di paginazione
  paginationItems: Observable<TextMetadata[]> = this.textService
    .texts$
    .pipe(
      tap((x) => (this.showSpinner = true)), // Mostra lo spinner di caricamento
      catchError((err) =>
        // Gestisce gli errori ritornando un Observable vuoto o eseguendo un'altra azione
        iif(
          () => err,
          this.thereWasAnError(), // Gestisce l'errore
          of([]) // Ritorna un Observable vuoto
        )
      ),
      takeUntil(this.destroy$), // Prende i valori fino a che non si verifica un evento di distruzione
      tap((x) => (this.showSpinner = false)) // Nasconde lo spinner di caricamento
    );

  // Observable che raggruppa i secoli in cui sono stati scritti i testi
  groupCenturies: Observable<CenturiesCounter[]> = this.textService
    .getUniqueMetadata('_doc__dateOfOriginNotBefore')
    .pipe(
      takeUntil(this.destroy$), // Completa l'Observable quando destroy$ emette un valore
      map((texts) => groupByCenturies(texts)) // Raggruppa i testi per secolo
    );

  // Observable che raggruppa i tipi di iscrizione
  groupTypes: Observable<any[]> = this.textService
    .getUniqueMetadata('_doc__inscriptionType')
    .pipe(
      catchError((err) =>
        iif(
          () => err,
          this.thereWasAnError(), // Gestisce l'errore, se presente
          of([]) // Ritorna un Observable di un array vuoto in caso di errore
        )
      ),
      takeUntil(this.destroy$), // Completa l'Observable quando destroy$ emette un valore
      map((texts) => texts.filter((text: any) => text && text.trim() !== '')), // Filtra le stringhe vuote
      map((texts) => texts.map((text: any) => ({ inscriptionType: text }))) // Mappa i tipi di iscrizione
    );

  // Observable che raggruppa le lingue, escludendo 'Ital-x'
  groupLanguages: Observable<LanguagesCounter[]> = this.textService
    .getUniqueMetadata('_doc__language__ident')
    .pipe(
      catchError((err) =>
        iif(
          () => err,
          this.thereWasAnError(), // Gestisce l'errore, se presente
          of([]) // Ritorna un Observable di un array vuoto in caso di errore
        )
      ),
      takeUntil(this.destroy$), // Completa l'Observable quando destroy$ emette un valore
      map((texts) =>
        texts.filter(
          (text: any) => text && text.trim() !== '' && !text.includes('Ital-x')
        )
      ), // Esclude le lingue 'Ital-x'
      map(
        (lang) => lang.map((l: any) => ({ language: l.replace(/[\"\[\]]/g, '') })) // Rimuove le virgolette dalle stringhe
      )
    );

  // Observable per raggruppare gli alfabeti utilizzati
  groupAlphabet: Observable<AlphabetCounter[]> = this.textService
    .getUniqueMetadata('_doc__writingSystem')
    .pipe(
      catchError((err) =>
        iif(
          () => err,
          this.thereWasAnError(), // Gestisce l'errore, se presente
          of([]) // Ritorna un Observable di un array vuoto in caso di errore
        )
      ),
      takeUntil(this.destroy$), // Completa l'Observable quando destroy$ emette un valore
      map((alphabets) => alphabets.map(
        (alpha: any) => ({ 
          alphabet: JSON.parse(alpha)['type'][0]
        }))),
    );

  // Observable che raggruppa i tipi di oggetti
  groupObjectTypes: Observable<ObjectTypeCounter[]> = this.textService
    .getUniqueMetadata('_doc__support__objectType')
    .pipe(
      catchError((err) =>
        iif(
          () => err,
          this.thereWasAnError(), // Gestisce l'errore, se presente
          of([]) // Ritorna un Observable di un array vuoto in caso di errore
        )
      ),
      takeUntil(this.destroy$), // Completa l'Observable quando destroy$ emette un valore
      map((objectTypes) =>
        objectTypes.map((obj: any) => ({
          objectType: obj.replace(/[\"\[\]]/g, ''),
        }))
      ) // Rimuove le virgolette dalle stringhe
    );

  // Observable che raggruppa i materiali
  groupMaterial: Observable<MaterialCounter[]> = this.textService
    .getUniqueMetadata('_doc__support__material')
    .pipe(
      catchError((err) =>
        iif(
          () => err,
          this.thereWasAnError(), // Gestisce l'errore, se presente
          of([]) // Ritorna un Observable di un array vuoto in caso di errore
        )
      ),
      takeUntil(this.destroy$), // Completa l'Observable quando destroy$ emette un valore
      map((materials) =>
        materials.map((mat: any) => ({ material: mat.replace(/[\"\[\]]/g, '') }))
      ) // Rimuove le virgolette dalle stringhe
    );

  // `searchLocations`: Definisce un Observable che emetterà array di qualsiasi tipo. Questo Observable è il risultato della pipeline definita sui dati provenienti da `this.autocomplete$`.
  searchLocations: Observable<any[]> = this.autocomplete$.pipe(
    // `debounceTime(1000)`: Attende 1 secondo dopo ogni emissione di valore dall'Observable `this.autocomplete$` prima di passarlo alla prossima operazione nella pipeline. Questo serve a limitare il numero di richieste effettuate durante la digitazione rapida dell'utente.
    debounceTime(1000),

    // `filter(...)`: Filtra gli eventi in modo che solo quelli con una `query` non vuota siano passati alla successiva operazione nella pipeline. Questo previene la ricerca di stringhe vuote.
    filter((autoCompleteEvent) => autoCompleteEvent.query != ''),

    // `withLatestFrom(this.textService.geoData)`: Combina l'ultimo valore emesso da `this.textService.geoData` con il valore corrente dall'Observable originale. `this.textService.geoData` dovrebbe contenere i dati geografici utilizzati per il filtraggio delle ricerche.
    withLatestFrom(this.textService.geoData),

    // `map(...)`: Trasforma gli array di dati emessi dall'operazione precedente. In questo caso, filtra `r`, che rappresenta i dati geografici, per includere solo gli elementi che corrispondono alla query di ricerca. `query.query` si riferisce al valore della query di ricerca attuale.
    map(([query, r]) => {
      return r.filter((item) => item.modernName.includes(query.query));
    })
  );

  getTextPaginationIndexReq$: BehaviorSubject<string> =
    new BehaviorSubject<string>('');

  getFileByIdReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');

  getTextContentReq$: BehaviorSubject<number> = new BehaviorSubject<number>(
    NaN
  );
  getInterpretativeReq$: BehaviorSubject<XmlAndId> =
    new BehaviorSubject<XmlAndId>({} as XmlAndId);
  getDiplomaticReq$: BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>(
    {} as XmlAndId
  );
  getTranslationReq$: BehaviorSubject<XmlAndId> = new BehaviorSubject<XmlAndId>(
    {} as XmlAndId
  );
  getAnnotationReq$: BehaviorSubject<number> = new BehaviorSubject<number>(NaN);
  getBibliographyReq$: BehaviorSubject<string> = new BehaviorSubject<string>(
    ''
  );
  getFacsimileReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getCommentaryReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getApparatusReq$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  getGetoDataFromFile$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  getInscriptionType$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  loadingInterpretative: boolean = false;
  loadingDiplomatic: boolean = false;
  loadingTranslation: boolean = false;
  loadingBibliography: boolean = false;
  loadingFacsimile: boolean = false;
  loadingCommentary: boolean = false;
  loadingApparatus: boolean = false;
  loadingPagination: boolean = false;

  displayModal: boolean = false;

  currentElementId: number = NaN;
  currentTokensList: TextToken[] | undefined;
  autopsyAuthors: Array<any> = [];
  seenAuthors: Array<any> = [];
  fileNotAvailable: boolean = false;

  @ViewChild('interpretativeText') interpretativeText!: ElementRef;
  @ViewChild('diplomaticText') diplomaticText!: ElementRef;
  @ViewChild('apparatusText') apparatusText!: ElementRef;
  @ViewChild('dynamicOverlay', { read: ViewContainerRef }) container:
    | ViewContainerRef
    | undefined;
  arrayDynamicComponents: Array<FormElement> = [];

  isBodyTextPartArray: boolean = false;
  isTraditionalIdArray: boolean = false;
  onlyTextCommentary: string[] = [];
  referencedCommentary: any[] = [];

  // Definisce un Observable che restituisce le informazioni (metadati) di un testo oppure null.
  getFileById: Observable<TextMetadata | null> = this.getFileByIdReq$.pipe(
    // Utilizza switchMap per trasformare l'id del file ricevuto in un nuovo Observable.
    // Se l'id del file esiste ed è una stringa non vuota, richiede il file tramite `this.textService.getFileByID`.
    // Altrimenti, restituisce un Observable che emette `null`.
    switchMap((fileId) =>
      fileId && fileId != '' ? this.textService.getFileByID(fileId) : of(null)
    ),
    // Utilizza tap per eseguire un'azione con il file ricevuto, senza modificare i dati trasmessi dall'Observable.
    tap((file) => {
      // Se il file è presente, esegue le seguenti operazioni:
      if (file) {
        console.log(file); // Stampa le informazioni del file.
        // Resetta vari stati e collezioni relativi ai commenti e ai dati del file.
        this.onlyTextCommentary = [];
        this.referencedCommentary = [];
        this.tempXml = null;
        // Resetta vari stati che indicano il tipo di testo.
        this.isVenetic = false;
        this.isOscan = false;
        this.isFaliscan = false;
        // Imposta vari stati su `true` per indicare che il caricamento dei dati è in corso.
        this.loadingCommentary = true;
        this.loadingInterpretative = true;
        this.loadingTranslation = true;
        this.loadingBibliography = true;
        this.loadingFacsimile = true;
        this.loadingApparatus = true;
        // Invia un segnale per indicare che i dati del file devono essere recuperati, prima con `null` per resettare lo stato e poi con il file effettivo.
        this.getGetoDataFromFile$.next(null);
        this.getGetoDataFromFile$.next(file);
        // Invia l'id dell'elemento per avviare il recupero del contenuto testuale.
        this.getTextContentReq$.next(file['element-id']);
        // Controlla se le parti del corpo del testo o gli ID tradizionali sono array, impostando di conseguenza le variabili booleane.
        this.isBodyTextPartArray = Array.isArray(file.bodytextpart);
        this.isTraditionalIdArray = Array.isArray(file.traditionalIDs);
      }
    })
  );

  code: string = '';

  isVenetic: boolean = false;
  isOscan: boolean = false;
  isFaliscan: boolean = false;
  // Definisce un Observable che emette il contenuto XML e l'ID associato
  getXMLContent: Observable<XmlAndId> = this.getTextContentReq$.pipe(
    // Prima operazione: controlla se l'ID elemento ricevuto non è NaN (Not a Number)
    // Se non è NaN, assegna l'ID a `currentElementId`
    tap((elementId) =>
      !isNaN(elementId) ? (this.currentElementId = elementId) : of()
    ),
    // Seconda operazione: se l'ID elemento non è NaN, richiede il contenuto testuale tramite `textService.getContent`
    // Altrimenti, emette un valore vuoto
    switchMap((elementId) =>
      !isNaN(elementId) ? this.textService.getContent(elementId) : of()
    ),
    // Terza operazione: gestisce la risposta del servizio di testo
    tap((res) => {
      // Controlla se il contenuto XML ricevuto non è vuoto
      if (res.xml != '') {
        // Se non è vuoto, assegna il contenuto XML a `code`
        this.code = res.xml;

        // Analizza il contenuto XML per identificare la lingua
        // Crea un nuovo DOMParser e cerca tutti i nodi 'language' nel contenuto XML
        let languageNodes = new DOMParser()
          .parseFromString(this.code, 'text/xml')
          .querySelectorAll('language');
        // Itera su ogni nodo 'language' e controlla l'attributo 'ident'
        // Se corrisponde a specifici identificatori, imposta le relative flag booleane
        languageNodes.forEach((el) => {
          if (el.getAttribute('ident') == 'xve') this.isVenetic = true;
          if (el.getAttribute('ident') == 'osc') this.isOscan = true;
          if (el.getAttribute('ident') == 'xfa') this.isFaliscan = true;
        });
        // Reimposta gli array per i componenti dinamici e le referenze esterne
        this.arrayDynamicComponents = [];
        this.externalReferences = [];
        // Emette il contenuto ricevuto verso vari Observable per ulteriori elaborazioni
        // Queste chiamate sono presumibilmente per ottenere informazioni aggiuntive come interpretazioni, diplomazie, traduzioni, bibliografie, facsimili, apparati critici, tipi di iscrizione e autori di autopsie.
        this.getInterpretativeReq$.next(res);
        this.getDiplomaticReq$.next(res);
        this.getTranslationReq$.next(res);
        this.getBibliographyReq$.next(res.xml);
        this.getFacsimileReq$.next(res.xml);
        this.getApparatusReq$.next(res.xml);
        this.getInscriptionType$.next(res.xml);
        // Richiama un metodo per ottenere gli autori delle autopsie basato sul contenuto XML
        this.getAutopsyAuthors(res.xml);
        // Imposta l'indice attivo della galleria a 0
        this.galleryActiveIndex = 0;
      }
    })
  );

  tempXml: any;
  // getInterpretativeContent: Observable che trasforma i dati di interpretativeReq$ attraverso una pipeline di operazioni
  getInterpretativeContent: Observable<string[]> =
    this.getInterpretativeReq$.pipe(
      // Filtra le richieste che hanno almeno una proprietà (ignora oggetti vuoti)
      filter((req) => Object.keys(req).length > 0),
      // Conserva il valore XML temporaneo della richiesta corrente per uso futuro
      tap((req) => (this.tempXml = req.xml)),
      // Trasforma la richiesta XML in un formato specifico tramite textService
      map((req) => this.textService.mapXmlRequest(req)),
      // Estrae i nodi figli TEI dalla richiesta trasformata
      map((req) => getTeiChildren(req)),
      // Ottiene dati interpretativi personalizzati basandosi sui nodi arrayNodes e gestisce eventuali errori
      switchMap((arrayNodes) =>
        this.textService
          .getCustomInterpretativeData(arrayNodes)
          .pipe(catchError((err) => this.thereWasAnError()))
      ),
      // Costruisce il contenuto interpretativo personalizzato combinando vari dati
      map((data) =>
        buildCustomInterpretative(
          this.renderer,
          data.teiNodes,
          data.leidenNodes,
          data.tokens
        )
      ),
      // Aggiorna vari flussi con i dati attuali e resetta tempXml a null
      tap((x) => {
        this.getAnnotationReq$.next(this.currentElementId);
        this.getCommentaryReq$.next(this.tempXml);
        this.tempXml = null;
      })
    );

  // getAnnotations: Observable per ottenere annotazioni basandosi su getAnnotationReq$
  getAnnotations: Observable<any> = this.getAnnotationReq$.pipe(
    // Filtra gli id elementi per escludere quelli non numerici
    filter((elementId) => !isNaN(elementId)),
    // Stampa in console l'id (utile per debugging)
    tap((id) => console.log(id)),
    // Ottiene l'annotazione per l'id specificato
    switchMap((id) => this.textService.getAnnotation(id)),
    // Controlla se ci sono risultati e procede di conseguenza
    switchMap((results) =>
      iif(
        () => results.length != 0,
        this.textService.getForms(results),
        this.stopRequest()
      )
    ),
    // Mappa i nodi con le forme e annotazioni ottenute
    tap((formsAndAnnotations) => this.mapNodes(formsAndAnnotations)),
    // Imposta loadingInterpretative a false, indicando il completamento del caricamento
    tap((x) => (this.loadingInterpretative = false))
  );

  // getDiplomaticContent: Observable per trasformare i dati di diplomaticReq$ in contenuto diplomatico
  getDiplomaticContent: Observable<string[]> = this.getDiplomaticReq$.pipe(
    // Filtra le richieste che hanno almeno una proprietà
    filter((req) => Object.keys(req).length > 0),
    // Mappa il XML grezzo in un formato specifico
    map((rawXml) => this.textService.mapXmlRequest(rawXml)),
    // Controlla se xml non è vuoto e ottiene il contenuto HTML, gestisce errori
    switchMap((req) =>
      req.xml != ''
        ? this.textService.getHTMLContent(req).pipe(
            catchError((error) => {
              console.error('An error occurred:', error);
              return of();
            })
          )
        : of()
    ),
    // Costruisce il builder diplomatico Leiden a partire dall'HTML ottenuto
    map((html) => leidenDiplomaticBuilder(html, this.isVenetic)),
    // Imposta loadingDiplomatic a false, indicando il completamento del caricamento
    tap((x) => {
      //console.log(x);
      this.loadingDiplomatic = false;
    })
  );

  // Definisce un Observable che rimane indefinito finché non riceve una richiesta di traduzione valida.
  getTranslation: Observable<any> | undefined = this.getTranslationReq$.pipe(
    filter((req) => Object.keys(req).length > 0), // Filtra le richieste per procedere solo se l'oggetto richiesta non è vuoto.
    //map(req => this.textService.mapXmlRequest(req)), // Mappa la richiesta per trasformarla da XML utilizzando un servizio dedicato (commentato).
    //switchMap(req => req.xml != '' ? this.textService.getHTMLTeiNodeContent({xmlString : req.xml}).pipe(catchError(err => this.thereWasAnError())) : of()), // Converte l'XML in HTML TEI, gestendo gli errori (commentato).
    map((res) => getTranslationByXml(res.xml)), // Mappa il risultato per ottenere la traduzione basata sull'XML fornito.
    tap((res) => (this.loadingTranslation = false)) // Imposta la variabile di stato della traduzione su false indicando che il caricamento è terminato.
  );

  // Definisce un Observable per ottenere informazioni bibliografiche.
  getBibliography: Observable<BibliographicElement[]> | undefined =
    this.getBibliographyReq$.pipe(
      filter((xml) => xml != ''), // Filtra le richieste per procedere solo se la stringa XML non è vuota.
      map((xml) => getBibliography(xml)), // Mappa l'XML per ottenere le informazioni bibliografiche.
      tap((biblio) => (this.loadingBibliography = false)) // Imposta la variabile di stato del caricamento bibliografico su false, indicando che il caricamento è terminato.
    );

  // Inizializza un array per tenere traccia dei riferimenti esterni.
  externalReferences: MenuItem[] = [];
  // Inizializza un contatore di riferimenti esterni come stringa vuota.
  externalReferencesCounter: string = '';

  // Definisce un Observable per ottenere un facsimile personalizzato.
  getCustomFacsimile: Observable<any> = this.getFacsimileReq$.pipe(
    filter((xml) => xml != ''), // Filtra le richieste per procedere solo se la stringa XML non è vuota.
    map((xml) => getCustomFacsimile(xml)) // Mappa l'XML per ottenere il facsimile personalizzato.
  );

  // Definisce un Observable per ottenere facsimile.
  getFacsimile: Observable<Graphic[] | null> = this.getFacsimileReq$.pipe(
    tap((xml) => (xml && xml != '' ? xml : of(null))), // Controlla se la stringa XML è valida; altrimenti, ritorna null.
    filter((xml) => xml != ''), // Filtra le richieste per procedere solo se la stringa XML non è vuota.
    map((xml) => getFacsimile(xml)), // Mappa l'XML per ottenere i facsimile.
    tap((facsimile) => {
      if (facsimile) {
        facsimile.forEach((fac) => {
          if (fac.isPdf || fac.isExternalRef) {
            // Per ogni facsimile che è un PDF o un riferimento esterno,
            let item = {
              // crea un oggetto MenuItem.
              label:
                fac.description.length > 50
                  ? fac.description.substring(0, 50) + '...'
                  : fac.description, // Tronca la descrizione se è troppo lunga.
              url: fac.url, // Imposta l'URL.
            };
            this.externalReferences.push(item); // Aggiunge l'oggetto all'array di riferimenti esterni.
          }
        });
      }
      this.externalReferencesCounter =
        this.externalReferences.length.toString(); // Aggiorna il contatore dei riferimenti esterni.
      this.loadingFacsimile = false; // Imposta la variabile di stato del caricamento dei facsimile su false.
    })
  );

  // Dichiarazione di `getCommentary` come un Observable di un array di stringhe.
  // `getCommentaryReq$` è un altro Observable che emette valori xml.
  getCommentary: Observable<Array<string>> = this.getCommentaryReq$.pipe(
    // Filtra gli xml che non sono stringhe vuote.
    filter((xml) => xml != ''),
    // Trasforma l'xml in un formato commentato utilizzando `getCommentaryXml`.
    map((xml) => getCommentaryXml(xml, this.renderer)),
    // Ritarda l'emissione del valore di 500ms.
    delay(500),
    // Effettua operazioni laterali sui valori emessi senza modificarli.
    tap((output: any) => {
      // Controlla se `output` ha una proprietà `onlyText` con contenuto.
      if (output.onlyText && output.onlyText.length > 0) {
        let tmp = [];

        // Se esiste `onlyText`, lo scorre e aggiunge ogni elemento a `tmp`.
        if (output.onlyText) {
          output.onlyText.forEach((element: any) => {
            tmp.push(element);
          });
        }

        // Se esiste `referenced`, itera sulle chiavi di `output.referenced`.
        if (output.referenced) {
          for (const key in output.referenced) {
            // Estrae `outerHTML` di ogni elemento e lo aggiunge a `tmp`.
            let innerHTMLs = output.referenced[key].map(
              (elemento: Element) => elemento.outerHTML
            );
            tmp.push(...innerHTMLs); // Aggiunta con l'operatore spread.
          }
        }

        // Assegna l'array risultante a `this.onlyTextCommentary`.
        this.onlyTextCommentary = tmp;
      }
      // Se `output.referenced` esiste ed ha chiavi, chiama `mapCommentaryNodes`.
      if (output.referenced && Object.keys(output.referenced).length > 0) {
        this.mapCommentaryNodes(output.referenced);
      }

      // Imposta `loadingCommentary` a false, indicando il termine del caricamento.
      this.loadingCommentary = false;
    })
  );

  // Dichiarazione di `getApparatus` come un Observable di un array di stringhe.
  // Processa `getApparatusReq$` filtrando gli xml non vuoti e mappandoli con `getApparatus`.
  getApparatus: Observable<Array<string>> = this.getApparatusReq$.pipe(
    filter((xml) => xml != ''),
    map((xml) => getApparatus(xml, this.renderer)),
    // Alla fine dell'elaborazione, imposta `loadingApparatus` a false.
    tap((xml) => (this.loadingApparatus = false))
  );

  // Dichiarazione di `getInscriptionType` come un Observable di qualsiasi tipo.
  // Processa `getApparatusReq$` filtrando gli xml non vuoti e mappandoli con `getInscriptionType`.
  getInscriptionType: Observable<any> = this.getApparatusReq$.pipe(
    filter((xml) => xml != ''),
    map((xml) => getInscriptionType(xml)),
    // Alla fine dell'elaborazione, imposta `loadingApparatus` a false.
    tap((xml) => (this.loadingApparatus = false))
  );

  // Imposta la variabile per tenere traccia dello stato di caricamento delle mappe
  mapsLoading: boolean = false;

  // Crea un observable per ottenere i dati di Geolocation da un file ID
  getGetoDataFromFileId: Observable<any> = this.getGetoDataFromFile$.pipe(
    // Imposta mapsLoading su true all'inizio dell'operazione per indicare che il caricamento è in corso
    tap((x) => (this.mapsLoading = true)),

    // Ritarda l'esecuzione di 1 secondo per simulare il tempo di caricamento o per altri motivi di timing
    delay(1000),

    // Inizializza la mappa una volta che il dato è pronto
    tap((x) => this.initializeMap()),

    // Utilizza switchMap per trasformare l'Observable in un altro Observable in base al file fornito
    switchMap((file) => {
      // Controlla se il file non è null
      if (file != null) {
        // Ottiene la posizione da mapsService usando il luogo originale del file
        return this.mapsService.getSingleLocation(file.originalPlace).pipe(
          // Annulla la sottoscrizione in caso di distruzione dell'Observable per prevenire perdite di memoria
          takeUntil(this.destroy$),

          // Ritarda ulteriori operazioni di 3 secondi per gestire il debounce
          debounceTime(3000),

          // Gestisce gli errori catturandoli e eseguendo thereWasAnError in caso di errore
          catchError((err) => {
            this.thereWasAnError();
            // Restituisce un Observable di null in caso di errore
            return of(null);
          })
        );
      } else {
        // Restituisce un Observable di null se il file è null
        return of(null);
      }
    }),

    // Ritarda l'operazione di 3 secondi dopo aver ottenuto la posizione
    delay(3000),

    // Disegna la mappa per la singola posizione ottenuta
    tap((res) => this.drawSingleMap(res))
  );

  activeIndex: number = 0;

  searchForm: FormGroup = new FormGroup({
    word: new FormControl(null),
    title: new FormControl(null),
    id: new FormControl(null),
    otherId: new FormControl(null),
    language: new FormControl(null),
    dateOfOriginNotBefore: new FormControl(null),
    dateOfOriginNotAfter: new FormControl(null),
    ancientName: new FormControl(null),
    inscriptionType: new FormControl(null),
    objectType: new FormControl(null),
    material: new FormControl(null),
    alphabet: new FormControl(null),
  });

  constructor(
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private textService: TextsService,
    private mapsService: MapsService,
    private ngZone: NgZone,
    private popupService: PopupService,
    private renderer: Renderer2,
    private http: HttpClient,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event) {
          this.fileNotAvailable = false;
          const keys = Object.keys(event);
          const values = Object.values(event);

          if (keys) {
            for (const [key, value] of Object.entries(event)) {
              if (
                !this.allowedOperators.includes(key) ||
                event[key] == '' ||
                (Array.isArray(event[key]) && Array.from(event[key]).length > 1)
              ) {
                return;
              }
            }
          }
          if (keys.length > 1) {
            this.showSpinner = true;
            this.textService.restoredTypeSearch();
            this.textService.restoredLocationSearch();
            this.pagination({} as Paginator, keys[1], values[1]);
          }
          if (keys[0] == 'file') {
            let fileId = values[0];
            this.getFileByIdReq$.next(fileId);
          } else {
            if (this.singleMap) {
              //this.loadingFacsimile=true;
              this.singleMap.off();
              this.singleMap?.remove();
              this.isMapInitialized = false;

              this.loadingFacsimile = true;
              this.getFileByIdReq$.next('');
              this.getFacsimileReq$.next('');
            }
          }
        }
      });

    // Impostazioni di base per la mappa Leaflet
    this.leafletMapOptions = {
      layers: [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 15, // Zoom massimo consentito
          minZoom: 5, // Zoom minimo consentito
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', // Diritto d'autore
        }),
      ],
      zoom: 7, // Livello di zoom iniziale
      center: [42.296818, 12.254809], // Coordinata centrale iniziale (latitudine, longitudine)
    };

    // Sottoscrizione ai cambiamenti del form di ricerca
    this.searchForm.valueChanges
      .pipe(
        takeUntil(this.destroy$), // Prendi i valori finché `destroy$` non emette un valore
        delay(100), // Ritarda l'emissione di ogni valore di 100ms
        debounceTime(1000)
      )
      .subscribe(
        // Attendi 1000ms dopo l'ultimo valore emesso prima di procedere
        (data) => {
          const queryParams = new URLSearchParams(window.location.search); // Preleva i parametri query dall'URL
          // Se il form è stato toccato e non c'è il parametro 'file', costruisce la query di testo
          if (this.searchForm.touched && queryParams.get('file') == null) {
            this.buildTextQuery(data);
          }
        }
      );
  }

  // Funzione chiamata quando si cambia la tab
  onChangeTabView(event: any) {
    this.activeIndex = event.index; // Imposta l'indice della tab attiva
  }

  // Variabile per verificare se la mappa è stata inizializzata
  isMapInitialized = false;

  // Funzione per inizializzare la mappa
  initializeMap() {
    if (!this.isMapInitialized) {
      // Se la mappa non è ancora stata inizializzata
      // Inizializza la mappa qui
      this.singleMap = L.map('singleMap').setView([42.296818, 12.254809], 13); // Crea la mappa e imposta il centro e lo zoom iniziale
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(
        this.singleMap
      ); // Aggiunge il layer di OpenStreetMap alla mappa
      this.isMapInitialized = true; // Imposta la mappa come inizializzata
    }
  }

  drawSingleMap(geoData: GlobalGeoDataModel) {
    // Prima, assicurati che la mappa sia inizializzata

    // Poi, procedi con l'aggiunta del cerchio
    if (geoData) {
      // Se esiste già un cerchio sulla mappa, rimuovilo
      if (
        this.singleCircle &&
        this.singleMap &&
        this.singleMap.hasLayer(this.singleCircle)
      ) {
        this.singleMap.removeLayer(this.singleCircle);
      }

      // Crea un nuovo cerchio sulla mappa usando le coordinate geografiche fornite
      this.singleCircle = L.circle(
        [geoData.reprPoint.latitude, geoData.reprPoint.longitude],
        { radius: 500 }
      );

      // Se la mappa e il cerchio sono presenti, aggiungi il cerchio alla mappa e centra la vista su di esso
      if (this.singleMap && this.singleCircle) {
        this.singleMap.addLayer(this.singleCircle);
        this.singleMap.panTo([
          geoData.reprPoint.latitude,
          geoData.reprPoint.longitude,
        ]);

        // Imposta il caricamento della mappa su falso, indicando che il processo è completo
        this.mapsLoading = false;
      }
    }
  }

  getChar(i: number): string {
    // Restituisce un carattere dall'alfabeto basato sull'indice numerico fornito (es. 0 = 'a', 1 = 'b', ...)
    return String.fromCharCode(97 + i);
  }

  // Definisce la funzione per costruire una query di testo basata sui dati del form, con parametri opzionali per la paginazione
  buildTextQuery(formData: any, f?: number, r?: number) {
    this.somethingWrong = false; // Inizializza lo stato di errore come falso
    this.showSpinner = true; // Mostra lo spinner di caricamento

    // Naviga mantenendo i parametri di query esistenti e aggiungendo 'filter=search'
    this.route.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { filter: 'search' },
      queryParamsHandling: 'merge',
    });

    let queryParts: string[] = []; // Inizializza un array per i componenti della query

    // Aggiunge un filtro di default che sarà sempre incluso nella query
    queryParts.push(`_doc.itAnt_ID=".*"`);

    // Aggiunge parti della query in base alla presenza di valori nel formData
    if (formData.word) {
      queryParts.push(` word="${formData.word}.*"`);
    }

    if (formData.title) {
      queryParts.push(` _doc.inscriptionTitle="${formData.title}.*"`);
    }

    if (formData.id) {
      queryParts.push(`_doc.itAnt_ID="${formData.id}.*"`);
    }

    if (formData.otherId) {
      queryParts.push(
        ` (_doc.traditionalIDs.traditionalID=".*${formData.otherId}.*"  |  _doc.trismegistos.trismegistosID=".*${formData.otherId}.*")`
      );
    }

    if (formData.dateOfOriginNotBefore) {
      queryParts.push(
        `_doc.dateOfOriginNotBefore >="${formData.dateOfOriginNotBefore}"`
      );
    }

    if (formData.dateOfOriginNotAfter) {
      queryParts.push(
        `_doc.dateOfOriginNotAfter <="${formData.dateOfOriginNotAfter}"`
      );
    }

    if (formData.ancientName) {
      queryParts.push(
        `_doc.originalPlace.modernNameUrl=="${formData.ancientName}"`
      );
    }

    if (formData.language) {
      queryParts.push(`_doc.language.ident=="${formData.language}"`);
    }

    if (formData.inscriptionType) {
      queryParts.push(`_doc.inscriptionType=="${formData.inscriptionType}"`);
    }

    if (formData.objectType) {
      queryParts.push(`_doc.support.objectType=="${formData.objectType}"`);
    }

    if (formData.material) {
      queryParts.push(`_doc.support.material=="${formData.material}"`);
    }

    if (formData.alphabet) {
      queryParts.push(`_doc.writingSystem.type=="${formData.alphabet}"`);
    }

    // Combina tutti i componenti della query in una stringa unica
    const query = queryParts.length > 0 ? `[${queryParts.join(' &')}]` : '';
    console.log(query); // Stampa la query sulla console

    // Se non sono specificati parametri di paginazione, imposta valori di default
    if (!r && !f) {
      this.first = 0;
      this.rows = 8;
    }

    // Verifica se la query è valida e diversa da quella di default
    if (query != '' && query != '[_doc.itAnt_ID=".*"]') {
      // Ottiene gli elementi di paginazione tramite il servizio textService, gestisce eventuali errori
      this.paginationItems = this.textService
        .filterAttestations(query, f ? f : this.first, r ? r : this.rows)
        .pipe(
          catchError((error) => {
            console.error('An error occurred:', error); // Stampa l'errore sulla console
            if (error.status != 200) this.thereWasAnError(); // Gestisce stati di errore diversi da 200
            return of([]); // Ritorna un Observable vuoto in caso di errore
          }),
          tap((x) => (this.showSpinner = false)) // Ferma lo spinner al termine del caricamento
        );
      this.totalRecords = this.textService.countFiles(query); // Calcola il numero totale di record
    } else {
      this.textService.restoreFilterAttestations(); // Ripristina i filtri di attestazione
      this.getAllData(this.first, this.rows); // Richiede tutti i dati con paginazione
    }
  }

  // Metodo per azzerare la data "dateOfOriginNotAfter" nel form di ricerca.
  clearDates() {
    this.searchForm
      .get('dateOfOriginNotAfter')
      ?.setValue(null, { emitEvent: true });
  }

  // Metodo per azzerare la località "ancientName" nel form di ricerca.
  clearLocation() {
    this.searchForm.get('ancientName')?.setValue(null, { emitEvent: true });
  }

  // Gestisce il filtro di autocompletamento, impostando il valore di 'ancientName' con 'modernUri' se 'modernName' non è vuoto.
  handleAutocompleteFilter(evt: any) {
    // Marca tutti i campi del form come "touched" (toccati/interagiti).
    this.searchForm.markAllAsTouched();

    // Se 'modernName' non è una stringa vuota, imposta 'ancientName' con 'modernUri'.
    if (evt.modernName != '') {
      this.searchForm
        .get('ancientName')
        ?.setValue(evt.modernUri, { emitEvent: false });
    }

    // Aggiorna il valore e la validità del form.
    this.searchForm.updateValueAndValidity({
      onlySelf: false,
      emitEvent: true,
    });
  }

  // Marca tutti i campi del form come "touched" (toccati/interagiti).
  markAsTouched() {
    this.searchForm.markAllAsTouched();
  }

  // Resetta tutti i campi del form di ricerca, reimposta il contatore dei risultati e richiama il metodo per ottenere tutti i dati.
  resetFields() {
    this.searchForm.reset();
    this.first = 0;
    this.rows = 6;
    this.getAllData();
  }

  // Variabili per gestire il trascinamento e ridimensionamento di un elemento.
  isDragging = false;
  startY = 0;
  startHeight = 0;

  // Inizia il trascinamento quando si preme il mouse su un bordo specifico dell'elemento.
  onMouseDown(event: MouseEvent) {
    const div = document.querySelector('.resizer') as HTMLElement;
    if (!div) return;

    // Verifica se si è cliccato sul bordo inferiore.
    if (event.offsetY > 45) {
      this.isDragging = true;
      this.startY = event.clientY;
      this.startHeight = div.clientHeight;

      // Aggiunge gli event listener per mousemove e mouseup direttamente al documento.
      document.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  // Gestisce il movimento del mouse durante il trascinamento, aggiornando l'altezza dell'elemento.
  onMouseMove(event: MouseEvent) {
    const div = document.querySelector('.resizer') as HTMLElement;
    if (!div || !this.isDragging) return;

    const diff = event.clientY - this.startY;
    div.style.height = `${this.startHeight + diff}px`;
  }

  // Termina il trascinamento rimuovendo gli event listener da document.
  onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;

      // Rimuove gli event listener per mousemove e mouseup dal documento.
      document.removeEventListener('mousemove', this.onMouseMove.bind(this));
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  // Definisce un metodo per interrompere una richiesta, impostando il caricamento interpretativo su false e restituendo EMPTY.
  stopRequest() {
    this.loadingInterpretative = false;
    return EMPTY;
  }

  // Metodo chiamato alla distruzione del componente, che segnala la conclusione dell'osservabile e ne completa il flusso.
  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  // Ottiene tutti i dati applicando una paginazione, mostra lo spinner di caricamento e gestisce i casi in cui i parametri sono forniti o meno.
  getAllData(f?: number, r?: number): void {
    this.showSpinner = true; // Mostra lo spinner di caricamento
    let rows = 0;
    if (f && r) {
      this.first = f;
      rows = r;
    } // Imposta i parametri di paginazione se forniti
    if (!f && !r) {
      this.first = 0;
      this.rows = 8;
    } // Imposta valori predefiniti per la paginazione se i parametri non sono forniti

    // Imposta gli elementi di paginazione ottenuti dal servizio e gestisce lo spinner
    this.paginationItems = this.textService
      .paginationItems(this.first, this.rows)
      .pipe(
        tap((x) => (this.showSpinner = false)), // Nasconde lo spinner dopo il caricamento
        shareReplay()
      );

    // Ottiene il totale dei record disponibili
    this.totalRecords = this.textService.countFiles();
  }

  // Naviga verso l'URL predefinito
  goToDefaultUrl() {
    this.route.navigate(['/texts'], { queryParams: { filter: 'all' } });
  }

  // Filtra i dati per secolo, gestendo casi con o senza parametri di paginazione specificati.
  filterByDate(century: number, f?: number, r?: number): void {
    if (century) {
      if (!f && !r) {
        this.first = 0;
        this.rows = 8;
        this.paginationItems = this.textService
          .filterByDate(century)
          .pipe(map((text) => text.slice(this.first, this.rows)));
      }
      if (f || r) {
        this.paginationItems = this.textService
          .filterByDate(century)
          .pipe(map((text) => text.slice(f, r)));
      }

      // Calcola il numero totale di record filtrati per secolo
      this.totalRecords = this.textService.countFiles(
        `[_doc.itAnt_ID=".*" & _doc.dateOfOriginNotBefore=="${century}" & _doc.dateOfOriginNotAfter=="${
          century + 100
        }"]`
      );
      this.showSpinner = false;
    } else {
      this.getAllData(f, r);
    }
  }

  // Filtra i dati in base alla località, gestendo diversi casi in base ai parametri forniti o alla presenza di ricerche salvate.
  filterByLocation(locationId: string, f?: number, r?: number): void {
    if (
      this.textService.getSavedSearchLocation() &&
      this.textService.getSavedSearchLocation().length > 0
    ) {
      if (f && r && f >= r) {
        r = f + r; // Ajusta el rango si f es mayor o igual que r
      }

      this.paginationItems = of(
        this.textService.getSavedSearchLocation().slice(f, r)
      );
    } else {
      if (locationId) {
        if (!f && !r) {
          this.first = 0;
          this.rows = 8;
          this.paginationItems = this.textService
            .filterByLocation(locationId)
            .pipe(tap((x) => (this.showSpinner = false)));
        }
        if (f || r) {
          this.paginationItems = this.textService
            .filterByLocation(locationId)
            .pipe(map((text) => text.slice(f, r)));
        }

        this.showSpinner = false;
        this.totalRecords = this.textService
          .filterByLocation(locationId)
          .pipe(map((texts) => texts.length || 0));
      } else {
        this.getAllData(f, r);
      }
    }
  }

  // Definisce il metodo filterByType che accetta un tipo (string), e due parametri opzionali f (inizio) e r (fine) per la paginazione
  filterByType(type: string, f?: number, r?: number): void {
    // Controlla se ci sono ricerche salvate di un determinato tipo e se la loro lunghezza è maggiore di 0
    if (
      this.textService.getTypeSavedSearch() &&
      this.textService.getTypeSavedSearch().length > 0
    ) {
      // Se sia f che r sono definiti e f è maggiore o uguale a r, calcola il nuovo valore di r sommando f a r
      if (f && r && f >= r) {
        r = f + r;
      }
      // Imposta showSpinner a false per nascondere lo spinner di caricamento
      this.showSpinner = false;
      // Imposta paginationItems a un Observable contenente i dati filtrati da f a r
      this.paginationItems = of(
        this.textService.getTypeSavedSearch().slice(f, r)
      );
    } else {
      // Se non ci sono ricerche salvate di un determinato tipo, controlla se il tipo è stato fornito
      if (type) {
        // Se f e r non sono definiti, imposta i valori di default per la paginazione e filtra i dati per tipo
        if (!f && !r) {
          this.first = 0;
          this.rows = 8;
          this.paginationItems = this.textService
            .filterByType(type)
            .pipe(tap((x) => (this.showSpinner = false)));
        }
        // Se f o r sono definiti, imposta paginationItems a un Observable contenente i dati filtrati da f a r
        if (f || r) {
          this.paginationItems = this.textService
            .filterByType(type)
            .pipe(map((text) => text.slice(f, r)));
        }

        // Imposta showSpinner a false per nascondere lo spinner di caricamento
        this.showSpinner = false;
        // Imposta totalRecords al numero totale di record filtrati per tipo
        this.totalRecords = this.textService
          .filterByType(type)
          .pipe(map((texts) => texts.length || 0));
      } else {
        // Se il tipo non è stato fornito, richiama getAllData per ottenere tutti i dati, eventualmente paginati
        this.getAllData(f, r);
      }
    }
  }

  galleryActiveIndex = 0;
  displayCustom: boolean = false;
  private buttonElement: HTMLElement | null = null;

  // Metodo per gestire il click su un'immagine all'interno di una galleria.
  imageClick(index: Graphic) {
    // Imposta l'indice attivo nella galleria in base all'indice dell'immagine cliccata.
    this.galleryActiveIndex = index.index;

    // Imposta un ritardo di 500 millisecondi prima di eseguire il codice all'interno della funzione.
    setTimeout(() => {
      // Seleziona l'elemento del bottone di chiusura della galleria.
      this.buttonElement = document.querySelector(
        '.p-ripple.p-element.p-galleria-close'
      );
      // Se l'elemento del bottone esiste, gli aggiunge un gestore per l'evento click che chiuderà la galleria.
      if (this.buttonElement) {
        this.buttonElement.addEventListener(
          'click',
          this.closeGallery.bind(this)
        );
      }
    }, 500);
  }

  // Metodo per chiudere la galleria.
  closeGallery(item: any) {
    // Imposta la variabile per nascondere la galleria a false.
    this.displayCustom = false;
  }

  // Metodo per gestire la paginazione.
  pagination(event: Paginator, ...args: any[]) {
    // Mostra lo spinner di caricamento.
    this.showSpinner = true;
    // Inizializza una richiesta per ottenere il contenuto del testo.
    this.getTextContentReq$.next(NaN);
    // Imposta i valori di 'first' e 'rows' basandosi sull'evento, se non è vuoto.
    if (Object.keys(event).length != 0) {
      this.first = event.first;
      this.rows = event.rows;
    }
    // Se l'evento è vuoto, imposta i valori predefiniti per 'first' e 'rows'.
    if (Object.keys(event).length == 0) {
      this.first = 0;
      this.rows = 8;
    }

    // Filtra gli argomenti per rimuovere i valori nulli.
    if (args.length > 0) {
      args = args.filter((query) => query != null);
    }
    // Se non ci sono argomenti aggiuntivi, recupera tutti i dati.
    if (args.length == 0) {
      this.getAllData(this.first, this.rows);
    }
    // Se c'è un argomento e questo è 'search', costruisce una query di testo.
    if (args.length == 1) {
      if (args[0] == 'search') {
        this.buildTextQuery(this.searchForm.value, this.first, this.rows);
      } else {
        this.getAllData(this.first, this.rows);
      }
    }
    // Se ci sono più argomenti, applica filtri specifici ai dati in base al primo argomento.
    if (args.length > 1) {
      let filter = args[0];
      let value = !isNaN(parseInt(args[1])) ? parseInt(args[1]) : args[1];

      switch (filter) {
        case 'all':
          this.getAllData(this.first, this.rows);
          break;
        case 'date':
          this.filterByDate(value, this.first, this.rows);
          break;
        case 'place':
          this.filterByLocation(value, this.first, this.rows);
          break;
        case 'location':
          this.filterByLocation(value, this.first, this.rows);
          break;
        case 'type':
          this.filterByType(value, this.first, this.rows);
          break;
      }
      return;
    }
  }

  // Stream di dati geografici, ogni volta che riceve nuovi dati, disegna una mappa.
  geoData = this.textService.geoData.pipe(tap((x) => this.drawMap(x)));

  // Definisce una funzione per disegnare una mappa basata sui dati geografici globali forniti.
  drawMap(geoData: GlobalGeoDataModel[]): void {
    // Itera su ciascun elemento di dati geografici fornito.
    geoData.forEach((geoPlaceData) => {
      // Imposta il raggio di base e i metri per attestazione.
      const RADIUS = 2000;
      const METERS_PER_ATT = 10;

      // Calcola il numero totale di attestazioni per la località geografica corrente.
      const attestationsCount = geoPlaceData.attestations.files.length;

      // Calcola il raggio del marcatore circolare in base al numero di attestazioni.
      let radius = RADIUS + attestationsCount * METERS_PER_ATT;
      // Crea un marcatore circolare sulla mappa per la località geografica corrente.
      // Gestisce gli eventi di click e mouseover sul marcatore.
      let circleMarker = circle(
        [geoPlaceData.reprPoint.latitude, geoPlaceData.reprPoint.longitude],
        { radius: radius }
      ).on('click mouseover', (event) => {
        console.log(event);
        let eventType = event.type;
        // Se l'evento è un mouseover, mostra un popup con informazioni dettagliate.
        if (eventType == 'mouseover') {
          circleMarker
            .bindPopup(this.popupService.showGeoPopup(geoPlaceData))
            .openPopup();
        }
        // Se l'evento è un click, naviga verso una pagina specifica con filtri basati sulla località.
        if (eventType == 'click') {
          this.ngZone.run(() => {
            this.route.navigate(['/texts'], {
              queryParams: {
                filter: 'location',
                place: geoPlaceData.modernId,
              },
            });
          });
        }
      });
      // Aggiunge il marcatore circolare all'elenco dei layer da visualizzare sulla mappa.
      this.layers.push(circleMarker);
    });
  }

  // Definisce una funzione per mostrare o nascondere i restauri interpretativi nel testo.
  showHideRestorations() {
    // Raccoglie tutti gli elementi HTML con classe 'gap' dentro 'interpretativeText'.
    let interpretativeDiv: Array<HTMLElement> = Array.from(
      this.interpretativeText.nativeElement.getElementsByClassName('gap')
    );

    // Itera su ciascun elemento, alternando la loro opacità per mostrare o nascondere.
    interpretativeDiv.forEach((element) => {
      if (element.style.opacity == '0') {
        element.setAttribute('style', 'opacity: 1');
      } else {
        element.setAttribute('style', 'opacity: 0');
      }
    });

    // Verifica l'esistenza di 'diplomaticText' e applica lo stesso comportamento degli elementi 'gap'.
    if (this.diplomaticText && this.diplomaticText.nativeElement) {
      let diplomaticDiv: Array<HTMLElement> = Array.from(
        this.diplomaticText.nativeElement.getElementsByClassName('gap')
      );

      diplomaticDiv.forEach((element) => {
        if (element.style.opacity == '0') {
          element.setAttribute('style', 'opacity: 1');
        } else {
          element.setAttribute('style', 'opacity: 0');
        }
      });
    }
  }

  // Definisce un metodo che gestisce le situazioni di errore
  thereWasAnError() {
    // Imposta una proprietà per indicare che qualcosa è andato storto (commentato)
    return EMPTY; // Restituisce un valore vuoto
  }

  // Carica un pannello overlay dinamico basato su un evento
  loadOverlayPanel(evt: any) {
    console.log(evt.target); // Stampa l'elemento che ha generato l'evento
    let formId = evt.target.attributes.formid.nodeValue; // Recupera l'ID del form dall'elemento che ha scatenato l'evento
    this.container?.clear(); // Pulisce il contenitore se esiste

    let formData = null; // Inizializza la variabile formData come null

    // Itera su un array di componenti dinamici per trovare quello corrispondente all'ID del form
    this.arrayDynamicComponents.forEach((element) => {
      if (element.form == formId) {
        formData = element; // Assegna il componente trovato a formData
      }
    });

    // Crea un componente dinamico nel contenitore, se questo esiste
    const componentRef: ComponentRef<DynamicOverlayComponent> | undefined =
      this.container?.createComponent(DynamicOverlayComponent);
    // Imposta l'etichetta del componente appena creato con l'ID del form
    (<DynamicOverlayComponent>componentRef?.instance).label = formId;
    if (formData != undefined) {
      // Se è stato trovato un componente corrispondente, ne assegna i dati al componente dinamico
      (<DynamicOverlayComponent>componentRef?.instance).formData = formData;
    }
    // Attiva il pannello overlay per l'evento corrente
    (<DynamicOverlayComponent>componentRef?.instance).toggleOverlayPanel(evt);
  }

  // Mostra un modal
  showModal() {
    this.displayModal = true; // Imposta la proprietà per mostrare il modal
  }

  // Nasconde un modal
  hideModal() {
    this.displayModal = false; // Imposta la proprietà per nascondere il modal
  }

  // Evidenzia un nodo basato su un evento
  highlightNode(evt: any) {
    // Stampa l'evento (commentato)

    if (evt) {
      let xmlid = evt.data; // Recupera l'ID XML dall'evento

      // Seleziona tutti gli elementi span con l'ID XML specificato che non hanno la classe .spanReference
      let nodes = document.querySelectorAll(
        `span[xmlid="${evt.data}"]:not(.spanReference)`
      );

      // Aggiunge la classe 'highlight' a ogni span trovato
      nodes.forEach((span) => {
        span.classList.add('highlight');
      });
    }
  }

  // Disattiva l'evidenziazione di un nodo basato su un evento
  deactivateNode(evt: any) {
    // Stampa l'evento (commentato)

    if (evt) {
      let xmlid = evt.data; // Recupera l'ID XML dall'evento

      // Seleziona tutti gli elementi span con l'ID XML specificato che non hanno la classe .spanReference
      let nodes = document.querySelectorAll(
        `span[xmlid="${evt.data}"]:not(.spanReference)`
      );

      // Rimuove la classe 'highlight' da ogni span trovato
      nodes.forEach((span) => {
        span.classList.remove('highlight');
      });
    }
  }

  // Funzione per caricare i dati dei commenti
  loadCommentaryData(evt: any) {
    let data = evt.data; // Memorizza i dati ricevuti dall'evento in una variabile

    this.referencedCommentary = []; // Inizializza l'array dei commenti riferiti
    console.log(evt); // Stampa l'evento nella console
    if (data) {
      // Se ci sono dati
      data.forEach((element: Element) => {
        // Itera ogni elemento dei dati
        this.referencedCommentary.push(element.outerHTML); // Aggiunge l'HTML esterno di ogni elemento all'array dei commenti riferiti
      });
    }

    // Imposta un timeout per ritardare l'esecuzione del codice seguente
    setTimeout(() => {
      console.log(data); // Stampa i dati nella console
      data.forEach((element: Element) => {
        // Itera ogni elemento dei dati
        let spans = element.querySelectorAll(`[xmlid]`); // Trova tutti gli span con attributo 'xmlid' nell'elemento
        if (spans.length > 0) {
          // Se ci sono span trovati
          spans.forEach((subSpan: Element) => {
            // Itera ogni span trovato
            let xmlid = subSpan.getAttribute('xmlid'); // Ottiene l'attributo 'xmlid' del sotto-span

            let nodes = document.querySelectorAll(
              `.spanReference[xmlid="${xmlid}"]`
            ); // Trova tutti i nodi nel documento che corrispondono all'xmlid

            nodes.forEach((domElement) => {
              // Itera ogni nodo trovato
              // Aggiunge un gestore per l'evento mouseenter che evidenzia il nodo
              domElement.addEventListener('mouseenter', (event) => {
                this.highlightNode({
                  evt: this,
                  data: xmlid,
                  clickEvent: event,
                });
              });

              // Aggiunge un gestore per l'evento mouseleave che disattiva l'evidenziazione del nodo
              domElement.addEventListener('mouseleave', (event) => {
                this.deactivateNode({
                  evt: this,
                  data: xmlid,
                  clickEvent: event,
                });
              });
            });
          });
        }
      });
    }, 100); // Ritardo di 100 millisecondi
  }

  // Funzione per mappare i nodi
  mapNodes(data: any[] | unknown) {
    if (Array.isArray(data)) {
      // Controlla se i dati sono un array

      let nodes = document.querySelectorAll('[tokenid]'); // Trova tutti i nodi con attributo 'tokenid'

      if (nodes.length > 0) {
        // Se ci sono nodi trovati
        nodes.forEach((node) => {
          // Itera ogni nodo trovato
          let tokenid = node.getAttribute('tokenid'); // Ottiene l'attributo 'tokenid' del nodo

          data.forEach((element) => {
            // Itera ogni elemento dell'array di dati
            let annotation = element.annotation; // Estrae l'annotazione dall'elemento
            let lexicalEntry = annotation.attributes.lexicalEntry; // Estrae l'entrata lessicale dall'annotazione
            let formid = annotation.value; // Estrae il formid dall'annotazione

            if (annotation.attributes.node_id == tokenid) {
              // Se l'id del nodo corrisponde

              node.setAttribute('lexicalentry', lexicalEntry); // Imposta l'entrata lessicale come attributo del nodo
              node.setAttribute('formid', formid); // Imposta il formid come attributo del nodo
              node.classList.add('notation'); // Aggiunge la classe 'notation' al nodo
              // Aggiunge un gestore per l'evento click che carica il pannello sovrapposto
              node.addEventListener('click', this.loadOverlayPanel.bind(this));
              this.arrayDynamicComponents.push(element.form); // Aggiunge il form dell'elemento all'array dei componenti dinamici
            }
          });
        });
      }
    }
  }

  // Definisce la funzione getAutopsyAuthors che prende una stringa XML grezza come input.
  getAutopsyAuthors(rawXml: string) {
    // Inizializza l'array autopsyAuthors vuoto, per memorizzare gli autori delle autopsie.
    this.autopsyAuthors = [];
    // Inizializza l'array seenAuthors vuoto, per memorizzare gli autori osservati.
    this.seenAuthors = [];

    // Utilizza DOMParser per analizzare la stringa XML in ingresso e creare un documento XML.
    let nodes = new DOMParser().parseFromString(rawXml, 'text/xml');
    // Seleziona tutti i nodi che hanno l'attributo 'type' uguale a 'observed' dall'elemento 'provenance'.
    let autopsyAuthorsNodes = Array.from(
      nodes.querySelectorAll("provenance[type='observed']")
    );

    // Controlla se esistono nodi di autori delle autopsie.
    if (autopsyAuthorsNodes.length > 0) {
      // Itera su ogni elemento selezionato precedentemente.
      autopsyAuthorsNodes.forEach((element) => {
        //console.log(element);

        // Controlla se l'elemento ha l'attributo 'subtype' impostato su 'seen'.
        if (element.getAttribute('subtype') == 'seen') {
          // Crea un oggetto con i dettagli dell'autore visto e lo aggiunge all'array seenAuthors.
          let seenAuthors = {
            name: element.textContent ? element.textContent : '',
            subtype: element.getAttribute('subtype') || '',
            when: element.getAttribute('when')
              ? element.getAttribute('when')
              : null,
            notAfter: element.getAttribute('notAfter')
              ? element.getAttribute('notAfter')
              : null,
          };
          this.seenAuthors.push(seenAuthors);
        } else if (element.getAttribute('subtype') == 'autopsied') {
          // Crea un oggetto con i dettagli dell'autore dell'autopsia e lo aggiunge all'array autopsyAuthors.
          let autopsyAuthor = {
            name: element.textContent ? element.textContent : '',
            subtype: element.getAttribute('subtype') || '',
            when: element.getAttribute('when')
              ? element.getAttribute('when')
              : null,
            notAfter: element.getAttribute('notAfter')
              ? element.getAttribute('notAfter')
              : null,
          };
          this.autopsyAuthors.push(autopsyAuthor);
        }
      });
    }
  }

  // Definisce una funzione per mappare i nodi di commento
  mapCommentaryNodes(data: any) {
    // Controlla se l'oggetto data non è vuoto
    if (data && Object.keys(data).length > 0) {
      // Itera su ogni chiave dell'oggetto data
      Object.keys(data).forEach((element) => {
        console.log(data[element]); // Stampa il valore associato alla chiave corrente
        let xmlid = element; // Assegna la chiave corrente a xmlid
        let nodes = document.querySelectorAll(`[xmlid="${element}"]`); // Seleziona tutti i nodi con l'attributo xmlid uguale alla chiave corrente
        if (nodes.length > 0) {
          // Se sono stati trovati dei nodi
          let span = nodes[0]; // Prende il primo nodo trovato
          span.classList.add('comment'); // Aggiunge la classe 'comment' al nodo
          span.addEventListener('mouseenter', (event) => {
            // Aggiunge un listener per l'evento mouseenter
            this.loadCommentaryData({
              evt: this,
              data: data[element],
              clickEvent: event,
            }); // Carica i dati del commento al passaggio del mouse
          });

          data[element].forEach((sub: Element) => {
            // Itera su ogni sotto-elemento del valore corrente
            let subReferences = sub.querySelectorAll(`[xmlid]`); // Seleziona tutti i sotto-nodi con l'attributo xmlid
            if (subReferences.length > 0) {
              // Se sono stati trovati dei sotto-nodi
              subReferences.forEach((subSpan: Element) => {
                // Itera su ogni sotto-nodo trovato
                subSpan.classList.add('spanReference'); // Aggiunge la classe 'spanReference' al sotto-nodo
                // Aggiunge un listener per l'evento click, commentato per il momento
                /* subSpan.addEventListener('click', (event) => {
                  this.highLightNodes({evt: this, data: data[element], clickEvent: event});
                }); */
              });
            }
          });
          // Alla presenza del mouse, mostra le informazioni dei nodi
          // Al click, fissa i dati
        }
      });
    }
  }

  // Definisce una funzione per stampare il documento
  printDocument() {
    window.print(); // Chiama la funzione di stampa del browser
  }
}
