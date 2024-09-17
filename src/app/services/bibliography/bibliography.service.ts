import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  catchError,
  concat,
  concatAll,
  concatMap,
  EMPTY,
  expand,
  filter,
  flatMap,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  single,
  switchMap,
  tap,
  throwError,
  toArray,
} from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  Annotation,
  AnnotationsRows,
  Attestation,
  GetCountFiles,
  GetFilesResponse,
  TextMetadata,
  TextsService,
} from '../text/text.service';

export interface Book {
  author: string;
  editor: string;
  date: string;
  key: string;
  references: number;
  title: string;
}

@Injectable({
  providedIn: 'root',
})
export class BibliographyService {
  private lexoUrl = environment.lexoUrl;
  private cashUrl = environment.cashUrl;
  private zoteroUrl = environment.zoteroUrl;

  constructor(private http: HttpClient, private textService: TextsService) {}

  /**
   * Filtra gli elementi in base alla lettera dell'autore.
   * @param letter La lettera per cui filtrare gli autori.
   * @returns Un Observable contenente l'array dei risultati filtrati.
   */
  filterByLetter(letter: string): Observable<any[]> {
    // Costruisci il corpo della richiesta con il filtro sull'autore
    let body = {
      requestUUID: '11',
      filters: [
        {
          key: 'author',
          value: `^${letter}`,
          op: 're',
        },
      ],
      'user-id': '11',
    };

    // Imposta valori predefiniti per offset e limit
    const defaultOffset = '0';
    const defaultLimit = '500';

    // Costruisci i parametri per la richiesta HTTP
    let params = new HttpParams();
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    // Opzioni per la richiesta HTTP
    const options = {
      params: params,
    };

    // Esegui la richiesta HTTP e manipola i risultati
    return this.http
      .post<any>(this.cashUrl + 'api/public/searchbiblio', body, options)
      .pipe(
        // Estrai solo l'array di risultati
        map((res) => res.results),
        // Mappa ciascun libro ai suoi campi specifici
        map((books: any[]) =>
          books.map((book) => ({
            abstractNote: book.params['Abstract Note']?.join('; ') || '',
            author: book.params['Author']?.join('; ') || '',
            date: book.params['Date']?.join('; ') || '',
            editor: book.params['Editor']?.join('; ') || '',
            isbn: book.params['ISBN']?.join('; ') || '',
            itemType: book.params['Item Type']?.join('; ') || '',
            key: book.params['Key']?.join('; ') || '',
            pages: book.params['Pages']?.join('; ') || '',
            place: book.params['Place']?.join('; ') || '',
            publicationYear: book.params['Publication Year']?.join('; ') || '',
            publisher: book.params['Publisher']?.join('; ') || '',
            title: book.params['Title']?.join('; ') || '',
            url: book.params['Url']?.join('; ') || '',
          }))
        ),
        // Ordina i libri in base all'autore rilevante
        map((books) => {
          books.sort((a, b) => {
            // Funzione per estrarre il cognome del primo autore e verificarne l'inizio con una lettera specificata
            const getFirstRelevantAuthorSurname = (author: string, letter: string) => {
              // Estrae il cognome del primo autore dell'elenco
              const firstAuthorSurname = author.split(';')[0].trim().split(',')[0].trim().toLowerCase();
        
              // Se il cognome inizia per la lettera specificata, lo restituisce;
              // altrimenti, restituisce un carattere che lo posizionerà alla fine dell'ordinamento
              return firstAuthorSurname.startsWith(letter) ? firstAuthorSurname : '\uffff';
            };
        
            
            const authorA = getFirstRelevantAuthorSurname(a.author, letter);
            const authorB = getFirstRelevantAuthorSurname(b.author, letter);
        
            return authorA.localeCompare(authorB);
          });
        
          return books; // Ritorna la lista di libri ordinata
        })
      );
  }

