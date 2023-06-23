import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { map, Observable, of, pipe, shareReplay } from 'rxjs';
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
  morphology: Array<Morphology>,
  note: string,
  pos: string,
  revisionDate: string,
  revisor: string,
  stemType : string,
  status: string,
  type: Array<string>
}

export interface FormElementTree {
  confidence: number,
  creator: string,
  creationDate: string,
  form: string,
  label: string,
  idContainer : Array<number>,
  leidenContainer : Array<string>,
  leidenString : string,
  lastUpdate: string,
  lexicalEntry: string,
  morphology: Array<Morphology>,
  note: string,
  phoneticRep: string,
  targetSense: string,
  type: string
}

export interface FormElement {
  confidence: number,
  creator: string,
  creationDate: string,
  form: string,
  inheritedMorphology : Array<Morphology>,
  label: Array<FormElementLabels>,
  language : string,
  lastUpdate: string,
  lexicalEntry: string,
  lexicalEntryLabel : string,
  morphology: Array<Morphology>,
  note: string,
  phoneticRep: string,
  targetSense: string,
  type: string
}

export interface FormElementLabels {
  propertyID : string,
  propertyValue : string,
}

export interface SenseElement {
  concept : string,
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
  note : string,
  pos : string,
  sense : string,
  senseExample : string,
  senseTranslation : string,
  usage : string,
}

export interface EtymologyTreeElement {
  confidence : number,
  creationDate : string,
  creator : string,
  etymology : string,
  hypotesisOf : string,
  id : number,
  label : string,
  lastUpdate : string,
  lexicalEntry : string,
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
  etySourceLabel : string,
  etyTarget : string,
  etyTargetLabel : string,
  etymologicalLink : string,
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
  hypotesisOf : string,
  label : string,
  lastUpdate : string,
  links : Array<object>,
  note : string,
}

export interface CognateElement {
  inferred : boolean,
  label : string,
  entity : string,
  entityType : Array<string>,
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
      map((res) => res.list),
      shareReplay(),
    )
  }

  getLexicalEntryData(instanceName: string): Observable<LexicalElement> {
    return this.http.get<LexicalElement>(`${this.baseUrl}lexicon/data/lexicalEntry?key=lexodemo&module=core&id=${encodeURIComponent(instanceName)}`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getFormData(instanceName: string): Observable<FormElement> {
    return this.http.get<FormElement>(`${this.baseUrl}lexicon/data/form?key=lexodemo&module=core&id=${encodeURIComponent(instanceName)}`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getForms(instanceName: string): Observable<FormElementTree[]> {
    return this.http.get<FormElementTree[]>(`${this.baseUrl}lexicon/data/forms?id=${encodeURIComponent(instanceName)}`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getSenses(instanceName: string): Observable<SenseElement[]> {
    return this.http.get<SenseElement[]>(`${this.baseUrl}lexicon/data/senses?id=${encodeURIComponent(instanceName)}`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getEtymologiesList(instanceName: string): Observable<EtymologyTreeElement[]> {
    return this.http.get<EtymologyTreeElement[]>(`${this.baseUrl}lexicon/data/etymologies?id=${encodeURIComponent(instanceName)}`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getEtymologyData(instanceName: string): Observable<EtymologyElement> {
    return this.http.get<EtymologyElement>(`${this.baseUrl}lexicon/data/etymology?id=${encodeURIComponent(instanceName)}`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getCognates(instanceName : string) : Observable<CognateElement[]>{
    return this.http.get<CognateElement[]>(`${this.baseUrl}lexicon/data/linguisticRelation?key=lexodemo&property=cognate&id=${encodeURIComponent(instanceName)}`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getBibliographyByEntity(instanceName : string) : Observable<any[]>{
    return this.http.get<any[]>(`${this.baseUrl}lexicon/data/bibliography?id=${encodeURIComponent(instanceName)}`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getTypes(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/types`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getAuthors(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/authors`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getLanguages(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/languages`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getPos(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/pos`).pipe(
      map((res) => res),
      shareReplay(),
    )
  }

  getStatus(): Observable<StatisticsCounter[]> {
    return this.http.get<StatisticsCounter[]>(`${this.baseUrl}lexicon/statistics/status`).pipe(
      map((res) => res),
      shareReplay(),
    )
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
