import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, concatMap, EMPTY, expand, map, Observable, shareReplay, throwError, toArray } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Book {
  author : string,
  date : string,
  publisher : string,
  references : number,
  title : string,
}

@Injectable({
  providedIn: 'root'
})
export class BibliographyService {

  private baseUrl = environment.lexoUrl;
  private limit : number = 100;

  books$ : Observable<any> = this.getAllBooks().pipe(
    map(books => books),
    shareReplay()
  )

  constructor( private http: HttpClient) { }

  getAllBooks(): any {
    return this.http.get<any>(this.baseUrl + "lexicon/data/bibliography").pipe(
      map(res => res),
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
}