  /**
   * Ottiene gli elementi paginati.
   * @param first Il primo elemento da recuperare.
   * @param row Il numero di elementi da recuperare.
   * @returns Un Observable contenente l'array dei risultati paginati.
   */
  paginationItems(first?: number, row?: number): Observable<any[]> {
    // Costruisci il corpo della richiesta per ottenere tutti gli elementi
    let body = {};
    let defaultOffset = 0;
    let defaultLimit = 0;
    body = {
      requestUUID: '11',
      filters: [
        {
          key: 'key',
          value: `.*`,
          op: 're',
        },
      ],
      'user-id': '11',
    };

    // Imposta valori predefiniti o forniti per offset e limit
    if ((first && row) || (first == 0 && row)) {
      defaultOffset = first;
      defaultLimit = row;
    } else {
      defaultOffset = 0;
      defaultLimit = 8;
    }

    // Costruisci i parametri per la richiesta HTTP
    let params = new HttpParams();
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    // Opzioni per la richiesta HTTP
    const options = {
      params: params,
    };

    // Esegui la richiesta HTTP e manipola i risultati
    return this.http
      .post<any>(this.cashUrl + 'api/public/searchbiblio', body, options)
      .pipe(
        // Estrai solo l'array di risultati
        map((res) => res.results),
        // Mappa ciascun libro ai suoi campi specifici
        map((books: any[]) =>
          books.map((book) => ({
            abstractNote: book.params['Abstract Note']?.join('; ') || '',
            author: book.params['Author']?.join('; ') || '',
            date: book.params['Date']?.join('; ') || '',
            editor: book.params['Editor']?.join('; ') || '',
            isbn: book.params['ISBN']?.join('; ') || '',
            itemType: book.params['Item Type']?.join('; ') || '',
            key: book.params['Key']?.join('; ') || '',
            pages: book.params['Pages']?.join('; ') || '',
            place: book.params['Place']?.join('; ') || '',
            publicationYear: book.params['Publication Year']?.join('; ') || '',
            publisher: book.params['Publisher']?.join('; ') || '',
            title: book.params['Title']?.join('; ') || '',
            url: book.params['Url']?.join('; ') || '',
            volume: book.params['Volume']?.join('; ') || '',
          }))
        )
      );
  }

  // Funzione che conta il totale dei libri
  // accetta un parametro esterno opzionale
  countTotalBooks(extParam?: any): Observable<number> {
    let body = {}; // corpo della richiesta
    let defaultOffset = ''; // offset predefinito
    let defaultLimit = ''; // limite predefinito

    // Se non è presente il parametro esterno
    if (!extParam) {
      body = {
        requestUUID: '11',
        filters: [
          {
            key: 'key',
            value: `.*`,
            op: 're',
          },
        ],
        'user-id': '11',
      };

      defaultOffset = '0';
      defaultLimit = '5000';
    } else {
      defaultOffset = '0';
      defaultLimit = '500';
    }

    let params = new HttpParams(); // Parametri HTTP
    params = params.set('offset', defaultOffset); // Imposta l'offset
    params = params.set('limit', defaultLimit); // Imposta il limite

    const options = {
      params: params,
    };

    // Esegue una richiesta POST per cercare i libri
    return this.http
      .post<any>(this.cashUrl + 'api/public/searchbiblio', body, options)
      .pipe(
        map((res) => res.results.length) // Restituisce la lunghezza dei risultati come numero
      );
  }

