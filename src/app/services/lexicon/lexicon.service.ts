import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { map, Observable, of, shareReplay } from 'rxjs';
import { StatisticsCounter } from 'src/app/views/lexicon/lexicon.component';
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

export interface FormElement {
  confidence : number,
  creator : string,
  creationDate: string,
  form: string,
  formInstanceName: string,
  label : string,
  lastUpdate: string,
  lexicalEntry: string,
  lexicalEntryInstanceName : string,
  morphology : Array<Morphology>,
  note : string,
  phoneticRep : string,
  targetSense : string,
  targetSenseInstanceName: string,
  type : string
}

export interface LexiconList {
  list : LexicalElement[],
  totalHits : number,
}

export interface LexiconQueryFilter {
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
  private initParams : LexiconQueryFilter = {
    text : '',
    searchMode : 'contains',
    type : '',
    pos : '',
    formType : '',
    author : '',
    lang : '',
    status : '',
    offset : 0,
    limit : 500
  }

  lexicon$ : Observable<LexicalElement[]> = this.getLexicalEntryList(this.initParams).pipe(
    map(lexicon => lexicon),
    shareReplay(),
  )

  types$ : Observable<StatisticsCounter[]> = this.getTypes().pipe(
    map(types => types),
    shareReplay(),
  )

  pos$ : Observable<StatisticsCounter[]> = this.getPos().pipe(
    map(pos => pos),
    shareReplay(),
  )

  authors$ : Observable<StatisticsCounter[]> = this.getAuthors().pipe(
    map(authors => authors),
    shareReplay(),
  )

  languages$ : Observable<StatisticsCounter[]> = this.getLanguages().pipe(
    map(languages => languages),
    shareReplay(),
  )

  status$ : Observable<StatisticsCounter[]> = this.getStatus().pipe(
    map(status => status),
    shareReplay(),
  )

  constructor(private http: HttpClient) { }

  getLexicalEntryList(params : LexiconQueryFilter) :  Observable<LexicalElement[]> {
    return this.http.post<LexiconList>(this.baseUrl + "lexicon/data/lexicalEntries", params).pipe(
      map((res) => res.list)
    )
  }

  getForms(instanceName : string) : Observable<FormElement[]> {
    return this.http.get<FormElement[]>(`${this.baseUrl}lexicon/data/${instanceName}/forms`)
  }

  getTypes() : Observable<StatisticsCounter[]>{
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/types`)
  }

  getAuthors() : Observable<StatisticsCounter[]>{
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/authors`)
  }

  getLanguages() : Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/languages`)
  }

  getPos() : Observable<StatisticsCounter[]>{
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/pos`)
  }

  getStatus() : Observable<StatisticsCounter[]>{
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/status`)
  }

  filterByLetter(letter: string) : Observable<LexicalElement[]> {
    return this.lexicon$.pipe(
      map(texts => texts.filter((text)=> {
        return text.label[0].toLowerCase() == letter;
      }))
    );
  }

  filterByLanguage(lang: string) : Observable<LexicalElement[]>{
    return this.lexicon$.pipe(
      map(lexicon => lexicon.filter((lex)=> {
        return lex.language.toLowerCase() == lang;
      }))
    );
  }

  filterByPos(pos: string) : Observable<LexicalElement[]>{
    return this.lexicon$.pipe(
      map(lexicon => lexicon.filter((lex)=> {
        if(pos=='unknown') return lex.pos == '';
        return lex.pos == pos;
      }))
    );
  }
}
