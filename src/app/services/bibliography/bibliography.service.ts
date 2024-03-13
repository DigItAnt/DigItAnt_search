import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, concat, concatAll, concatMap, EMPTY, expand, filter, flatMap, forkJoin, map, Observable, of, shareReplay, single, switchMap, tap, throwError, toArray } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Annotation, AnnotationsRows, Attestation, GetCountFiles, GetFilesResponse, TextMetadata, TextsService } from '../text/text.service';

export interface Book {
  author : string,
  editor : string,
  date : string,
  key : string,
  references : number,
  title : string,
}

@Injectable({
  providedIn: 'root'
})
export class BibliographyService {

  private lexoUrl = environment.lexoUrl;
  private cashUrl = environment.cashUrl;
  private zoteroUrl = environment.zoteroUrl;


  constructor( private http: HttpClient, private textService : TextsService) { }

  

  
  filterByLetter(letter: string): Observable<any[]> {
    let body = {
      "requestUUID": "11",
      "filters": [
        {
          "key": "author",
          "value": `^${letter}`,
          "op": "re"
        }
      ],
      "user-id": "11"
    }

    const defaultOffset = '0';
    const defaultLimit = '500';

    let params = new HttpParams();  
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    const options = {
      params: params
    };
    
    return this.http.post<any>(this.cashUrl + "api/public/searchbiblio", body, options).pipe(
      map(res => res.results),
      map((books:any[]) => books.map(book => ({
        abstractNote : book.params['Abstract Note']?.join('; ') || '',
        author: book.params['Author']?.join('; ') || '',
        editor : book.params['Editor']?.join('; ') || '',
        isbn: book.params['ISBN']?.join('; ') || '',
        itemType: book.params['Item Type']?.join('; ') || '',
        key: book.params['Key']?.join('; ') || '',  
        pages: book.params['Pages']?.join('; ') || '',
        place: book.params['Place']?.join('; ') || '',
        publicationYear : book.params['Publication Year']?.join('; ') || '',
        publisher : book.params['Publisher']?.join('; ') || '',
        title: book.params['Title']?.join('; ') || '',
        url : book.params['Url']?.join('; ') || ''
      }))),
      map(books => {
        books.sort((a, b) => {
          const getRelevantAuthorName = (author: string) => {
            return author.split('; ')
                         .map(name => name.trim())
                         .find(name => name.startsWith(letter)) || author;
          };
          
          const authorA = getRelevantAuthorName(a.author);
          const authorB = getRelevantAuthorName(b.author);
          
          return authorA.localeCompare(authorB);
        });
    
        return books; // Assicurati di ritornare 'books' qui
      })
    )
  }


  paginationItems(first?: number, row?: number) : Observable<any[]> {
    let body = {};
    let defaultOffset = 0;
    let defaultLimit = 0;
    body = {
      "requestUUID": "11",
      "filters": [
        {
          "key": "key",
          "value": `.*`,
          "op": "re"
        }
      ],
      "user-id": "11"
    }
    
    if((first && row) || (first == 0 && row)){
      defaultOffset = first;
      defaultLimit = row;
    }else{
      defaultOffset = 0;
      defaultLimit = 8;
    }
    let params = new HttpParams();  
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    const options = {
      params: params
    };
    
    return this.http.post<any>(this.cashUrl + "api/public/searchbiblio", body, options).pipe(
      map(res => res.results),
      map((books:any[]) => books.map(book => ({
        abstractNote : book.params['Abstract Note']?.join('; ') || '',
        author: book.params['Author']?.join('; ') || '',
        date: book.params['Date']?.join('; ') || '',
        editor : book.params['Editor']?.join('; ') || '',
        isbn: book.params['ISBN']?.join('; ') || '',
        itemType: book.params['Item Type']?.join('; ') || '',
        key: book.params['Key']?.join('; ') || '',  
        pages: book.params['Pages']?.join('; ') || '',
        place: book.params['Place']?.join('; ') || '',
        publicationYear : book.params['Publication Year']?.join('; ') || '',
        publisher : book.params['Publisher']?.join('; ') || '',
        title: book.params['Title']?.join('; ') || '',
        url : book.params['Url']?.join('; ') || '',
        volume: book.params['Volume']?.join('; ') || '',
      }))),
    )
  }

