import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  delay,
  EMPTY,
  filter,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  timeout,
  withLatestFrom,
} from 'rxjs';
import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpResponseBase,
} from '@angular/common/http';
import {
  FormElement,
  FormElementTree,
  LexiconService,
} from '../lexicon/lexicon.service';
import { LocationsCounter } from 'src/app/views/texts/texts.component';
import { GlobalGeoDataModel, MapsService } from '../maps/maps.service';

export interface DocumentSystem {
  documentSystem: Text[];
}

export interface GetFilesResponse {
  files: Text[];
}

export interface GetCountFiles {
  results: number;
}

export interface TextMetadata {
  alphabet: string;
  alphabet_url: string;
  ancientFindSpotName: string;
  authority: string;
  autopsy: string;
  autopsyAuthor: string;
  autopsyDate: string;
  bibliography: any;
  bodytextpart: BodyTextPart[] & BodyTextPart;
  condition: string;
  conditionDesc: string;
  conservationInstitution: ConservationInstitution;
  dateOfOrigin: string;
  dateOfOriginNotAfter: string;
  dateOfOriginNotBefore: string;
  datingCertainty: string;
  decoration: string;
  detailedFindSpot: string;
  dimensions: ObjectDimension;
  discoveryYear: DiscoveryYear;
  'element-id': number;
  editor: string;
  encoding: string;
  encodingSourceUrl: string;
  execution: string;
  execution_conceptUrl: string;
  facsimile: Array<Facsimile>;
  fileID: string;
  inscriptionTitle: string;
  inscriptionType: string;
  inventoryNumber: string;
  itAnt_ID: string;
  language: Array<LanguageMetadata>;
  layoutNotes: string;
  license: License;
  opistography: string;
  originalPlace: PlaceModel;
  palaeographicNotes: string;
  publicationDate: string;
  publicationPID: string;
  reuse: string;
  settlement: Settlement;
  summary: string;
  support: SupportModel;
  title: string;
  traditionalIDs: Array<TraditionalIDs> & TraditionalIDs;
  trismegistos: Trismegistos;
  wordDivisionType: string;
  writingSystem: string;
}

export interface ObjectDimension {
  depth: string;
  height: string;
  type: string;
  unit: string;
  width: string;
  precision: string;
}

export interface Trismegistos {
  trismegistosID: string;
  trismegistosID_url: string;
}
export interface TraditionalIDs {
  traditionalID: string;
  traditionalID_URL: string;
}
export interface Settlement {
  placeOfConservation: string;
  placeOfConservationExternalReference: string;
}
export interface License {
  distibutionLicence: string;
  distibutionLicence_URL: string;
}

export interface Facsimile {
  Desc: string;
  License: string;
  LicenseUrl: string;
  Url: string;
}

export interface DiscoveryYear {
  notAfter: string;
  notBefore: string;
  when: string;
}

export interface BodyTextPart {
  ductus: string;
  section: string;
  textDirection: string;
}

export interface ConservationInstitution {
  name: string;
  URL: string;
}

export interface PlaceModel {
  ancientName: string;
  ancientNameUrl: string;
  modernName: string;
  modernNameUrl: string;
}

export interface SupportModel {
  material: string;
  material_conceptUrl: string;
  objectType: string;
  objectType_conceptUrl: string;
}

export interface Text {
  type: string;
  children: Text[];
  metadata: TextMetadata;
  'element-id': number;
}

export interface LanguageMetadata {
  ident: string;
  source: string;
}

export interface AnnotationsRows {
  requestUUID: string | null | undefined;
  rows: Array<Attestation>;
}

export interface Attestation {
  nodeId: number;
  nodePath: string;
  tokens: Array<Span>;
}

export interface GetContentResponse {
  requestUUID: string;
  text: string;
}

export interface LeidenRequest {
  xmlString: string;
}

export interface LeidenResponse {
  xml: string;
}

export interface TextToken {
  begin: number;
  end: number;
  id: number;
  imported: boolean;
  node: number;
  position: number;
  source: string;
  text: string;
  xmlid: string;
}

export interface GetTokensResponse extends GetContentResponse {
  tokens: Array<TextToken>;
}

export interface XmlAndId {
  xml: string;
  nodeId: number;
}

export interface ListAndId {
  list: Array<Element[]>;
  id: number;
}

export interface AnnotationResponse {
  requestUUID: string;
  annotations: Annotation[];
}

