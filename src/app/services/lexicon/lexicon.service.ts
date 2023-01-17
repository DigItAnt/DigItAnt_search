import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { map, Observable, of, shareReplay } from 'rxjs';
import { StatisticsCounter } from 'src/app/views/lexicon/lexicon.component';
import { environment } from 'src/environments/environment';

export interface Morphology {
  trait: string,
  value: string
}
export interface LexicalElement {
  author: string,
  completionDate: string,
  confidence: number,
  creationDate: string,
  hasChildren: boolean,
  label: string,
  language: string,
  lastUpdate: string,
  lexicalEntry: string,
  lexicalEntryInstanceName: string,
  morphology: Array<Morphology>,
  note: string,
  pos: string,
  revisionDate: string,
  revisor: string,
  stemType : string,
  status: string,
  type: Array<string>
}

export interface FormElement {
  confidence: number,
  creator: string,
  creationDate: string,
  form: string,
  formInstanceName: string,
  label: string,
  lastUpdate: string,
  lexicalEntry: string,
  lexicalEntryInstanceName: string,
  morphology: Array<Morphology>,
  note: string,
  phoneticRep: string,
  targetSense: string,
  targetSenseInstanceName: string,
  type: string
}

export interface SenseElement {
  concept : string,
  conceptInstanceName : string,
  confidence : number,
  creationDate : string,
  creator: string,
  definition : string,
  description : string,
  gloss : string,
  hasChildren : string,
  id : number,
  label : string,
  lastUpdate : string,
  lemma : string,
  lexicalEntry : string,
  lexicalEntryInstanceName : string,
  note : string,
  pos : string,
  sense : string,
  senseExample : string,
  senseInstanceName : string,
  senseTranslation : string,
  usage : string,
}

export interface EtymologyTreeElement {
  confidence : number,
  creationDate : string,
  creator : string,
  etymology : string,
  etymologyInstanceName : string,
  hypotesisOf : string,
  id : number,
  label : string,
  lastUpdate : string,
  lexicalEntry : string,
  lexicalEntryInstanceName : string,
  note : string,
}


export interface EtymologyElement {
  etyLinks : EtyLinkElement[],
  etymology : EtymologyData,
  parentNodeInstanceName : string,
  parentNodeLabel : string,
}

export interface EtyLinkElement {
  confidence : number,
  creationDate : string,
  creator : string,
  etyLinkType : string,
  etySource : string,
  etySourceInstanceName : string,
  etySourceLabel : string,
  etyTarget : string,
  etyTargetInstanceName : string,
  etyTargetLabel : string,
  etymologicalLink : string,
  etymologicalLinkInstanceName : string,
  externalIRI : boolean,
  label : string,
  lastUpdate : string,
  note : string,
}

export interface EtymologyData {
  confidence : number,
  creationDate : string,
  creator : string,
  etymology : string,
  etymologyInstancename : string,
  hypotesisOf : string,
  label : string,
  lastUpdate : string,
  links : Array<object>,
  note : string,
}

export interface CognateElement {
  inferred : boolean,
  label : string,
  language : string,
  lexicalEntity : string,
  lexicalEntityInstanceName : string,
  lexicalType : Array<string>,
  link : string | null,
  linkType : string,
}



export interface LexiconList {
  list: LexicalElement[],
  totalHits: number,
}

export interface LexiconQueryFilter {
  text: string,
  searchMode: string,
  type: string,
  pos: string,
  formType: string,
  author: string,
  lang: string,
  status: string,
  offset: number,
  limit: number,
}



@Injectable({
  providedIn: 'root'
})
export class LexiconService {

  private baseUrl = environment.lexoUrl;
  private initParams: LexiconQueryFilter = {
    text: '',
    searchMode: 'contains',
    type: '',
    pos: '',
    formType: '',
    author: '',
    lang: '',
    status: '',
    offset: 0,
    limit: 500
  }

  lexicon$: Observable<LexicalElement[]> = this.getLexicalEntryList(this.initParams).pipe(
    map(lexicon => lexicon),
    shareReplay(),
  )

  types$: Observable<StatisticsCounter[]> = this.getTypes().pipe(
    map(types => types),
    shareReplay(),
  )

  pos$: Observable<StatisticsCounter[]> = this.getPos().pipe(
    map(pos => pos),
    shareReplay(),
  )

  authors$: Observable<StatisticsCounter[]> = this.getAuthors().pipe(
    map(authors => authors),
    shareReplay(),
  )

  languages$: Observable<StatisticsCounter[]> = this.getLanguages().pipe(
    map(languages => languages),
    shareReplay(),
  )

  status$: Observable<StatisticsCounter[]> = this.getStatus().pipe(
    map(status => status),
    shareReplay(),
  )

  constructor(private http: HttpClient) { }

  getLexicalEntryList(params: LexiconQueryFilter): Observable<LexicalElement[]> {
    return this.http.post<LexiconList>(this.baseUrl + "lexicon/data/lexicalEntries", params).pipe(
      map((res) => res.list)
    )
  }

  getLexicalEntryData(instanceName: string): Observable<LexicalElement> {
    return this.http.get<LexicalElement>(`${this.baseUrl}lexicon/data/${instanceName}/lexicalEntry?key=lexodemo&aspect=core`).pipe(
      map((res) => res)
    )
  }

  getFormData(instanceName: string): Observable<FormElement> {
    return this.http.get<FormElement>(`${this.baseUrl}lexicon/data/${instanceName}/form?key=lexodemo&aspect=core`).pipe(
      map((res) => res)
    )
  }

  getForms(instanceName: string): Observable<FormElement[]> {
    return this.http.get<FormElement[]>(`${this.baseUrl}lexicon/data/${instanceName}/forms`)
  }

  getSenses(instanceName: string): Observable<SenseElement[]> {
    return this.http.get<SenseElement[]>(`${this.baseUrl}lexicon/data/${instanceName}/senses`)
  }

  getEtymologiesList(instanceName: string): Observable<EtymologyTreeElement[]> {
    return this.http.get<EtymologyTreeElement[]>(`${this.baseUrl}lexicon/data/${instanceName}/etymologies`).pipe(
      map((res) => res)
    )
  }

  getEtymologyData(instanceName: string): Observable<EtymologyElement> {
    return this.http.get<EtymologyElement>(`${this.baseUrl}lexicon/data/${instanceName}/etymology`).pipe(
      map((res) => res)
    )
  }

  getCognates(instanceName : string) : Observable<CognateElement[]>{
    return this.http.get<CognateElement[]>(`${this.baseUrl}lexicon/data/${instanceName}/linguisticRelation?key=lexodemo&property=cognate`).pipe(
      map((res) => res)
    )
  }

  getTypes(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/types`)
  }

  getAuthors(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/authors`)
  }

  getLanguages(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/languages`)
  }

  getPos(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/pos`)
  }

  getStatus(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/status`)
  }

  filterByLetter(letter: string): Observable<LexicalElement[]> {
    return this.lexicon$.pipe(
      map(texts => texts.filter((text) => {
        return text.label[0].toLowerCase() == letter;
      }))
    );
  }

  filterByLanguage(lang: string): Observable<LexicalElement[]> {
    return this.lexicon$.pipe(
      map(lexicon => lexicon.filter((lex) => {
        return lex.language.toLowerCase() == lang;
      }))
    );
  }

  filterByPos(pos: string): Observable<LexicalElement[]> {
    return this.lexicon$.pipe(
      map(lexicon => lexicon.filter((lex) => {
        if (pos == 'unknown') return lex.pos == '';
        return lex.pos == pos;
      }))
    );
  }
}