  // Funzione che filtra le attestazioni
  // Accetta i valori del modulo e opzionalmente valori per la paginazione (f e r)
  filterAttestations(formValues: any, f?: number, r?: number) {
    // Creazione della query

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    let queryParts: string[] = [];

    if (formValues.location) {
      queryParts.push(
        `_doc.originalPlace.modernNameUrl=="${formValues.location}"`
      ); // Aggiunge una parte della query per la posizione
    }

    if (formValues.inscriptionId) {
      queryParts.push(`_doc.fileID=".*${formValues.inscriptionId}.*"`); // Aggiunge una parte della query per l'ID dell'iscrizione
    }

    if (formValues.word) {
      queryParts.push(` word=".*${formValues.word}.*"`); // Aggiunge una parte della query per la parola
    }

    const query = queryParts.length > 0 ? `[${queryParts.join(' &')}]` : ''; // Costruisce la query

    let params = new HttpParams()
      .set('query', query)
      .set('offset', '0')
      .set('limit', '1000');

    if (query != '') {
      // Esegue una richiesta POST per cercare i file
      return this.http
        .post<GetFilesResponse>(
          this.cashUrl + 'api/public/searchFiles',
          params.toString(),
          { headers: headers }
        )
        .pipe(
          map((res) => res.files), // Mappa i risultati per ottenere i file
          map((texts) => this.textService.mapData(texts)), // Mappa i testi tramite un servizio specifico
          tap((res) => console.log(res)), // Effettua un log dei risultati intermedi
          map((res) =>
            res
              .map((item) => item.bibliography)
              .filter((bib) => bib !== null && bib !== undefined) // Filtra le bibliografie non nulle e non definite
              .reduce((acc, cur) => acc.concat(cur), [])
          ), // Riduce le bibliografie in un unico array
          map((bibliographies) => {
            const uniqueBibliographies: Record<string, any> = {}; // Crea un oggetto per le bibliografie uniche
            bibliographies.forEach((bib: any) => {
              if (bib && bib.corresp && !uniqueBibliographies[bib.corresp]) {
                uniqueBibliographies[bib.corresp] = bib;
              }
            });
            return Object.values(uniqueBibliographies); // Restituisce solo i valori unici
          }),
          map((books: any[]) => books.map((book) => this.mapBookByType(book))), // Mappa i libri in base al tipo
          tap((x) => console.log(x)) // Effettua un log dei risultati intermedi
        );
    } else {
      return of([]); // Restituisce un Observable vuoto se la query è vuota
    }
  }

  // Funzione che mappa un libro in base al tipo
  mapBookByType(book: any) {
    switch (book['type']) {
      case 'journalArticle':
        return this.mapJournalArticle(book); // Se il tipo è "journalArticle", mappa come articolo di rivista
      case 'book':
        return this.mapBook(book); // Se il tipo è "book", mappa come libro
      case 'bookSection':
        return this.mapBookSection(book); // Se il tipo è "bookSection", mappa come sezione di libro
      default:
        return this.mapBook(book); // Altrimenti, mappa come libro
    }
  }

  /**
   * Questa funzione mappa un articolo di giornale.
   * @param book - Il libro da mappare.
   * @returns Un oggetto che rappresenta l'articolo di giornale mappato.
   */
  mapJournalArticle(book: any) {
    return {
      abstractNote: book['monogrNoteText'] || '', // Abstract dell'articolo
      author:
        Array.isArray(book.monogrAuthors) && book.monogrAuthors.length > 0
          ? book.monogrAuthors
              .map((a: any) => `${a.forename} ${a.surname}`.trim())
              .join('; ')
          : book.monogrAuthors && book.monogrAuthors.forename
          ? `${book.monogrAuthors.forename} ${book.monogrAuthors.surname}`.trim()
          : book.analyticAuthors &&
            (book.analyticAuthors.forename != '' ||
              book.analyticAuthors.surname != '')
          ? `${book.analyticAuthors.forename} ${book.analyticAuthors.surname}`.trim()
          : `${book.analyticAuthors.name} `,
      date: book['monogrDate'], // Data di pubblicazione
      editor: Array.isArray(book.monogrEditors)
        ? book.monogrEditors
            .map((a: any) => `${a.forename} ${a.surname}`.trim())
            .join('; ')
        : `${book.monogrEditors.forename} ${book.monogrEditors.surname}`.trim(), // Editori dell'articolo
      id: book['id'], // ID del libro
      isbn: book['monogrIdno'], // ISBN del libro
      itemType: book['type'], // Tipo di articolo
      key: book['corresp'].split('/')[book['corresp'].split('/').length - 1], // Chiave di riferimento
      notes: book['notes'] || '', // Note
      pages: book['citedRangeText'] || '', // Pagine citate
      place: book['Place'], // Luogo di pubblicazione
      publicationYear: book['Publication Year'] || '', // Anno di pubblicazione
      publisher: book['monogrPublisher'], // Editore
      title: book['monogrTitle']['text'], // Titolo
      url: book['corresp'], // URL
      volume: book['Volume'] || '', // Volume
    };
  }

