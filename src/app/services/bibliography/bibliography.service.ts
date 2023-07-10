import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, concat, concatAll, concatMap, EMPTY, expand, filter, flatMap, forkJoin, map, Observable, of, shareReplay, switchMap, tap, throwError, toArray } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Annotation, AnnotationsRows, Attestation, TextMetadata, TextsService } from '../text/text.service';

export interface Book {
  [key: string]: any;
  author : string,
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

  books$ : Observable<any> = this.getAllBooks().pipe(
    map((books:any[]) => books.map(book => ({
      author: book.author,
      date: book.date,
      key: book.publisher,  
      references: book.references,
      title: book.title
    }))),
    shareReplay()
  )

  constructor( private http: HttpClient, private textService : TextsService) { }

  getAllBooks(): any {
    return this.http.get<Book[]>(this.lexoUrl + "lexicon/data/bibliography").pipe(
      map(res => res),
    )
  }

  getIndexOfText(keyBook : string) : Observable<number> {
    return this.books$.pipe(
      map(texts => texts.findIndex((book: Book) => book.key == keyBook))
    )
  }

  getBookByIndex(index : number) : Observable<Book> {
    return this.books$.pipe(
      map(texts => texts[index])
    )
  }

  getBookKeyByIndex(index : number) : Observable<string> {
    return this.books$.pipe(
      map(book => book[index].key)
    )
  }

  filterByAuthor(authorName: string): Observable<Book[]> {
    return this.books$.pipe(
      map(books => books.filter((text : Book) => {
        return text.author == authorName;
      }))
    );
  }

  filterByLetter(letter: string): Observable<Book[]> {
    return this.books$.pipe(
      map(books => books.filter((book: Book) => {
        // Normalize label by removing non-alphabetic characters
        const normalizedLabel = book.title.toLowerCase().replace(/[^a-z]/gi, '');
        return normalizedLabel[0].toLowerCase() == letter;
      }))
    );
  }

  filterByLetterZotero(startIndex : number, letter : string) : Observable<any[]> {
    const params = new HttpParams()
      .set('start', startIndex.toString())
      .set('limit', '50')
      .set('q', letter)
      .set('qmode', 'titleCreatorYear')
      .set('direction', 'asc')
      .set('v', '3');

      return this.http.get<any[]>(this.zoteroUrl, { params }).pipe(
        map(items => items.map(item => {
          let author = '';
          if (item.data.creators && item.data.creators.length > 0) {
            const firstAuthor = item.data.creators[0]
            if (firstAuthor) {
              author = `${firstAuthor.lastName} ${firstAuthor.firstName}`;
            }
          }
          return {
            isbn: item.data.ISBN || '',
            author: author,
            title: item.data.title || '',
            date: item.data.date || '',
            key: item.data.key || '',
            place: item.data.place || '',
            publisher: item.data.publisher || '',
            pages: item.data.pages || '',
            series: item.data.series || '',
            seriesNumber: item.data.seriesNumber || '',
            volume: item.data.volume || ''
          };
        }))
      );
  }


  filterByYear(year: string): Observable<Book[]> {
    return this.books$.pipe(
      map(books => books.filter((book: Book) => {
        // Normalize date by extracting year and removing square brackets
        const yearRegex = /\d{4}/;
        const match = book.date.match(yearRegex);
        const normalizedDate = match ? match[0] : '';
        return normalizedDate == year;
      }))
    );
  }

  filterBooks(formValues: any): Observable<Book[]> {
    if (!formValues.author && !formValues.fromDate && !formValues.toDate && !formValues.title && !formValues.id) {
      return of([]);
    }
  
    return this.books$.pipe(
      map(books => books.filter((book : Book) => {
        let valid = true;
  
        if (formValues.title) valid = valid && book.title.toLowerCase().includes(formValues.title);
        if (formValues.id) valid = valid && book.key.includes(formValues.id);
        if (formValues.author) valid = valid && book.author.includes(formValues.author);
        // Conversione dei valori di date in Date per il confronto
        if (formValues.fromDate) valid = valid && book.date >= formValues.fromDate;
        if (formValues.toDate) valid = valid && book.date <= formValues.toDate;
        
        return valid;
      }))
    );
  }