  countTotalBooks(extParam? : any) : Observable<number> {
    let body = {};
    let defaultOffset = '';
    let defaultLimit = '';

    if(!extParam){
      body = {
        "requestUUID": "11",
        "filters": [
          {
            "key": "key",
            "value": `.*`,
            "op": "re"
          }
        ],
        "user-id": "11"
      }

      defaultOffset = '0';
      defaultLimit = '5000';
    }else{
      defaultOffset = '0';
      defaultLimit = '500';
      
    }

    let params = new HttpParams();  
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    const options = {
      params: params
    };
    
    return this.http.post<any>(this.cashUrl + "api/public/searchbiblio", body, options).pipe(
      map(res => res.results.length),
    )
  }

  filterAttestations(formValues : any, f?: number, r?:number) {
    // Creazione della query
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    let queryParts: string[] = [];
  
    if (formValues.location) {
      queryParts.push(`_doc.originalPlace.ancientName=="${formValues.location}"`);
    }
  
    if (formValues.inscriptionId) {
      queryParts.push(`_doc.fileID=".*${formValues.inscriptionId}.*"`);
    }
  
    if (formValues.word) {
      queryParts.push(` word=".*${formValues.word}.*"`);
    }
  
    const query = queryParts.length > 0 ? `[${queryParts.join(' &')}]` : '';

    let params = new HttpParams()
            .set('query', query)
            .set('offset','0')
            .set('limit', '1000');

    if(query != ''){
      
      return this.http.post<GetFilesResponse>(this.cashUrl + "api/public/searchFiles", params.toString(), { headers: headers }).pipe(
        map(res => res.files),
        map(texts => this.textService.mapData(texts)),
        tap(res=> console.log(res)),
        map(res => res.map(item => item.bibliography)
                     .filter(bib => bib !== null && bib !== undefined) // Rimuove null e undefined
                     .reduce((acc, cur) => acc.concat(cur), [])),
        map(bibliographies => {
        const uniqueBibliographies: Record<string, any> = {}; // Specifica un tipo più esplicito
          bibliographies.forEach((bib:any) => {
            if(bib && bib.corresp && !uniqueBibliographies[bib.corresp]) {
              uniqueBibliographies[bib.corresp] = bib;
            }
          });
          return Object.values(uniqueBibliographies);
        }),
       
        map((books:any[]) => books.map(book => (this.mapBookByType(book)))), 
        tap(x => console.log(x)),
      );
    }else{
      return of([])
    }
  }

  mapBookByType(book : any){
    switch(book['type']){
      case 'journalArticle' : return this.mapJournalArticle(book);
      case 'book' : return this.mapBook(book);
      case 'bookSection' : return this.mapBookSection(book);
      default : return this.mapBook(book);
    }
  }

  mapJournalArticle(book : any){
    return {
      abstractNote : book['monogrNoteText'] || '',
      author: Array.isArray(book.monogrAuthors) && book.monogrAuthors.length > 0 ? 
        book.monogrAuthors.map((a:any) => `${a.forename} ${a.surname}`.trim()).join('; ') : 
        book.monogrAuthors && book.monogrAuthors.forename ? 
        `${book.monogrAuthors.forename} ${book.monogrAuthors.surname}`.trim() :

        book.analyticAuthors && (book.analyticAuthors.forename!= '' || book.analyticAuthors.surname != '')? 
        `${book.analyticAuthors.forename} ${book.analyticAuthors.surname}`.trim() : `${book.analyticAuthors.name} `,
      date: book['monogrDate'],
      editor : Array.isArray(book.monogrEditors) ? 
        book.monogrEditors.map((a:any) => `${a.forename} ${a.surname}`.trim()).join('; ') : 
        `${book.monogrEditors.forename} ${book.monogrEditors.surname}`.trim(),
      id: book['id'],
      isbn: book['monogrIdno'],
      itemType: book['type'],
      key: book['corresp'].split('/')[book['corresp'].split('/').length -1],  
      notes: book['notes'] || '',
      pages: book['citedRangeText'] || '',
      place: book['Place'],
      publicationYear : book['Publication Year'] || '',
      publisher : book['monogrPublisher'],
      title: book['monogrTitle']['text'],
      url : book['corresp'],
      volume: book['Volume'] || '',
    }
  }