export interface AnnotationAttributes {
  author: string;
  bibliography: Array<any>;
  confidence: number;
  creator: string;
  externalRef: string;
  form_id: string;
  label: string;
  leiden: string;
  node_id: number;
  node: string;
  timestamp: string;
  validity: string;
}

export interface Span {
  start: number;
  end: number;
}
export interface Annotation {
  attributes: AnnotationAttributes;
  id: number;
  imported: boolean;
  layer: string;
  spans: Span[];
  value: string;
}

export interface BibliographicElement {
  author: BookAuthor;
  date: string;
  editor: BookEditor;
  entry: string;
  issue: string;
  key: string;
  page: string;
  publisher: string;
  citedRangePage: string;
  citedRangeEntry: string;
  title: string;
  journalArticleTitle: string;
  type: string;
  url: string;
  volume: string;
}

export interface BookAuthor {
  name: string;
  surname: string;
}

export interface BookEditor extends BookAuthor {}

export interface Graphic {
  description: string;
  index: number;
  url: string;
  isPdf: boolean;
  isExternalRef: boolean;
  copyright: string;
}

@Injectable({
  providedIn: 'root',
})
export class TextsService {
  private baseUrl = environment.cashUrl;
  private leidenUrl = environment.leidenUrl;
  private documentSystem: DocumentSystem[] = [];

  private attestationsSubject = new BehaviorSubject<TextMetadata[]>([]);
  attestations$: Observable<TextMetadata[]> =
    this.attestationsSubject.asObservable();
  concordances$: Observable<TextMetadata[]> = this.bootstrapConcordances();
  somethingWrong: boolean = false;

  constructor(
    private http: HttpClient,
    private lexiconService: LexiconService,
    private mapsService: MapsService
  ) {}

  /**
   * Funzione per ottenere le concordanze con Bootstrap.
   * @returns Un observable che emette un array di metadati di testo.
   */
  bootstrapConcordances() {
    // Query predefinita per ottenere le concordanze.
    const defaultQuery = '[_doc.itAnt_ID=".*"]';
    // Offset predefinito per la paginazione.
    const defaultOffset = '0';
    // Limite predefinito per il numero massimo di elementi restituiti.
    const defaultLimit = '500';

    // Intestazioni della richiesta HTTP.
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Parametri per la richiesta HTTP.
    let params = new HttpParams();
    params = params.set('query', defaultQuery);
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    // Effettua una richiesta POST per ottenere i file corrispondenti alle concordanze.
    return this.http
      .post<GetFilesResponse>(
        this.baseUrl + 'api/public/searchFiles',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        // Estrae solo i file dalla risposta.
        map((res) => res.files),
        // Mappa i file in metadati di testo.
        map((texts) => this.mapData(texts)),
        // Condivide il risultato per evitare richieste multiple.
        shareReplay()
      );
  }

  /**
   * Funzione per ottenere gli elementi di paginazione.
   * @param first Il primo elemento da visualizzare.
   * @param row Il numero di righe per pagina.
   * @returns Un observable che emette un array di metadati di testo per la paginazione.
   */
  paginationItems(first?: number, row?: number): Observable<TextMetadata[]> {
    // Query predefinita per ottenere gli elementi di paginazione.
    const defaultQuery = '[_doc.itAnt_ID=".*"]';
    // Offset predefinito per la paginazione.
    const defaultOffset = '0';
    // Limite predefinito per il numero massimo di elementi per pagina.
    const defaultLimit = '8';

    // Intestazioni della richiesta HTTP.
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Parametri per la richiesta HTTP.
    let params = new HttpParams();
    params = params.set('query', defaultQuery);

    // Imposta l'offset se fornito, altrimenti utilizza quello predefinito.
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }

