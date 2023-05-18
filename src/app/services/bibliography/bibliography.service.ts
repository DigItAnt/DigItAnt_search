import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, concatMap, EMPTY, expand, map, Observable, shareReplay, throwError, toArray } from 'rxjs';

export interface Book {
  title : string,
}

@Injectable({
  providedIn: 'root'
})
export class BibliographyService {

  private baseUrl = "https://api.zotero.org/groups/2552746/items";
  private limit : number = 100;

  books$ : Observable<any> = this.getAllBooks().pipe(
    map(texts => texts),
    shareReplay()
  )

  constructor( private http: HttpClient) { }

  getAllBooks(): Observable<any> {
    const initialURL = `${this.baseUrl}?limit=${this.limit}&start=0}`;

    return this.http.get<any[]>(initialURL).pipe(
      expand((data, i) => {
        if (data.length === this.limit) {
          const nextURL = `${this.baseUrl}?limit=${this.limit}&start=${this.limit * (i + 1)}`;
          return this.http.get<any[]>(nextURL);
        } else {
          return EMPTY;
        }
      }),
      concatMap(item => item),
      toArray(),
      catchError(error => {
        console.error('Error fetching books:', error);
        return throwError(error);
      })
    );
  }
}