  mapBook(book : any){
    return {
      abstractNote : book['monogrNoteText'] || '',
      author: Array.isArray(book.monogrAuthors) && book.monogrAuthors.length > 0 ? 
        book.monogrAuthors.map((a:any) => `${a.forename} ${a.surname}`.trim()).join('; ') : 
        book.monogrAuthors && book.monogrAuthors.forename /* ? 
        `${book.monogrAuthors.forename} ${book.monogrAuthors.surname}`.trim() :
        `${book.analyticAuthors.forename} ${book.analyticAuthors.surname}`.trim(), */,
      date: book['monogrDate'],
      editor : Array.isArray(book.monogrEditors) ? 
        book.monogrEditors.map((a:any) => `${a.forename} ${a.surname}`.trim()).join('; ') : 
        `${book.monogrEditors.forename} ${book.monogrEditors.surname}`.trim(),
      id: book['id'],
      isbn: book['monogrIdno'],
      itemType: book['type'],
      key: book['corresp'].split('/')[book['corresp'].split('/').length -1],  
      notes: book['notes'] || '',
      pages: book['citedRangeText'] || '',
      place: book['monogrPlace'],
      publicationYear : book['Publication Year'] || '',
      publisher : book['monogrPublisher'],
      title: book['monogrTitle']['text'],
      url : book['corresp'],
      volume: book['biblScope'] || '',
    }
  }

  mapBookSection(book : any){
    return {
      abstractNote : book['monogrNoteText'] || '',
      author: Array.isArray(book.monogrAuthors) && book.monogrAuthors.length > 0 ? 
        book.monogrAuthors.map((a:any) => `${a.forename} ${a.surname}`.trim()).join('; ') : 
        book.monogrAuthors && book.monogrAuthors.forename ? 
        `${book.monogrAuthors.forename} ${book.monogrAuthors.surname}`.trim() :
        `${book.analyticAuthors.forename} ${book.analyticAuthors.surname}`.trim(),
      date: book['monogrDate'],
      editor : Array.isArray(book.monogrEditors) ? 
        book.monogrEditors.map((a:any) => `${a.forename} ${a.surname}`.trim()).join('; ') : 
        `${book.monogrEditors.forename} ${book.monogrEditors.surname}`.trim(),
      id: book['id'],
      isbn: book['monogrIdno'],
      itemType: book['type'],
      key: book['corresp'].split('/')[book['corresp'].split('/').length -1],  
      notes: book['notes'] || '',
      pages: book['citedRangeText'] || '',
      place: book['monogrPubPlace'],
      publicationYear : book['monogrDate'] || '',
      publisher : book['monogrPublisher'],
      title: book['monogrTitle']['text'],
      url : book['corresp'],
      volume: book['biblScope'] || '',
    }
  }

  filterBooks(formValues: any, f?:number, r?:number): Observable<any[]> {
    if (!formValues.author && !formValues.date && !formValues.title && !formValues.id) {
      return of([]);
    }
    let filters = [];

    if (formValues.author) {
      filters.push({
        "key": "author",
        "value": `.*${formValues.author}.*`,
        "op": "re"
      });
    }
  
    if (formValues.date) {
      
      let start, end;
      let singleDate;
      //è un range
      if(Array.isArray(formValues.date)){
        start = formValues.date[0].getFullYear().toString();
        end = formValues.date[1].getFullYear().toString();

        filters.push({
          "key": "date",
          "value": `${start}`,
          "op": "gt"
        });

        filters.push({
          "key": "date",
          "value": `${end}`,
          "op": "lt"
        });


      }else{
        singleDate = formValues.date.getFullYear().toString();

        filters.push({
          "key": "date",
          "value": `${singleDate}`,
          "op": "gt"
        });
      }

      
    }
  
    if (formValues.title) {
      filters.push({
        "key": "title",
        "value": `.*${formValues.title}.*`,
        "op": "re"
      });
    }
  
    if (formValues.id) {
      filters.push({
        "key": "id",
        "value": `.*${formValues.id}.*`,
        "op": "re"
      });
    }
  
    let body = {
      "requestUUID": "11",
      "filters": filters,
      "user-id": "11"
    };
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    let defaultOffset = '';
    let defaultLimit = '';
    defaultOffset = '0';
    defaultLimit = '5000';
    let params = new HttpParams();  
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    const options = {
      params: params
    };
    
    return this.http.post<any>(this.cashUrl + "api/public/searchbiblio", body, options).pipe(
      map(res => res.results),
      map((books:any[]) => books.map(book => ({
        abstractNote : book.params['Abstract Note']?.join('; ') || '',
        author: book.params['Author']?.join('; ') || '',
        date: book.params['Date']?.join('; ') || '',
        editor : book.params['Editor']?.join('; ') || '',
        isbn: book.params['ISBN']?.join('; ') || '',
        itemType: book.params['Item Type']?.join('; ') || '',
        key: book.params['Key']?.join('; ') || '',  
        pages: book.params['Pages']?.join('; ') || '',
        place: book.params['Place']?.join('; ') || '',
        publicationYear : book.params['Publication Year']?.join('; ') || '',
        publisher : book.params['Publisher']?.join('; ') || '',
        title: book.params['Title']?.join('; ') || '',
        url : book.params['Url']?.join('; ') || '',
        volume: book.params['Volume']?.join('; ') || '',
      }))),
    )
  }

