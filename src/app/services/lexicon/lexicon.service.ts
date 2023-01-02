import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Morphology {
  trait : string,
  value : string
}
export interface LexicalElement {
  author: string,
  completionDate : string,
  confidence : number,
  creationDate: string,
  hasChildren : boolean,
  label : string,
  language: string,
  lastUpdate: string,
  lexicalEntry: string,
  lexicalEntryInstanceName : string,
  morphology : Array<Morphology>,
  note : string,
  pos : string,
  revisionDate : string,
  revisor: string,
  status: string,
  type : Array<string>
}

export interface LexiconList {
  list : LexicalElement[],
  totalHits : number,
}

export interface LexiconFilter {
  text : string,
  searchMode : string,
  type : string,
  pos  : string,
  formType : string,
  author : string,
  lang : string,
  status : string,
  offset : number,
  limit : number,
}

@Injectable({
  providedIn: 'root'
})
export class LexiconService {
  
  private baseUrl = environment.lexoUrl;
  private initParams : LexiconFilter = {
    text : '',
    searchMode : 'contains',
    type : '',
    pos : '',
    formType : '',
    author : '',
    lang : '',
    status : '',
    offset : 0,
    limit : 2000
  }

  lexicon$ : Observable<LexicalElement[]> = this.getLexicalEntryList(this.initParams).pipe(
    map(lexicon => lexicon),
    shareReplay(),
  )

  constructor(private http: HttpClient) { }

  getLexicalEntryList(params : LexiconFilter) :  Observable<LexicalElement[]> {
    return this.http.post<LexiconList>(this.baseUrl + "lexicon/data/lexicalEntries", params).pipe(
      map((res) => res.list)
    )
  }

  filterByLetter(letter: string) {
    return this.lexicon$.pipe(
      map(texts => texts.filter((text)=> {
        return text.label[0].toLowerCase() == letter;
      }))
    );
  }

  filterByLanguage(lang: string) {
    return this.lexicon$.pipe(
      map(lexicon => lexicon.filter((lex)=> {
        return lex.language.toLowerCase() == lang;
      }))
    );
  }

  filterByPos(pos: string) {
    return this.lexicon$.pipe(
      map(lexicon => lexicon.filter((lex)=> {
        if(pos=='unknown') return lex.pos == '';
        return lex.pos == pos;
      }))
    );
  }
}