  filterAttestations(formValues : any): Observable<any> {
    // Creazione della query
   

    let queryParts: string[] = [];
  
    if (formValues.location) {
      queryParts.push(`_doc__originalPlace__ancientName="${formValues.location}"`);
    }
  
    if (formValues.inscriptionId) {
      queryParts.push(`_doc__fileID="${formValues.inscriptionId}"`);
    }
  
    if (formValues.word) {
      queryParts.push(` word="${formValues.word}"`);
    }
  
    const query = queryParts.length > 0 ? `[${queryParts.join(' &')}]` : '';
    if(query != ''){
      return this.http.post<AnnotationsRows>(this.cashUrl + "api/public/search?query="+encodeURIComponent(query), null).pipe(
        map(res => Array.from(res.rows.reduce((map, obj) => map.set(obj.nodeId, obj), new Map()).values())),
        switchMap(attestations => {
          // Converti l'array di attestazioni in un array di Observable
          const attestationInfoObservables = attestations.map((attestation : any) => {
            // Restituisci un Observable che ottiene ulteriori informazioni per questa attestazione
            return this.textService.getAnnotation(attestation.nodeId).pipe(
              map(info => info.filter(att=>att.attributes.bibliography != undefined)) // Aggiunto filtro qui
            );
          });
    
          // Aspetta che tutti gli Observable abbiano completato e combina i risultati
          return forkJoin(attestationInfoObservables);
        }),
        concatAll(),
        shareReplay()
      )
    }else{
      return of([])
    }
    
  }

  // Funzione helper per mappare un attestazione a un libro
mapAttestationToBook(attestation : any) : Book {
  let author = "";
  if (attestation.attributes.bibliography) {

    let bibliography = attestation.attributes.bibliography;
    bibliography.creators.forEach((creator: any) => {
        if (creator.creatorType === "author") {
            author = creator.lastName;
            return; // Cambia 'creatorValue' con il vero nome del campo
        }
    });
  }

  let bookEquivalent : Book = {
      author: author,
      date: attestation.attributes.bibliography.date || "",
      key: attestation.attributes.bibliography.key || "",
      references: NaN,
      title: attestation.attributes.bibliography.title || ""
  };

  return bookEquivalent;
}

  combineResults(formValues: any): Observable<(Book)[]> {

    let findInternalObservable : boolean = false; 
    let findCASH : boolean = false;

    if (!formValues.author && !formValues.fromDate && !formValues.toDate && !formValues.title && !formValues.id) {
      findInternalObservable = false;
      findCASH = true;
    }else if(!formValues.word && !formValues.location && !formValues.inscriptionId){
      findCASH = false;
      findInternalObservable = true;
    }else{
      findCASH = true;
      findInternalObservable = true;
    }


    const booksSearch = this.filterBooks(formValues);
    const attestationsSearch = this.filterAttestations(formValues);
  
    return forkJoin([booksSearch, attestationsSearch]).pipe(
      map(([booksResult, attestationsResult]) => {
        
        // Mappiamo prima attestationsResult a Book
        let mappedAttestationsResult : Book[] = [];
        attestationsResult.forEach((attestation : any) => {
            let bookEquivalent = this.mapAttestationToBook(attestation);
            mappedAttestationsResult.push(bookEquivalent);
        });


        // Se findInternalObservable è true, restituisci solo bookResult
        if(findInternalObservable && !findCASH) {
          return booksResult;
        }
    
        // Se findCash è true, mappa gli elementi di attestationsResult come Book
        if(findCASH && !findInternalObservable) {

          return mappedAttestationsResult
        }
    
        // Se entrambe le variabili sono true, combina i risultati
        if(findInternalObservable && findCASH) {
          // Filtriamo i risultati delle attestazioni
          const filteredAttestationsResults = mappedAttestationsResult.filter((attestation:any) => {
            // Cerchiamo corrispondenze nell'array dei libri
            return booksResult.some(book => {
              // Per ogni filtro attivo in formValues...
              for(let filter in book) {
                // ...se il filtro è attivo (non null)...
                if(attestation[filter] !== null && !isNaN(attestation[filter])) {
                  // ...controlla se il corrispondente campo in book e attestation corrispondono
                  // Nota: sto assumendo che i campi di book e attestation abbiano lo stesso nome dei filtri
                  // Se non è così, dovrai adattare questo codice
                  if(book[filter].includes(attestation[filter])) {
                    // Se un campo non corrisponde, allora questo libro non corrisponde all'attestation
                    return false;
                  }
                }
              }
            
              // Se siamo arrivati fin qui, significa che tutti i campi corrispondono, quindi c'è una corrispondenza
              return true;
            });
          })
          
        
          // Restituisci i risultati filtrati
          return filteredAttestationsResults
        }
    
        // Se nessuna delle condizioni sopra è verificata, restituisci un array vuoto
        return [];
      }),
      shareReplay()
    );
  }
}