  /**
   * Questa funzione mappa un libro.
   * @param book - Il libro da mappare.
   * @returns Un oggetto che rappresenta il libro mappato.
   */
  mapBook(book: any) {
    return {
      abstractNote: book['monogrNoteText'] || '', // Abstract del libro
      author:
        Array.isArray(book.monogrAuthors) && book.monogrAuthors.length > 0
          ? book.monogrAuthors
              .map((a: any) => `${a.forename} ${a.surname}`.trim())
              .join('; ')
          : book.monogrAuthors && book.monogrAuthors.forename /* ? 
      `${book.monogrAuthors.forename} ${book.monogrAuthors.surname}`.trim() :
      `${book.analyticAuthors.forename} ${book.analyticAuthors.surname}`.trim(), */,
      date: book['monogrDate'], // Data di pubblicazione
      editor: Array.isArray(book.monogrEditors)
        ? book.monogrEditors
            .map((a: any) => `${a.forename} ${a.surname}`.trim())
            .join('; ')
        : `${book.monogrEditors.forename} ${book.monogrEditors.surname}`.trim(), // Editori del libro
      id: book['id'], // ID del libro
      isbn: book['monogrIdno'], // ISBN del libro
      itemType: book['type'], // Tipo di libro
      key: book['corresp'].split('/')[book['corresp'].split('/').length - 1], // Chiave di riferimento
      notes: book['notes'] || '', // Note
      pages: book['citedRangeText'] || '', // Pagine citate
      place: book['monogrPlace'], // Luogo di pubblicazione
      publicationYear: book['Publication Year'] || '', // Anno di pubblicazione
      publisher: book['monogrPublisher'], // Editore
      title: book['monogrTitle']['text'], // Titolo
      url: book['corresp'], // URL
      volume: book['biblScope'] || '', // Volume
    };
  }

  /**
   * Questa funzione mappa una sezione di un libro.
   * @param book - La sezione di libro da mappare.
   * @returns Un oggetto che rappresenta la sezione di libro mappata.
   */
  mapBookSection(book: any) {
    return {
      abstractNote: book['monogrNoteText'] || '', // Abstract della sezione di libro
      author:
        Array.isArray(book.monogrAuthors) && book.monogrAuthors.length > 0
          ? book.monogrAuthors
              .map((a: any) => `${a.forename} ${a.surname}`.trim())
              .join('; ')
          : book.monogrAuthors && book.monogrAuthors.forename
          ? `${book.monogrAuthors.forename} ${book.monogrAuthors.surname}`.trim()
          : `${book.analyticAuthors.forename} ${book.analyticAuthors.surname}`.trim(), // Autore della sezione di libro
      date: book['monogrDate'], // Data di pubblicazione
      editor: Array.isArray(book.monogrEditors)
        ? book.monogrEditors
            .map((a: any) => `${a.forename} ${a.surname}`.trim())
            .join('; ')
        : `${book.monogrEditors.forename} ${book.monogrEditors.surname}`.trim(), // Editori della sezione di libro
      id: book['id'], // ID della sezione di libro
      isbn: book['monogrIdno'], // ISBN del libro
      itemType: book['type'], // Tipo di sezione di libro
      key: book['corresp'].split('/')[book['corresp'].split('/').length - 1], // Chiave di riferimento
      notes: book['notes'] || '', // Note
      pages: book['citedRangeText'] || '', // Pagine citate
      place: book['monogrPubPlace'], // Luogo di pubblicazione della sezione di libro
      publicationYear: book['monogrDate'] || '', // Anno di pubblicazione della sezione di libro
      publisher: book['monogrPublisher'], // Editore della sezione di libro
      title: book['monogrTitle']['text'], // Titolo della sezione di libro
      url: book['corresp'], // URL
      volume: book['biblScope'] || '', // Volume
    };
  }

