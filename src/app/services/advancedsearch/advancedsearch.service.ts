import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Form, FormGroup } from '@angular/forms';
import {
  BehaviorSubject,
  concatAll,
  forkJoin,
  lastValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import { environment } from 'src/environments/environment';
import { LexicalElement, LexiconService } from '../lexicon/lexicon.service';
import {
  AnnotationsRows,
  GetFilesResponse,
  TextMetadata,
  TextsService,
} from '../text/text.service';

// Array contenente i campi per il lessico, includendo testo, tipo, parte del discorso,
// autore, lingua, stato dell'ingresso lessicale, testo della forma,
// autore della forma, etichetta dell'elemento lessicale e IRI dell'elemento lessicale
const lexiconFields = [
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

// Array contenente i campi specifici per un'entrata lessicale,
// come testo, tipo, parte del discorso, autore, lingua e stato dell'entrata
const lexicalEntryFields = [
  'lexicalEntryText',
  'lexicalEntryType',
  'lexicalEntryPos',
  'lexicalEntryAuthor',
  'lexicalEntryLanguage',
  'lexicalEntryStatus',
];

// Array contenente i campi per la forma delle parole, includendo il testo della forma e l'autore
const formFields = ['formText', 'formAuthor'];

// Array contenente i campi per l'elemento lessicale, specificando l'etichetta e l'IRI
const lexicalElementFields = ['lexicalElementLabel', 'lexicalElementIRI'];

// Array contenente i campi per le iscrizioni, che includono la parola, modalità di ricerca della parola,
// titolo, id, lingua, alfabeto, data di origine (non prima di e non dopo di), nome moderno,
// tipo di iscrizione, tipo di oggetto, materiale, ductus e tipo di divisione della parola
const inscriptionFields = [
  'word',
  'wordSearchMode',
  'title',
  'id',
  'language',
  'alphabet',
  'dateOfOriginNotBefore',
  'dateOfOriginNotAfter',
  'modernName',
  'inscriptionType',
  'objectType',
  'material',
  'ductus',
  'wordDivisionType',
];

// Array contenente i campi per la bibliografia, che include titolo, ID, data e autore della bibliografia
const bibliographyFields = [
  'bibliographyTitle',
  'bibliographyID',
  'bibliographyDate',
  'bibliographyAuthor',
];

@Injectable({
  providedIn: 'root',
})
export class AdvancedsearchService {
  private lexoUrl = environment.lexoUrl;
  private cashUrl = environment.cashUrl;
  private zoteroUrl = environment.zoteroUrl;

  private attestationsSubject = new BehaviorSubject<TextMetadata[]>([]);
  private filteredResults: TextMetadata[] = [];
  attestations$: Observable<TextMetadata[]> =
    this.attestationsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private lexiconService: LexiconService,
    private inscriptionService: TextsService
  ) {}

  /**
   * Questo metodo esegue una query incrociata utilizzando i valori del form e il modulo di ricerca avanzata.
   * Restituisce un Observable contenente i risultati della query incrociata.
   * @param formValues Valori del form
   * @param advancedSearchForm Modulo di ricerca avanzata
   * @returns Un Observable contenente i risultati della query incrociata
   */
  crossQuery(formValues: any, advancedSearchForm: FormGroup): Observable<any> {
    // Esegue la ricerca nel lessico
    const lexiconSearch = this.filterLexicon(formValues, advancedSearchForm);

    // Esegue la ricerca nelle iscrizioni
    const inscriptionSearch = this.filterInscription(
      formValues,
      advancedSearchForm
    );

    // Esegue la ricerca nella bibliografia
    const bibliographySearch = this.filterBibliography(
      formValues,
      advancedSearchForm
    );

    return forkJoin([
      lexiconSearch,
      inscriptionSearch,
      bibliographySearch,
    ]).pipe(
      switchMap(([lexiconSearch, inscriptionSearch, bibliographySearch]) => {
        // Se la ricerca nel lessico o nella bibliografia non è vuota,
        // crea query CQL basate sui risultati ottenuti dal lessico e/o dalla bibliografia,
        // quindi effettua una nuova ricerca combinata con i valori del form.
        let lexiconCQL: string[] = [];
        let bibliographyCQL: string[] = [];
        let inscriptionCQL: string[] = [];

        if (lexiconSearch.length > 0 || bibliographySearch.length > 0) {
          if (
            lexiconSearch &&
            typeof lexiconSearch != 'string' &&
            lexiconSearch.length > 0
          ) {
            lexiconCQL = this.CQLLexiconBuilder(lexiconSearch);
          } else if (typeof lexiconSearch == 'string') {
            const check = lexiconSearch.split('_').pop();
            if (check == 'entry') {
              lexiconCQL.push(`attestation.lexicalEntry=="${lexiconSearch}"`);
            } else if (check == 'form') {
              lexiconCQL.push(`attestation="${lexiconSearch}"`);
            }
          }

          if (bibliographySearch && bibliographySearch.length > 0) {
            bibliographyCQL = this.CQLBibliographyBuilder(bibliographySearch);
          }

          inscriptionCQL = this.CQLInscriptionBuilder(
            formValues,
            advancedSearchForm
          );

          // Combina le query CQL per lessico, bibliografia e iscrizioni
          const combineQueries = (
            lexiconCQL: string[],
            bibliographyCQL: string[],
            inscriptionCQL: string[]
          ): string => {
            let allQueries: string[] = [];

            if (lexiconCQL.length > 0) {
              allQueries.push(`(${lexiconCQL.join('|')})`);
            }

            if (bibliographyCQL.length > 0) {
              allQueries.push(`(${bibliographyCQL.join('|')})`);
            }

            if (inscriptionCQL.length > 0) {
              allQueries.push(`(${inscriptionCQL.join(' & ')})`);
            }

            const query =
              allQueries.length > 0 ? `[${allQueries.join(' & ')}]` : '';
            return query;
          };

          const finalQuery = combineQueries(
            lexiconCQL,
            bibliographyCQL,
            inscriptionCQL
          );

          // Imposta gli header per la richiesta HTTP
          const headers = new HttpHeaders({
            'Content-Type': 'application/x-www-form-urlencoded',
          });

          // Imposta i parametri per la richiesta HTTP
          let params = new HttpParams()
            .set('query', finalQuery)
            .set('offset', '0')
            .set('limit', '5000');

          // Esegue la richiesta HTTP
          return this.http
            .post<GetFilesResponse>(
              this.cashUrl + 'api/public/searchFiles',
              params.toString(),
              { headers: headers }
            )
            .pipe(
              map((res) => res.files),
              map((texts) => this.inscriptionService.mapData(texts)),
              tap((res) => (this.filteredResults = res)),
              shareReplay()
            );
        } else {
          // Se la ricerca nel lessico e nella bibliografia è vuota, restituisce i risultati delle iscrizioni
          return of(inscriptionSearch);
        }
      }),
      // Stampa i risultati della query incrociata
      tap((res) => console.log(res))
    );
  }

  // Funzione per filtrare le iscrizioni sulla base dei valori del form e del form di ricerca avanzata
  filterInscription(formValues: any, advancedSearchForm: FormGroup) {
    let queryParts: string[] = [];

    // Verifica se è necessario chiamare Cash sulla base dei campi delle iscrizioni
    const shouldCallCash = inscriptionFields.some((field) => {
      const control = advancedSearchForm.get(field);
      return (
        control &&
        control.touched &&
        (control.value !== null || control.value !== '')
      );
    });

    // Verifica se è necessario chiamare LexO sulla base dei campi del lessico
    const shouldCallLexO = lexiconFields.some((field) => {
      const control = advancedSearchForm.get(field);
      return (
        control &&
        control.touched &&
        (control.value !== null || control.value !== '')
      );
    });

    console.log(shouldCallCash);

    // Se è necessario chiamare Cash ma non LexO
    if (shouldCallCash && !shouldCallLexO) {
      // Costruisce la query CQL per le iscrizioni
      queryParts = this.CQLInscriptionBuilder(formValues, advancedSearchForm);
      const query = queryParts.length > 0 ? `[${queryParts.join(' &')}]` : '';

      // Se la query non è vuota
      if (query !== '') {
        // Imposta gli header per la richiesta HTTP
        const headers = new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        });

        // Imposta i parametri per la richiesta HTTP
        let params = new HttpParams()
          .set('query', query)
          .set('offset', '0')
          .set('limit', '1000');

        // Effettua una richiesta HTTP POST per ottenere i file filtrati
        return this.http
          .post<GetFilesResponse>(
            this.cashUrl + 'api/public/searchFiles',
            params.toString(),
            { headers: headers }
          )
          .pipe(
            map((res) => res.files),
            map((texts) => this.inscriptionService.mapData(texts)),
            tap((res) => (this.filteredResults = res)),
            shareReplay()
          );
      } else {
        // Se la query è vuota, restituisce un observable di un array vuoto
        return of([]);
      }
    } else {
      // Se non è necessario chiamare Cash o è necessario chiamare anche LexO, restituisce un observable di un array vuoto
      return of([]);
    }
  }

  /**
   * Questa funzione filtra i valori del modulo di ricerca avanzata in base ai campi specifici del lessico.
   * @param formValues - Valori del modulo di ricerca avanzata.
   * @param advancedSearchForm - Oggetto FormGroup del modulo di ricerca avanzata.
   * @returns Un Observable contenente i risultati della ricerca filtrati.
   */
  filterLexicon(formValues: any, advancedSearchForm: FormGroup) {
    // Verifica se almeno uno dei campi del lessico è stato toccato
    const shouldCallLexO = lexiconFields.some(
      (field) =>
        formValues[field] !== null && advancedSearchForm.get(field)?.touched
    );

    if (shouldCallLexO) {
      // Verifica se è necessario interrogare le voci lessicali
      const shouldQueryLexicalEntries = lexicalEntryFields.some((field) => {
        const control = advancedSearchForm.get(field);
        return (
          control &&
          control.touched &&
          control.value !== null &&
          control.value !== ''
        );
      });

      // Verifica se è necessario interrogare le forme
      const shouldQueryForms = formFields.some((field) => {
        const control = advancedSearchForm.get(field);
        return (
          control &&
          control.touched &&
          (control.value !== null || control.value !== '')
        );
      });

      // Verifica se è necessario interrogare gli elementi lessicali
      const shouldQueryLexicalElement = lexicalElementFields.some((field) => {
        const control = advancedSearchForm.get(field);
        return (
          control &&
          control.touched &&
          (control.value !== null || control.value !== '')
        );
      });

      if (shouldQueryLexicalEntries) {
        // Costruisce il payload per l'interrogazione delle voci lessicali
        const payload = {
          text: formValues.lexicalEntryText ? formValues.lexicalEntryText : '',
          searchMode: formValues.lexicalEntrySearchMode,
          type: formValues.lexicalEntryType ? formValues.lexicalEntryType : '',
          pos: formValues.lexicalEntryPos ? formValues.lexicalEntryPos : '',
          formType: 'entry',
          author: formValues.lexicalEntryAuthor
            ? formValues.lexicalEntryAuthor
            : '',
          lang: formValues.lexicalEntryLanguage
            ? formValues.lexicalEntryLanguage
            : '',
          status: formValues.lexicalEntryStatus
            ? formValues.lexicalEntryStatus
            : '',
          offset: 0,
          limit: 500,
        };

        // Restituisce un Observable contenente i risultati dell'interrogazione delle voci lessicali
        return this.lexiconService.getLexicalEntryList(payload);
      } else if (shouldQueryForms) {
        // Costruisce il payload per l'interrogazione delle forme
        const payload = {
          text: formValues.formText ? formValues.formText : '',
          searchMode: formValues.formSearchMode,
          representationType: 'writtenRep',
          author: formValues.formAuthor ? formValues : '',
          offset: 0,
          limit: 500,
        };

        // Restituisce un Observable contenente i risultati dell'interrogazione delle forme
        return this.lexiconService.getFormsListAdvanced(payload);
      } else if (shouldQueryLexicalElement) {
        // Restituisce l'IRI dell'elemento lessicale come Observable
        return of(formValues.lexicalElementIRI);
      } else {
        // Nessun tipo di interrogazione richiesto, restituisce un Observable vuoto
        return of([]);
      }
    } else {
      // Nessun campo del lessico è stato toccato, restituisce un Observable vuoto
      return of([]);
    }
  }

  /**
   * Funzione che filtra la bibliografia in base ai valori forniti e restituisce i risultati ottenuti dal servizio Zotero.
   * @param formValues Valori del modulo del form.
   * @param advancedSearchForm Oggetto FormGroup per l'interrogazione avanzata.
   * @returns Observable contenente i risultati della bibliografia filtrata.
   */
  filterBibliography(formValues: any, advancedSearchForm: FormGroup) {
    // Verifica se dovresti fare la chiamata a Zotero
    const shouldCallZotero = bibliographyFields.some(
      (field) =>
        formValues[field] !== null &&
        formValues[field] !== '' &&
        advancedSearchForm.get(field)?.touched
    );

    if (shouldCallZotero) {
      // Costruisce la query per la ricerca avanzata
      if (
        !formValues.bibliographyAuthor &&
        !formValues.bibliographyDate &&
        !formValues.bibliographyTitle &&
        !formValues.bibliographyID
      ) {
        // Se non ci sono parametri di ricerca, restituisce un observable vuoto
        return of([]);
      }
      let filters = [];

      if (formValues.bibliographyAuthor) {
        // Filtra per autore
        filters.push({
          key: 'author',
          value: `.*${formValues.bibliographyAuthor}.*`,
          op: 're',
        });
      }

      if (formValues.bibliographyDate) {
        // Filtra per data
        let start, end;
        let singleDate;
        // Se è un range di date
        if (Array.isArray(formValues.bibliographyDate)) {
          start = formValues.bibliographyDate[0].getFullYear().toString();
          end = formValues.bibliographyDate[1].getFullYear().toString();

          filters.push({
            key: 'date',
            value: `${start}`,
            op: 'gt',
          });

          filters.push({
            key: 'date',
            value: `${end}`,
            op: 'lt',
          });
        } else {
          // Se è una singola data
          singleDate = formValues.bibliographyDate.getFullYear().toString();

          filters.push({
            key: 'date',
            value: `${singleDate}`,
            op: 'gt',
          });
        }
      }

      if (formValues.bibliographyTitle) {
        // Filtra per titolo
        filters.push({
          key: 'title',
          value: `.*${formValues.bibliographyTitle}.*`,
          op: 're',
        });
      }

      if (formValues.bibliographyID) {
        // Filtra per ID bibliografico
        filters.push({
          key: 'id',
          value: `.*${formValues.bibliographyID}.*`,
          op: 're',
        });
      }

      let body = {
        requestUUID: '11',
        filters: filters,
        'user-id': '11',
      };
      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
      });

      let defaultOffset = '';
      let defaultLimit = '';
      defaultOffset = '0';
      defaultLimit = '5000';
      let params = new HttpParams();
      params = params.set('offset', defaultOffset);
      params = params.set('limit', defaultLimit);

      const options = {
        params: params,
      };

      // Esegue la chiamata HTTP per ottenere i risultati filtrati dalla bibliografia
      return this.http
        .post<any>(this.cashUrl + 'api/public/searchbiblio', body, options)
        .pipe(
          map((res) => res.results),
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
              publicationYear:
                book.params['Publication Year']?.join('; ') || '',
              publisher: book.params['Publisher']?.join('; ') || '',
              title: book.params['Title']?.join('; ') || '',
              url: book.params['Url']?.join('; ') || '',
              volume: book.params['Volume']?.join('; ') || '',
            }))
          )
        );
    } else {
      // Se non è necessario effettuare la chiamata a Zotero, restituisce un observable vuoto
      return of([]);
    }
  }

  /**
   * Costruisce una query CQL (Common Query Language) per il lessico basata sui risultati forniti.
   * @param lexiconResults - Risultati della ricerca lessicale
   * @returns Array contenente la query CQL costruita
   */
  CQLLexiconBuilder(lexiconResults: any[]) {
    let queryParts: string[] = [];
    let isLexicalEntry: boolean = false;

    lexiconResults.forEach((element) => {
      // Verifica se l'elemento è una voce lessicale
      if (element.lexicalEntry && !element.form) {
        isLexicalEntry = true;
        queryParts.push(`${element.lexicalEntry}`);
      } else if (element.form) {
        // Altrimenti verifica se è una forma
        isLexicalEntry = false;
        queryParts.push(`${element.form}`);
      }
    });

    if (isLexicalEntry) {
      return [`attestation.lexicalEntry=="${queryParts.join('|')}"`];
    } else {
      return [`attestation="${queryParts.join('|')}"`];
    }
  }

  /**
   * Costruisce una query CQL (Common Query Language) per le iscrizioni basata sui valori del modulo di ricerca avanzata.
   * @param formValues - Valori del modulo di ricerca
   * @param advancedSearchForm - Oggetto FormGroup per il modulo di ricerca avanzata
   * @returns Array contenente la query CQL costruita
   */
  CQLInscriptionBuilder(formValues: any, advancedSearchForm: FormGroup) {
    let queryParts: string[] = [];

    // Aggiunge la parte della query per l'ID antico
    queryParts.push(`_doc.itAnt_ID=".*"`);

    // Verifica se è stata toccata la casella di ricerca della parola e aggiunge la parte corrispondente della query
    if (advancedSearchForm.get('word')?.touched && formValues.word) {
      switch (formValues.wordSearchMode) {
        case 'startsWith':
          queryParts.push(` word="${formValues.word}.*"`);
          break;
        case 'contains':
          queryParts.push(` word=".*${formValues.word}.*"`);
          break;
        case 'endsWith':
          queryParts.push(` word=".*${formValues.word}"`);
          break;
        case 'equals':
          queryParts.push(` word=="${formValues.word}"`);
          break;
      }
    }

    // Aggiunge la parte della query per il titolo
    if (advancedSearchForm.get('title')?.touched && formValues.title) {
      queryParts.push(`_doc.title=="${formValues.title}"`);
    }

    // Aggiunge la parte della query per l'ID
    if (advancedSearchForm.get('id')?.touched && formValues.id) {
      queryParts.push(`_doc.itAnt_ID=="${formValues.id}.*"`);
    }

    // Aggiunge la parte della query per l'altro ID
    if (advancedSearchForm.get('otherId')?.touched && formValues.otherId) {
      queryParts.push(
        `_doc.traditionalIDs.traditionalID=="${formValues.otherId}"`
      );
    }

    // Aggiunge la parte della query per la lingua
    if (advancedSearchForm.get('language')?.touched && formValues.language) {
      queryParts.push(`_doc.language.ident=="${formValues.language}"`);
    }

    // Aggiunge la parte della query per l'alfabeto
    if (advancedSearchForm.get('alphabet')?.touched && formValues.alphabet) {
      queryParts.push(`_doc.alphabet=="${formValues.alphabet}"`);
    }

    // Aggiunge la parte della query per la data di origine non prima di
    if (
      advancedSearchForm.get('dateOfOriginNotBefore')?.touched &&
      formValues.dateOfOriginNotBefore
    ) {
      queryParts.push(
        `_doc.dateOfOriginNotBefore >="${formValues.dateOfOriginNotBefore}"`
      );
    }

    // Aggiunge la parte della query per la data di origine non dopo
    if (
      advancedSearchForm.get('dateOfOriginNotAfter')?.touched &&
      formValues.dateOfOriginNotAfter
    ) {
      queryParts.push(
        `_doc.dateOfOriginNotAfter <="${formValues.dateOfOriginNotAfter}"`
      );
    }

    // Aggiunge la parte della query per il nome moderno
    if (
      advancedSearchForm.get('modernName')?.touched &&
      formValues.modernName
    ) {
      queryParts.push(
        `_doc.originalPlace.modernNameUrl=="${formValues.modernName}"`
      );
    }

    // Aggiunge la parte della query per il tipo di iscrizione
    if (
      advancedSearchForm.get('inscriptionType')?.touched &&
      formValues.inscriptionType
    ) {
      queryParts.push(`_doc.inscriptionType=="${formValues.inscriptionType}"`);
    }

    // Aggiunge la parte della query per il tipo di oggetto
    if (
      advancedSearchForm.get('objectType')?.touched &&
      formValues.objectType
    ) {
      queryParts.push(`_doc.support.objectType=="${formValues.objectType}"`);
    }

    // Aggiunge la parte della query per il materiale
    if (advancedSearchForm.get('material')?.touched && formValues.material) {
      queryParts.push(`_doc.support.material=="${formValues.material}"`);
    }

    // Aggiunge la parte della query per il ductus
    if (advancedSearchForm.get('ductus')?.touched && formValues.ductus) {
      queryParts.push(`_doc.bodytextpart.ductus=="${formValues.ductus}"`);
    }

    // Aggiunge la parte della query per il tipo di divisione delle parole
    if (
      advancedSearchForm.get('wordDivisionType')?.touched &&
      formValues.wordDivisionType
    ) {
      queryParts.push(
        `_doc.wordDivisionType=="${formValues.wordDivisionType}"`
      );
    }

    return queryParts;
  }

  /**
   * Costruisce una query CQL (Common Query Language) per la bibliografia basata sui risultati forniti.
   * @param bibliographyResults - Risultati della ricerca bibliografica
   * @returns Array contenente la query CQL costruita
   */
  CQLBibliographyBuilder(bibliographyResults: any[]) {
    let queryParts: string[] = [];

    bibliographyResults.forEach((element) => {
      queryParts.push(`${element.key}`);
    });

    return [`attestation.bibliography.key=="${queryParts.join('|')}"`];
  }

  // Funzione per ripristinare le attestazioni filtrate.
  restoreFilterAttestations() {
    // Svuota l'array dei risultati filtrati.
    this.filteredResults = [];
    // Notifica agli osservatori che l'array delle attestazioni è stato aggiornato a vuoto.
    this.attestationsSubject.next([]);
  }

  // Metodo per ottenere i risultati filtrati.
  getFilteredResults() {
    return this.filteredResults;
  }
}