  cachedResults : any[] = [];

  combineResults(formValues: any, f?:number, r?:number): Observable<(any)> {

    let startBook : boolean = false; 
    let startAttestation : boolean = false;
    this.cachedResults = [];

    if (!formValues.author && !formValues.date && !formValues.title && !formValues.id) {
      startBook = false;
      startAttestation = true;
    }else if(!formValues.word && !formValues.location && !formValues.inscriptionId){
      startAttestation = false;
      startBook = true;
    }else{
      startAttestation = true;
      startBook = true;
    }

    

    //const booksSearch = this.filterBooks(formValues);
    const booksSearch = this.filterBooks(formValues);
    const attestationsSearch = this.filterAttestations(formValues);
    /* return of([]) */
    return forkJoin([booksSearch, attestationsSearch]).pipe(
      map(([booksResult, attestationsResult]) => {
        
        
        // Se findInternalObservable è true, restituisci solo bookResult
        if(startBook && !startAttestation) {
          this.cachedResults = booksResult;
          return booksResult;
        }
    
        // Se startAttestation è true, mappa gli elementi di attestationsResult come Book
        if(startAttestation && !startBook) {
          this.cachedResults = attestationsResult;
          return attestationsResult;
        }
    
        // Se entrambe le variabili sono true, combina i risultati
        if(startBook && startAttestation) {
          // Filtriamo i risultati delle attestazioni
          const shorterArrayIndex = new Map();
          const [firstArray, secondArray] = booksResult.length < attestationsResult.length ? [booksResult, attestationsResult] : [attestationsResult, booksResult];

          firstArray.forEach(item => shorterArrayIndex.set(item.key, item));

          // Ora filtra l'array più lungo usando l'indice
          const commonElements = secondArray.filter(item => shorterArrayIndex.has(item.key));

          this.cachedResults = commonElements;
          return commonElements;
        }
    
        // Se nessuna delle condizioni sopra è verificata, restituisci un array vuoto
        return [];
      }),
      
    );
  }

  getCachedResults(){
    return this.cachedResults;
  }

  emptyCachedResults(){
    this.cachedResults = [];
  }

  getBookDetails(key:string) : Observable<any>{
    let body = {
      "requestUUID": "11",
      "filters": [
        {
          "key": "key",
          "value": `${key}`,
          "op": "eq"
        }
      ],
      "user-id": "11"
    }

    let defaultOffset = 0;
    let defaultLimit = 8;

    let params = new HttpParams();  
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);

    const options = {
      params: params
    };
    
    return this.http.post<any>(this.cashUrl + "api/public/searchbiblio", body, options).pipe(
      map(res => res.results),
      map((books: any[]) => books.length > 0 ? ({
        abstractNote: books[0].params['Abstract Note']?.join('; ') || '',
        author: books[0].params['Author']?.join('; ') || '',
        date: books[0].params['Date']?.join('; ') || '',
        editor: books[0].params['Editor']?.join('; ') || '',
        isbn: books[0].params['ISBN']?.join('; ') || '',
        itemType: books[0].params['Item Type']?.join('; ') || '',
        key: books[0].params['Key']?.join('; ') || '',  
        pages: books[0].params['Pages']?.join('; ') || '',
        place: books[0].params['Place']?.join('; ') || '',
        publicationYear: books[0].params['Publication Year']?.join('; ') || '',
        publisher: books[0].params['Publisher']?.join('; ') || '',
        title: books[0].params['Title']?.join('; ') || '',
        url: books[0].params['Url']?.join('; ') || '',
        volume: books[0].params['Volume']?.join('; ') || '',
      }) : null), // Restituisce il primo elemento se esiste, altrimenti null
    );
  }

  getAttestationsByBookKey(bookKey: string): Observable<any> {

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    let params = new HttpParams()
      .set('query', `[_doc.itAnt_ID=".*" & attestation.bibliography.key=="${bookKey}"]`)
      .set('offset', '0')
      .set('limit', '500');



    return this.http.post<any>(this.cashUrl + "api/public/searchFiles", params.toString(), { headers: headers }).pipe(
      map(res => res.files),
      map(res => this.textService.mapData(res))
    )
  }

  getAnnotations(anno: any){
    
    return forkJoin(
      anno.map(
        (el : any) => {

          return this.textService.getAnnotation(el['element-id'])
        }
      )
    ).pipe(
      map((arrays : any) => [].concat(...arrays)),
      tap(res => res),
      shareReplay()
    )
  }
}