  // Questa funzione filtra i libri in base ai valori forniti e restituisce un Observable contenente i risultati.

  filterBooks(formValues: any, f?: number, r?: number): Observable<any[]> {
    // Se non sono presenti valori nei campi del form, restituisce un Observable vuoto.
    if (
      !formValues.author &&
      !formValues.date &&
      !formValues.title &&
      !formValues.id
    ) {
      return of([]);
    }
    // Array contenente i filtri
    let filters = [];

    // Aggiunge il filtro per l'autore, se specificato nel form.
    if (formValues.author) {
      filters.push({
        key: 'author',
        value: `.*${formValues.author}.*`,
        op: 're', // 're' sta per Regular Expression, indica che si sta utilizzando una espressione regolare per la ricerca.
      });
    }

    // Aggiunge il filtro per la data, se specificata nel form.
    if (formValues.date) {
      let start, end;
      let singleDate;
      // Se la data è un intervallo di tempo
      if (Array.isArray(formValues.date)) {
        start = formValues.date[0].getFullYear().toString();
        end = formValues.date[1].getFullYear().toString();

        filters.push({
          key: 'date',
          value: `${start}`,
          op: 'gt', // 'gt' sta per Greater Than, indica che si sta cercando una data maggiore di quella specificata.
        });

        filters.push({
          key: 'date',
          value: `${end}`,
          op: 'lt', // 'lt' sta per Less Than, indica che si sta cercando una data minore di quella specificata.
        });
      } else {
        singleDate = formValues.date.getFullYear().toString();

        filters.push({
          key: 'date',
          value: `${singleDate}`,
          op: 'gt',
        });
      }
    }

    // Aggiunge il filtro per il titolo, se specificato nel form.
    if (formValues.title) {
      filters.push({
        key: 'title',
        value: `.*${formValues.title}.*`,
        op: 're',
      });
    }

    // Aggiunge il filtro per l'ID, se specificato nel form.
    if (formValues.id) {
      filters.push({
        key: 'key',
        value: `.*${formValues.id}.*`,
        op: 're',
      });
    }

    // Oggetto che contiene la richiesta da inviare al server.
    let body = {
      requestUUID: '11',
      filters: filters,
      'user-id': '11',
    };

    // Intestazioni per la richiesta HTTP.
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Impostazioni predefinite per l'offset e il limite di risultati.
    let defaultOffset = '';
    let defaultLimit = '';
    defaultOffset = '0';
    defaultLimit = '5000';
    let params = new HttpParams();
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    // Opzioni per la richiesta HTTP.
    const options = {
      params: params,
    };

    // Invia la richiesta al server e restituisce un Observable contenente i risultati filtrati.
    return this.http
      .post<any>(this.cashUrl + 'api/public/searchbiblio', body, options)
      .pipe(
        // Estrae solo i risultati dalla risposta.
        map((res) => res.results),
        // Mappa i risultati in un formato più leggibile.
        map((books: any[]) =>
          books.map((book) => ({
            abstractNote: book.params['Abstract Note']?.join('; ') || '',
            author: book.params['Author']?.join('; ') || '',
            citedRangeEntry: book.params['Cited Range Entry']?.join('; ') || '',
            citedRangePage: book.params['Cited Range Page']?.join('; ') || '',
            date: book.params['Date']?.join('; ') || '',
            editor: book.params['Editor']?.join('; ') || '',
            journalArticleTitle: book.params['Publication Title']?.join('; ') || '',
            isbn: book.params['ISBN']?.join('; ') || '',
            issue: book.params['Issue']?.join('; ') || '',
            itemType: book.params['Item Type']?.join('; ') || '',
            libraryCatalog: book.params['Library Catalog']?.join('; ') || '',
            key: book.params['Key']?.join('; ') || '',
            numberOfVolumes: book.params['Number Of Volumes']?.join('; ') || '',
            pages: book.params['Pages']?.join('; ') || '',
            place: book.params['Place']?.join('; ') || '',
            publicationYear: book.params['Publication Year']?.join('; ') || '',
            publisher: book.params['Publisher']?.join('; ') || '',
            serires: book.params['Series']?.join('; ') || '',
            type: book.params['Item Type']?.join('; ') || '',
            title: book.params['Title']?.join('; ') || '',
            url: book.params['Url']?.join('; ') || '',
            volume: book.params['Volume']?.join('; ') || '',
          }))
        )
      );
  }