    // Imposta il limite se fornito, altrimenti utilizza quello predefinito.
    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }

    // Effettua una richiesta POST per ottenere i file corrispondenti alla paginazione.
    return this.http
      .post<GetFilesResponse>(
        this.baseUrl + 'api/public/searchFiles',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        // Estrae solo i file dalla risposta.
        map((res) => res.files),
        // Mappa i file in metadati di testo.
        map((texts) => this.mapData(texts)),
        // Condivide il risultato per evitare richieste multiple.
        shareReplay()
      );
  }

  /**
   * Funzione per ottenere un file tramite ID.
   * @param fileId L'ID del file da ottenere.
   * @returns Un observable che emette i metadati del file corrispondente all'ID.
   */
  getFileByID(fileId: string): Observable<TextMetadata> {
    // Query per ottenere il file con l'ID specificato.
    const defaultQuery = `[_doc.itAnt_ID=="${fileId}"]`;

    // Intestazioni della richiesta HTTP.
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Parametri per la richiesta HTTP.
    let params = new HttpParams();
    params = params
      .set('query', defaultQuery)
      .set('offset', '0')
      .set('limit', '1');

    // Effettua una richiesta POST per ottenere il file corrispondente all'ID.
    return this.http
      .post<GetFilesResponse>(
        this.baseUrl + 'api/public/searchFiles',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        // Estrae solo i file dalla risposta.
        map((res) => res.files),
        // Mappa i file in metadati di testo.
        map((texts) => this.mapData(texts)),
        // Seleziona il primo file (limitato a 1), se presente.
        map((texts) => texts[0]),
        // Condivide il risultato per evitare richieste multiple.
        shareReplay()
      );
  }

  // Questo metodo conta il numero di file corrispondenti alla query specificata.
  // Se viene fornito un parametro esterno (extParam), viene utilizzato come query,
  // altrimenti viene utilizzata una query predefinita per recuperare tutti i file.
  countFiles(extParam?: any): Observable<number> {
    let query = ''; // Inizializzazione della stringa di query

    const headers = new HttpHeaders({
      // Impostazione degli header per la richiesta HTTP
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    let params = new HttpParams(); // Inizializzazione dei parametri per la richiesta HTTP

    if (!extParam) {
      // Se non è fornito un parametro esterno
      query = '[_doc.itAnt_ID=".*"]'; // Imposta la query per recuperare tutti i file
      params = params.set('query', query); // Imposta la query nei parametri della richiesta
    } else {
      // Se è fornito un parametro esterno
      params = params.set('query', extParam); // Imposta il parametro fornito come query
    }

    // Effettua una richiesta POST al server per ottenere il conteggio dei file
    return this.http
      .post<GetCountFiles>(
        this.baseUrl + 'api/public/countFiles',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        map((res) => res.results), // Mappa la risposta per ottenere il risultato del conteggio
        shareReplay() // Condivide la risposta per evitare di effettuare nuove chiamate HTTP
      );
  }

  // Questo metodo cerca le attestazioni corrispondenti all'ID del modulo specificato.
  searchAttestations(formId: string): Observable<TextMetadata[]> {
    const headers = new HttpHeaders({
      // Impostazione degli header per la richiesta HTTP
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    let params = new HttpParams() // Inizializzazione dei parametri per la richiesta HTTP
      .set('query', `[_doc.itAnt_ID=".*" & attestation=="${formId}"]`) // Imposta la query per la ricerca delle attestazioni con l'ID del modulo specificato
      .set('offset', '0') // Imposta l'offset per la paginazione dei risultati
      .set('limit', '100'); // Imposta il limite massimo di risultati da restituire

    // Effettua una richiesta POST al server per cercare i file corrispondenti alla query specificata
    return this.http
      .post<any>(this.baseUrl + 'api/public/searchFiles', params.toString(), {
        headers: headers,
      })
      .pipe(
        map((res) => res.files), // Mappa la risposta per ottenere i file corrispondenti
        map((res) => this.mapData(res)) // Mappa i dati dei file per ottenere i metadati desiderati
      );
  }

  // Questo metodo cerca le attestazioni corrispondenti all'ID lessicale specificato.
  // È possibile specificare opzionalmente il limite e l'offset per la paginazione dei risultati.
  searchAttestationsLexEntry(
    lexId: string,
    limit?: number,
    offset?: number
  ): Observable<TextMetadata[]> {
    const headers = new HttpHeaders({
      // Impostazione degli header per la richiesta HTTP
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    let params = new HttpParams() // Inizializzazione dei parametri per la richiesta HTTP
      .set(
        'query',
        `[_doc.itAnt_ID=".*" & attestation.lexicalEntry=="${lexId}"]`
      ) // Imposta la query per la ricerca delle attestazioni con l'ID lessicale specificato
      .set('offset', '0') // Imposta l'offset per la paginazione dei risultati
      .set('limit', '100'); // Imposta il limite massimo di risultati da restituire

    // Effettua una richiesta POST al server per cercare i file corrispondenti alla query specificata
    return this.http
      .post<any>(this.baseUrl + 'api/public/searchFiles', params.toString(), {
        headers: headers,
      })
      .pipe(
        map((res) => res.files), // Mappa la risposta per ottenere i file corrispondenti
        map((res) => this.mapData(res)), // Mappa i dati dei file per ottenere i metadati desiderati
        map((res) =>
          res.sort((a, b) => {
            // Ordina i risultati in base all'ID numerico
            const matchA = a.itAnt_ID.match(/\d+$/); // Estrae l'ID numerico dal campo itAnt_ID di a
            const matchB = b.itAnt_ID.match(/\d+$/); // Estrae l'ID numerico dal campo itAnt_ID di b
            const numA = matchA ? Number(matchA[0]) : 0; // Converte l'ID numerico in un numero, se presente
            const numB = matchB ? Number(matchB[0]) : 0; // Converte l'ID numerico in un numero, se presente
            return numA - numB; // Restituisce la differenza tra i due numeri (ordine crescente)
          })
        )
      );
  }

  // Definizione dell'observable per ottenere i dati delle posizioni raggruppati
  // in base all'ID del luogo moderno unico.
  groupLocations: Observable<LocationsCounter[]> = this.getUniqueMetadata(
    '_doc__originalPlace__modernNameUrl'
  ).pipe(
    // Mappatura dei dati per estrarre l'ID del luogo moderno
    map((data) =>
      data
        .map((item: any) => {
          const match = JSON.parse(item)[0]?.match(/(\d+)(?="?$)/);
          return match ? match[1] : null;
        })
        .filter((id: any) => id)
    ), // Filtra gli eventuali valori null
    // Mappatura dei dati per trasformarli in oggetti con l'ID del luogo moderno
    map((data) => data.map((item: any) => ({ modernPlaceId: item }))),
    // Condivisione dei risultati per evitare di ricalcolarli
    shareReplay()
    /* tap(x => console.log(x)) */
  );

  // Definizione dell'observable per ottenere i dati geografici globali.
  geoData: Observable<GlobalGeoDataModel[]> = this.groupLocations.pipe(
    // SwitchMap per ottenere i dati geografici per ogni posizione
    switchMap((locations) => this.mapsService.getGeoPlaceData(locations)),
    // Ritardo di 1 secondo per simulare il caricamento
    delay(1000),
    // SwitchMap per ottenere le attestazioni per ogni luogo
    switchMap((geoData) => {
      // Mappatura dei dati geografici per ottenere le attestazioni per ogni luogo
      const searchAttestationsObservables = geoData.map((place) => {
        const headers = new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        });
        const cqlQuery = `[_doc__originalPlace__modernNameUrl="${place.modernUri}"]`;
        let params = new HttpParams()
          .set('query', cqlQuery)
          .set('offset', '0')
          .set('limit', '100');

        return this.http
          .post<AnnotationsRows>(
            environment.cashUrl + 'api/public/searchFiles',
            params.toString(),
            { headers: headers }
          )
          .pipe(
            // Mappatura delle attestazioni per includerle nei dati del luogo
            map((attestations) => ({ ...place, attestations }))
          );
      });

      // Utilizzo di forkJoin per attendere il completamento di tutte le richieste
      return forkJoin(searchAttestationsObservables);
    }),
    // Condivisione dei risultati per evitare di ricalcolarli
    shareReplay()
    /* tap(data => this.drawMap(data)) */
  );

  // Metodo per ottenere i valori unici dei metadati tramite una richiesta HTTP.
  getUniqueMetadata(field: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    let params = new HttpParams()
      .set('field', field)
      .set('offset', '0')
      .set('limit', '100');

    return this.http
      .post<any>(
        this.baseUrl + 'api/public/uniqueMetadataValues',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        // Mappatura dei risultati per ottenere solo i valori unici
        map((res) => res.values)
      );
  }

  // Metodo per filtrare le attestazioni tramite una query e restituire i metadati testuali corrispondenti.
  filterAttestations(
    query: string,
    first?: number,
    row?: number
  ): Observable<TextMetadata[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const defaultOffset = '0';
    const defaultLimit = '8';

    /* if(first && row && (first>=row)){
    row = first+row;
  } */

    let params = new HttpParams();
    params = params.set('query', query);

    // Impostazione dell'offset e del limite se forniti, altrimenti vengono usati i valori predefiniti
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }

    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }

    return this.http
      .post<GetFilesResponse>(
        this.baseUrl + 'api/public/searchFiles',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        // Mappatura dei risultati per ottenere solo i metadati testuali
        map((res) => res.files),
        // Mappatura dei dati testuali per il formato desiderato
        map((texts) => this.mapData(texts)),
        // Emissione dei dati attraverso il subject
        tap((res) => this.attestationsSubject.next(res)),
        // Condivisione dei risultati per evitare di ricalcolarli
        shareReplay()
      );
  }

  // Funzione che gestisce eventuali errori durante una richiesta HTTP
  // Se lo status della risposta non è 200, imposta una variabile di flag "somethingWrong" a true e restituisce un observable vuoto
  // Altrimenti restituisce un observable di valore vuoto
  thereWasAnError(err?: HttpResponseBase, source?: string) {
    if (err?.status != 200) {
      this.somethingWrong = true;
      return EMPTY;
    }

    return of();
  }

  // Ripristina le attestazioni del filtro
  restoreFilterAttestations() {
    this.attestationsSubject.next([]);
  }

  // Imposta il sistema di documenti con un array di sistemi di documenti fornito
  setDocumentSystem(fileSystem: DocumentSystem[]) {
    this.documentSystem = fileSystem;
  }

  // Restituisce il sistema di documenti attualmente impostato
  getDocumentSystem() {
    return this.documentSystem;
  }

  // Converte un array di oggetti di testo in un array di metadati del testo
  mapData(texts: Text[]): TextMetadata[] {
    return texts.map((text: Text) => ({
      // Mappatura dei singoli attributi del metadata
      alphabet: text.metadata.alphabet,
      alphabet_url: text.metadata.alphabet_url,
      ancientFindSpotName: text.metadata.ancientFindSpotName,
      authority: text.metadata.authority,
      autopsy: text.metadata.autopsy,
      autopsyDate: text.metadata.autopsyDate,
      autopsyAuthor: text.metadata.autopsyAuthor,
      bibliography: text.metadata.bibliography,
      bodytextpart: text.metadata.bodytextpart,
      condition: text.metadata.condition,
      conditionDesc: text.metadata.conditionDesc,
      conservationInstitution: text.metadata.conservationInstitution,
      dateOfOrigin: text.metadata.dateOfOrigin,
      dateOfOriginNotBefore: text.metadata.dateOfOriginNotBefore,
      dateOfOriginNotAfter: text.metadata.dateOfOriginNotAfter,
      datingCertainty: text.metadata.datingCertainty,
      decoration: text.metadata.decoration,
      detailedFindSpot: text.metadata.detailedFindSpot,
      dimensions: text.metadata.dimensions,
      discoveryYear: text.metadata.discoveryYear,
      editor: text.metadata.editor,
      'element-id': text['element-id'],
      encoding: text.metadata.encoding,
      encodingSourceUrl: text.metadata.encodingSourceUrl,
      execution: text.metadata.execution,
      execution_conceptUrl: text.metadata.execution_conceptUrl,
      facsimile: text.metadata.facsimile,
      fileID: text.metadata.fileID,
      inscriptionTitle: text.metadata.inscriptionTitle,
      inscriptionType: text.metadata.inscriptionType,
      inventoryNumber: text.metadata.inventoryNumber,
      itAnt_ID: text.metadata.itAnt_ID,
      language: text.metadata.language,
      layoutNotes: text.metadata.layoutNotes,
      license: text.metadata.license,
      opistography: text.metadata.opistography,
      originalPlace: text.metadata.originalPlace,
      palaeographicNotes: text.metadata.palaeographicNotes,
      publicationDate: text.metadata.publicationDate,
      publicationPID: text.metadata.publicationPID,
      reuse: text.metadata.reuse,
      settlement: text.metadata.settlement,
      summary: text.metadata.summary,
      support: text.metadata.support,
      title: text.metadata.title,
      traditionalIDs: text.metadata.traditionalIDs,
      trismegistos: text.metadata.trismegistos,
      wordDivisionType: text.metadata.wordDivisionType,
      writingSystem: text.metadata.writingSystem,
    }));
  }

  // Filtra i metadati del testo in base al secolo specificato
  // Restituisce un observable degli elementi filtrati
  filterByDate(
    century: number,
    first?: number,
    row?: number
  ): Observable<TextMetadata[]> {
    // Costruzione della query di default per il filtro
    const defaultQuery = `[_doc.itAnt_ID=".*" & _doc.dateOfOriginNotBefore>="${century}" & _doc.dateOfOriginNotAfter<="${
      century + 100
    }"]`;
    const defaultOffset = '0';
    const defaultLimit = '1000';

    // Configurazione degli headers HTTP
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Configurazione dei parametri per la richiesta HTTP
    let params = new HttpParams();
    params = params.set('query', defaultQuery);

    // Impostazione dell'offset se fornito, altrimenti utilizza quello di default
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }

    // Impostazione del limite di righe se fornito, altrimenti utilizza quello di default
    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }

    // Esegue la richiesta HTTP al server per filtrare i file
    return this.http
      .post<GetFilesResponse>(
        this.baseUrl + 'api/public/searchFiles',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        // Mappa la risposta alla lista di file
        map((res) => res.files),
        // Mappa i file alla lista di metadati del testo
        map((texts) => this.mapData(texts)),
        // Condivide l'observable per consentire a più subscriber di condividerlo
        shareReplay()
      );
  }

  // Dichiarazione dell'array savedSearch utilizzato per memorizzare le ricerche salvate.
  savedSearch: any = [];

  // Metodo per ottenere la posizione delle ricerche salvate.
  getSavedSearchLocation() {
    return this.savedSearch;
  }

  // Metodo per ripristinare le ricerche salvate, azzerando l'array savedSearch.
  restoredLocationSearch() {
    this.savedSearch = [];
  }

  // Metodo per filtrare i testi in base alla posizione.
  // Accetta una stringa 'location' che rappresenta la posizione, e due parametri opzionali per la paginazione (first e row).
  filterByLocation(
    location: string,
    first?: number,
    row?: number
  ): Observable<TextMetadata[]> {
    // Costruzione della query di default utilizzando la posizione fornita.
    const defaultQuery = `[_doc.itAnt_ID=".*" & _doc.originalPlace.modernNameUrl="https://sws.geonames.org/${location}"]`;
    const defaultOffset = '0';
    const defaultLimit = '1000';

    // Impostazione degli header per la richiesta HTTP.
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Creazione dei parametri per la richiesta HTTP.
    let params = new HttpParams();
    params = params.set('query', defaultQuery);

    // Impostazione dei parametri di paginazione, se forniti.
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }

    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }

    // Esecuzione della richiesta HTTP per ottenere i file filtrati per posizione.
    return this.http
      .post<GetFilesResponse>(
        this.baseUrl + 'api/public/searchFiles',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        // Estrazione dei file dalla risposta.
        map((res) => res.files),
        // Mappatura dei testi ottenuti.
        map((texts) => this.mapData(texts)),
        // Memorizzazione dei risultati nel campo savedSearch.
        tap((x) => (this.savedSearch = x)),
        // Condivisione dei risultati tra gli osservatori.
        shareReplay()
      );
  }

  // Dichiarazione dell'array typeSavedSearch utilizzato per memorizzare le ricerche di tipo.
  typeSavedSearch: any = [];

  // Metodo per ottenere le ricerche di tipo salvate.
  getTypeSavedSearch() {
    return this.typeSavedSearch;
  }

  // Metodo per ripristinare le ricerche di tipo salvate, azzerando l'array typeSavedSearch.
  restoredTypeSearch() {
    this.typeSavedSearch = [];
  }

  // Metodo per filtrare i testi in base al tipo.
  // Accetta una stringa 'type' che rappresenta il tipo di testo, e due parametri opzionali per la paginazione (first e row).
  filterByType(type: string, first?: number, row?: number) {
    // Costruzione della query di default utilizzando il tipo fornito.
    const defaultQuery = `[_doc.itAnt_ID=".*" & _doc.inscriptionType=="${type}"]`;
    const defaultOffset = '0';
    const defaultLimit = '1000';

    // Impostazione degli header per la richiesta HTTP.
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Creazione dei parametri per la richiesta HTTP.
    let params = new HttpParams();
    params = params.set('query', defaultQuery);

    // Impostazione dei parametri di paginazione, se forniti.
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }

    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }

    // Esecuzione della richiesta HTTP per ottenere i file filtrati per tipo.
    return this.http
      .post<GetFilesResponse>(
        this.baseUrl + 'api/public/searchFiles',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        // Estrazione dei file dalla risposta.
        map((res) => res.files),
        // Mappatura dei testi ottenuti.
        map((texts) => this.mapData(texts)),
        // Memorizzazione dei risultati nel campo typeSavedSearch.
        tap((x) => (this.typeSavedSearch = x)),
        // Condivisione dei risultati tra gli osservatori.
        shareReplay()
      );
  }

  // Funzione che effettua una ricerca di posizione basata su una query.
  // Restituisce un Observable di array di metadati testuali.
  searchLocation(query: string): Observable<TextMetadata[]> {
    // Impostazioni di default per la query, lo spostamento e il limite.
    const defaultQuery = `[_doc.itAnt_ID=".*" & _doc.originalPlace.modernNameUrl=="${query}.*"]`;
    const defaultOffset = '0';
    const defaultLimit = '1000';

    // Intestazioni per la richiesta HTTP.
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Parametri per la richiesta HTTP.
    let params = new HttpParams();
    params = params.set('query', defaultQuery);
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    // Effettua una richiesta HTTP POST per ottenere i file corrispondenti alla ricerca.
    return this.http
      .post<GetFilesResponse>(
        this.baseUrl + 'api/public/searchFiles',
        params.toString(),
        { headers: headers }
      )
      .pipe(
        map((res) => res.files),
        map((texts) => this.mapData(texts)),
        tap((x) => (this.typeSavedSearch = x)), // Imposta il tipo di ricerca salvata.
        shareReplay() // Condivide i dati in cache per future richieste.
      );
  }

  // Ottiene il contenuto XML di un nodo specificato.
  // Restituisce un Observable di XmlAndId.
  getContent(nodeId: number): Observable<XmlAndId> {
    return this.http
      .get<GetContentResponse>(
        `${this.baseUrl}api/public/getcontent?requestUUID=11&nodeid=${nodeId}`
      )
      .pipe(
        map((x) => ({ xml: x.text, nodeId: nodeId })),
        shareReplay() // Condivide i dati in cache per future richieste.
      );
  }

  // Ottiene il contenuto HTML da dati XML grezzi.
  // Restituisce un Observable di stringa HTML.
  getHTMLContent(rawXmlData: XmlAndId): Observable<string> {
    return this.http
      .post<LeidenResponse>(this.leidenUrl, { xmlString: rawXmlData.xml })
      .pipe(map((leidenResponse) => leidenResponse.xml));
  }

  // Ottiene il contenuto HTML da dati XML grezzi usando un endpoint specifico per TEI.
  // Restituisce un Observable di stringa HTML.
  getHTMLTeiNodeContent(rawXmlData: LeidenRequest): Observable<string> {
    return this.http
      .post<LeidenResponse>('/leiden_itant/', rawXmlData)
      .pipe(map((leidenResponse) => leidenResponse.xml));
  }

  // Ottiene i token di testo di un nodo specificato.
  // Restituisce un Observable di array di token di testo.
  getTokens(nodeId: number): Observable<Array<TextToken>> {
    return this.http
      .get<GetTokensResponse>(
        `${this.baseUrl}api/public/token?requestUUID=11&nodeid=${nodeId}`
      )
      .pipe(
        map((x) => x.tokens),
        shareReplay() // Condivide i dati in cache per future richieste.
      );
  }

  // Ottiene le annotazioni di un nodo specificato.
  // Restituisce un Observable di array di annotazioni.
  getAnnotation(id: number): Observable<Annotation[]> {
    return this.http
      .get<AnnotationResponse>(
        this.baseUrl + 'api/public/annotation?requestUUID=test123&nodeid=' + id
      )
      .pipe(
        map((results) =>
          results.annotations.filter((anno) => anno.layer == 'attestation')
        ),
        shareReplay() // Condivide i dati in cache per future richieste.
      );
  }

  // Funzione per mappare una richiesta XML.
  // Restituisce XmlAndId.
  mapXmlRequest(res: XmlAndId): XmlAndId {
    let object = {
      xml: res.xml,
      nodeId: res.nodeId,
    };

    return object;
  }

  // Ottiene dati interpretativi personalizzati basati su una lista di nodi e un ID.
  // Restituisce un Observable di dati interpretativi.
  getCustomInterpretativeData(req: ListAndId) {
    return forkJoin(
      req.list.map((innerArray) => {
        return forkJoin(
          innerArray.map((node: any) => {
            return this.getHTMLTeiNodeContent({
              xmlString: node.outerHTML,
            }).pipe(map((x) => x));
          })
        );
      })
    ).pipe(
      switchMap((teiNodeContents) => {
        return this.getTokens(req.id).pipe(
          map((tokens) => {
            return {
              teiNodes: req.list,
              leidenNodes: teiNodeContents,
              tokens: tokens,
            };
          })
        );
      }),
      shareReplay() // Condivide i dati in cache per future richieste.
    );
  }

  // Questa funzione prende un array di alberi di elementi di modulo e restituisce un Observable che emette le annotazioni
  // corrispondenti a ciascun modulo.
  getAnnotationsByForms(forms: FormElementTree[]) {
    return forkJoin(
      forms.map((form) => {
        return this.searchAttestations(form.form).pipe(
          switchMap((res) => {
            if (res.length > 0) {
              let nodeIds: any[] = [];

              res.forEach((element) => {
                nodeIds.push(element['element-id']);
              });
              // Utilizzo di un altro forkJoin per ottenere le attestazioni
              return forkJoin(
                nodeIds.map((nodeId) => {
                  // Chiamata alla funzione per ottenere l'attestazione per un nodeId specifico
                  return this.getAnnotation(nodeId).pipe(
                    map((attestations) => {
                      // Filtraggio delle attestazioni basato sul valore del modulo
                      const filtered = attestations.filter(
                        (attestation) => attestation.value == form.form
                      );
                      return filtered;
                    })
                  );
                })
              ).pipe(
                map((res) => {
                  form.leidenContainer = [];
                  res.forEach((att) => {
                    att.forEach((a) => {
                      form.leidenContainer.push(a.attributes.leiden);
                    });
                  });
                  let leidenTooltip = '';
                  if (form.leidenContainer.length > 0) {
                    // Costruzione del tooltip Leiden se ci sono attestazioni trovate
                    leidenTooltip = `<div class="flex flex-column">
                                      <span class="text-base font-medium">Varianti:</span>
                                        <ul>`;
                    form.leidenContainer.forEach((span) => {
                      leidenTooltip += `<li class="font-light">&#x2022; ${span}</li>`;
                    });
                    leidenTooltip += `</ul>
                                    </div>`;
                  } else {
                    leidenTooltip = '';
                  }

                  // Aggiunta del tooltip Leiden al modulo
                  form.leidenString = leidenTooltip;
                  return form;
                })
              );
            } else {
              // Se non ci sono attestazioni trovate, restituisci solo il modulo
              form.idContainer = [];
              form.leidenContainer = [];
              return of(form);
            }
          })
        );
      })
    ).pipe(
      // Concatenazione dell'output in un unico array
      map((results) => {
        let output: Array<any> = [];
        results.forEach((form) => output.push(form));
        return output;
      })
    );
  }

  /**
   * Funzione per ottenere i dati dei form associati alle annotazioni.
   * @param annotations Un array di annotazioni da elaborare.
   * @returns Un Observable che emette un array di oggetti contenenti l'annotazione e il form associato.
   */
  getForms(annotations: Annotation[]) {
    return forkJoin(
      annotations.map((anno: Annotation) => {
        return this.lexiconService.getFormData(anno.value).pipe(
          map((res) => {
            return {
              annotation: anno,
              form: res,
            };
          })
        );
      })
    ).pipe(
      catchError((err) => of(null)),
      tap((res) => res)
    );
  }

  /**
   * Funzione per ottenere i dati delle voci lessicali associate ai form e alle annotazioni.
   * @param formsAndAnno Un array di oggetti contenenti form e annotazioni associate.
   * @returns Un Observable che emette un array di oggetti contenenti l'annotazione e la voce lessicale associata.
   */
  getLexicalEntries(formsAndAnno: any) {
    return forkJoin(
      formsAndAnno.map((formAndAnno: any) => {
        return this.lexiconService
          .getLexicalEntryData(formAndAnno.form.lexicalEntry)
          .pipe(
            map((res) => {
              return {
                annotation: formAndAnno.annotation,
                lexicalEntry: res,
              };
            })
          );
      })
    ).pipe(
      tap((res) => res),
      shareReplay()
    );
  }

  /**
   * Funzione per ottenere le annotazioni associate ai set di identificatori specificati.
   * @param setIds Un array di identificatori di set da cui ottenere le annotazioni.
   * @returns Un Observable che emette un array di annotazioni associate ai set specificati.
   */
  getAnnotations(setIds: any) {
    return forkJoin(
      setIds.map((id: any) => {
        return this.getAnnotation(id);
      })
    ).pipe(
      map((arrays: any) => [].concat(...arrays)),
      tap((res) => res),
      shareReplay()
    );
  }
}