  // Array per memorizzare i risultati della ricerca
  cachedResults: any[] = [];

  // Funzione per combinare i risultati della ricerca
  combineResults(formValues: any, f?: number, r?: number): Observable<any> {
    // Variabili per controllare se la ricerca riguarda libri o attestazioni
    let startBook: boolean = false;
    let startAttestation: boolean = false;

    // Azzeramento dell'array dei risultati memorizzati
    this.cachedResults = [];

    // Verifica se la ricerca riguarda esclusivamente le attestazioni
    if (
      !formValues.author &&
      !formValues.date &&
      !formValues.title &&
      !formValues.id
    ) {
      startBook = false;
      startAttestation = true;
    } else if (
      !formValues.word &&
      !formValues.location &&
      !formValues.inscriptionId
    ) {
      // Verifica se la ricerca riguarda esclusivamente i libri
      startAttestation = false;
      startBook = true;
    } else {
      // Altrimenti, la ricerca coinvolge sia libri che attestazioni
      startAttestation = true;
      startBook = true;
    }

    // Eseguo le ricerche separate per libri e attestazioni
    const booksSearch = this.filterBooks(formValues);
    const attestationsSearch = this.filterAttestations(formValues);

    // Combinazione dei risultati delle ricerche
    return forkJoin([booksSearch, attestationsSearch]).pipe(
      map(([booksResult, attestationsResult]) => {
        // Se la ricerca riguarda solo i libri, restituisco i risultati dei libri
        if (startBook && !startAttestation) {
          this.cachedResults = booksResult;
          return booksResult;
        }

        // Se la ricerca riguarda solo le attestazioni, mappo gli elementi di attestationsResult come Book
        if (startAttestation && !startBook) {
          this.cachedResults = attestationsResult;
          return attestationsResult;
        }

        // Se la ricerca coinvolge sia libri che attestazioni, combino i risultati
        if (startBook && startAttestation) {
          // Creo una mappa degli elementi dell'array più corto
          const shorterArrayIndex = new Map();
          const [firstArray, secondArray] =
            booksResult.length < attestationsResult.length
              ? [booksResult, attestationsResult]
              : [attestationsResult, booksResult];

          firstArray.forEach((item) => shorterArrayIndex.set(item.key, item));

          // Filtraggio dell'array più lungo utilizzando l'indice creato
          const commonElements = secondArray.filter((item) =>
            shorterArrayIndex.has(item.key)
          );

          this.cachedResults = commonElements;
          return commonElements;
        }

        // Se nessuna delle condizioni sopra è verificata, restituisco un array vuoto
        return [];
      })
    );
  }

  // Funzione che restituisce i risultati memorizzati nella cache
  getCachedResults() {
    return this.cachedResults;
  }

  // Funzione che svuota la cache dei risultati
  emptyCachedResults() {
    this.cachedResults = [];
  }

  // Metodo per ottenere i dettagli di un libro mediante una richiesta HTTP POST
  getBookDetails(key: string): Observable<any> {
    // Corpo della richiesta HTTP
    let body = {
      requestUUID: '11',
      filters: [
        {
          key: 'key',
          value: `${key}`,
          op: 'eq',
        },
      ],
      'user-id': '11',
    };

    // Impostazione dei valori di default per offset e limit
    let defaultOffset = 0;
    let defaultLimit = 8;

    // Creazione dei parametri per la richiesta HTTP
    let params = new HttpParams();
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    // Opzioni per la richiesta HTTP
    const options = {
      params: params,
    };

    // Effettua una richiesta HTTP POST e mappa la risposta
    return this.http
      .post<any>(this.cashUrl + 'api/public/searchbiblio', body, options)
      .pipe(
        // Estrae solo i risultati dalla risposta
        map((res) => res.results),
        // Mappa i risultati per estrarre i dettagli del primo libro, se presente
        map((books: any[]) =>
          books.length > 0
            ? {
                abstractNote:
                  books[0].params['Abstract Note']?.join('; ') || '',
                author: books[0].params['Author']?.join('; ') || '',
                date: books[0].params['Date']?.join('; ') || '',
                editor: books[0].params['Editor']?.join('; ') || '',
                isbn: books[0].params['ISBN']?.join('; ') || '',
                itemType: books[0].params['Item Type']?.join('; ') || '',
                key: books[0].params['Key']?.join('; ') || '',
                pages: books[0].params['Pages']?.join('; ') || '',
                place: books[0].params['Place']?.join('; ') || '',
                publicationYear:
                  books[0].params['Publication Year']?.join('; ') || '',
                publisher: books[0].params['Publisher']?.join('; ') || '',
                title: books[0].params['Title']?.join('; ') || '',
                url: books[0].params['Url']?.join('; ') || '',
                volume: books[0].params['Volume']?.join('; ') || '',
              }
            : null
        ) // Restituisce il primo elemento se esiste, altrimenti null
      );
  }

  // Funzione per ottenere le attestazioni tramite una chiave di libro
  getAttestationsByBookKey(bookKey: string): Observable<any> {
    // Imposta gli header per la richiesta HTTP
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Imposta i parametri per la richiesta HTTP
    let params = new HttpParams()
      .set(
        'query',
        `[_doc.bibliography.corresp="http://zotero.org/groups/2552746/items/${bookKey}"]`
      )
      .set('offset', '0')
      .set('limit', '500');

    // Esegue una richiesta POST all'endpoint specificato, per ottenere le attestazioni
    return this.http
      .post<any>(this.cashUrl + 'api/public/searchFiles', params.toString(), {
        headers: headers,
      })
      .pipe(
        // Mappa la risposta per ottenere solo i file
        map((res) => res.files),
        // Mappa i dati ottenuti per la visualizzazione
        map((res) => this.textService.mapData(res))
      );
  }

  // Funzione per ottenere le annotazioni
  getAnnotations(anno: any) {
    // Esegue richieste parallele per ottenere le annotazioni per ogni elemento nell'array
    return forkJoin(
      anno.map((el: any) => {
        // Ottiene l'annotazione per l'elemento specificato
        return this.textService.getAnnotation(el['element-id']);
      })
    ).pipe(
      // Unisce gli array di annotazioni in un unico array
      map((arrays: any) => [].concat(...arrays)),
      // Emette i dati senza modifiche, ma conserva la condivisione dei dati in cache
      tap((res) => res),
      // Condivide il risultato dell'observable per le sottoscrizioni multiple
      shareReplay()
    );
  }
}
