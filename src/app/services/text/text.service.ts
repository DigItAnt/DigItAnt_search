import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, catchError, combineLatest, debounceTime, EMPTY, filter, forkJoin, map, Observable, of, shareReplay, Subject, switchMap, take, tap, timeout, withLatestFrom } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams, HttpResponseBase } from '@angular/common/http';
import { FormElement, FormElementTree, LexiconService } from '../lexicon/lexicon.service';

export interface DocumentSystem {
  documentSystem : Text[]
}

export interface GetFilesResponse {
  files : Text[]
}

export interface GetCountFiles {
  results : number
}

export interface TextMetadata {
  alphabet : string,
  alphabet_url : string,
  ancientFindSpotName : string,
  authority : string,
  autopsy : string,
  autopsyAuthor : string,
  autopsyDate : string,
  bodytextpart : BodyTextPart[] & BodyTextPart,
  condition : string,
  conditionDesc : string,
  conservationInstitution : ConservationInstitution,
  dateOfOrigin : string,
  dateOfOriginNotAfter : string,
  dateOfOriginNotBefore : string,
  datingCertainty : string,
  decoration : string,
  detailedFindSpot : string,
  dimensions : ObjectDimension,
  discoveryYear : DiscoveryYear,
  "element-id" : number,
  editor : string,
  encoding : string,
  encodingSourceUrl : string,
  execution : string,
  execution_conceptUrl : string,
  facsimile : Array<Facsimile>,
  fileID : string,
  inscriptionTitle : string,
  inscriptionType : string,
  inventoryNumber : string,
  itAnt_ID : string,
  language : Array<LanguageMetadata>,
  layoutNotes : string,
  license : License,
  opistography : string,
  originalPlace : PlaceModel,
  palaeographicNotes : string,
  publicationDate : string,
  publicationPID : string,
  reuse : string,
  settlement : Settlement,
  summary : string,
  support : SupportModel,
  title: string,
  traditionalIDs : Array<TraditionalIDs> & TraditionalIDs,
  trismegistos : Trismegistos,
  wordDivisionType : string,
  writingSystem : string,
}

export interface ObjectDimension {
  depth: string,
  height: string,
  type: string,
  unit: string,
  width: string,
  precision : string,
}

export interface Trismegistos {
  trismegistosID : string,
  trismegistosID_url : string,
}
export interface TraditionalIDs {
  traditionalID: string,
  traditionalID_URL: string
}
export interface Settlement {
  placeOfConservation : string,
  placeOfConservationExternalReference : string,
}
export interface License {
  distibutionLicence : string,
  distibutionLicence_URL : string,
}

export interface Facsimile {
  Desc : string,
  License : string,
  LicenseUrl : string,
  Url : string,
}

export interface DiscoveryYear {
  notAfter : string,
  notBefore : string,
  when : string
}

export interface BodyTextPart {
  ductus : string,
  section : string,
  textDirection : string,
}

export interface ConservationInstitution {
  name : string,
  URL : string,
}

export interface PlaceModel {
  ancientName : string,
  ancientNameUrl : string,
  modernName : string,
  modernNameUrl : string
}

export interface SupportModel {
  material : string,
  material_conceptUrl : string,
  objectType : string,
  objectType_conceptUrl : string
}

export interface Text {
  type: string,
  children : Text[],
  metadata : TextMetadata,
  "element-id" : number,
}

export interface LanguageMetadata {
  ident : string,
  source: string,
}

export interface AnnotationsRows {
  requestUUID : string | null | undefined,
  rows: Array<Attestation>,
}

export interface Attestation {
  nodeId : number,
  nodePath : string,
  tokens : Array<Span>
}

export interface GetContentResponse {
  requestUUID : string,
  text: string,
}

export interface LeidenRequest {
  xmlString : string,
}

export interface LeidenResponse {
  xml : string,
}

export interface TextToken {
  begin : number,
  end : number,
  id : number,
  imported : boolean,
  node : number,
  position : number,
  source : string,
  text : string,
  xmlid : string
}

export interface GetTokensResponse extends GetContentResponse {
  tokens : Array<TextToken>
}

export interface XmlAndId {
  xml : string,
  nodeId : number,
}

export interface ListAndId {
  list : Array<Element[]>,
  id : number,
}

export interface AnnotationResponse{
  requestUUID : string,
  annotations : Annotation[]
}

export interface AnnotationAttributes {
  author : string,
  bibliography : Array<any>,
  confidence : number,
  creator : string,
  externalRef : string,
  form_id : string;
  label : string,
  leiden : string,
  node_id : number,
  node : string,
  timestamp : string,
  validity : string
}

export interface Span {
  start : number,
  end : number,
}
export interface Annotation {
  attributes : AnnotationAttributes,
  id : number,
  imported : boolean,
  layer : string,
  spans : Span[],
  value : string
}

export interface Book {
  author : BookAuthor,
  date : string,
  editor : BookEditor,
  entry : string,
  issue : string,
  page : string,
  citedRangePage: string,
  citedRangeEntry: string,
  title : string,
  url : string,
  volume : string
}

export interface BookAuthor {
  name : string,
  surname : string
}

export interface BookEditor extends BookAuthor{

}

export interface Graphic {
  description : string,
  index : number,
  url : string,
  isPdf : boolean,
  isExternalRef : boolean,
  copyright: string
}



@Injectable({
  providedIn: 'root'
})
export class TextsService {

  private baseUrl = environment.cashUrl;
  private leidenUrl = environment.leidenUrl;
  private documentSystem: DocumentSystem[] = [];


  private attestationsSubject = new BehaviorSubject<TextMetadata[]>([]);
  attestations$: Observable<TextMetadata[]> = this.attestationsSubject.asObservable();
  concordances$ : Observable<TextMetadata[]> = this.bootstrapConcordances()
  somethingWrong: boolean = false;

  constructor(
    private http: HttpClient,
    private lexiconService : LexiconService
  ) { }


  bootstrapConcordances(){
    const defaultQuery = '[_doc__itAnt_ID="_REGEX_.*"]';
    const defaultOffset = '0';
    const defaultLimit = '500';
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    let params = new HttpParams();
    params = params.set('query', defaultQuery);
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);
    

    return this.http.post<GetFilesResponse>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers })
      .pipe(
        map(res => res.files),
        map(texts => this.mapData(texts)),
        shareReplay(),
    );
  }

  paginationItems(first?: number, row?: number) : Observable<TextMetadata[]> {
    const defaultQuery = '[_doc__itAnt_ID="_REGEX_.*"]';
    const defaultOffset = '0';
    const defaultLimit = '8';
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    let params = new HttpParams();
    params = params.set('query', defaultQuery);
    
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }
    
    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }

    return this.http.post<GetFilesResponse>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers })
      .pipe(
        map(res => res.files),
        map(texts => this.mapData(texts)),
        shareReplay(),
    );
  }

  getFileByID(fileId: string) : Observable<TextMetadata> {
    const defaultQuery = `[_doc__itAnt_ID="${fileId}"]`;
   
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    let params = new HttpParams();
    params = params.set('query', defaultQuery)
                   .set('offset', '0')
                   .set('limit', '1')
   

    return this.http.post<GetFilesResponse>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers })
      .pipe(
        map(res => res.files),
        map(texts => this.mapData(texts)),
        map(texts => texts[0]),
        shareReplay(),
    );
  }

  countFiles(extParam? : any) : Observable<number> {
    let query = '';

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    let params = new HttpParams();

    if(!extParam){
      query = '[_doc__itAnt_ID="_REGEX_.*"]';
      params = params.set('query', query);  // Important: assign the new instance to the variable
    }else{
      params = params.set('query', extParam); 
    }

    return this.http.post<GetCountFiles>(this.baseUrl + "api/public/countFiles", params.toString(), { headers: headers }).pipe(
      map(res => res.results),
      shareReplay(),
    );
  }

  searchAttestations(formId: string): Observable<TextMetadata[]> {

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    let params = new HttpParams()
      .set('query', `[_doc__itAnt_ID="_REGEX_.*" & attestation="${formId}"]`)
      .set('offset', '0')
      .set('limit', '100');



    return this.http.post<any>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers }).pipe(
      map(res => res.files),
      map(res => this.mapData(res))
    )
  }

  searchAttestationsLexEntry(lexId: string, limit? : number, offset? : number): Observable<TextMetadata[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    let params = new HttpParams()
      .set('query', `[_doc__itAnt_ID="_REGEX_.*" & attestation__lexicalEntry="${lexId}"]`)
      .set('offset', '0')
      .set('limit', '100');



    return this.http.post<any>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers }).pipe(
      map(res => res.files),
      map(res => this.mapData(res)),
      map(res => res.sort((a, b) => {
        const matchA = a.itAnt_ID.match(/\d+$/);
        const matchB = b.itAnt_ID.match(/\d+$/);
        const numA = matchA ? Number(matchA[0]) : 0;
        const numB = matchB ? Number(matchB[0]) : 0;
        return numA - numB;
     }))
    )
  }

  getUniqueMetadata(field : string) : Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    let params = new HttpParams()
      .set('field', field)
      .set('offset', '0')
      .set('limit', '100');

    return this.http.post<any>(this.baseUrl + "api/public/uniqueMetadataValues", params.toString(), { headers: headers }).pipe(
      map(res => res.values)
    )
  }
  
  filterAttestations(query : string, first? : number, row? : number): Observable<TextMetadata[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    const defaultOffset = '0';
    const defaultLimit = '8';

    /* if(first && row && (first>=row)){
      row = first+row;
    } */
    
    let params = new HttpParams();
    params = params.set('query', query);
    
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }
    
    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }

    
      
    return this.http.post<GetFilesResponse>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers }).pipe(
      map(res => res.files),
      map(texts => this.mapData(texts)),
      tap(res => this.attestationsSubject.next(res)),
      shareReplay(),
    )
  }

  thereWasAnError(err? : HttpResponseBase, source? : string){
    if(err?.status != 200){
      this.somethingWrong = true;
      return EMPTY;
    }
    

    return of()
  }

  restoreFilterAttestations(){
    this.attestationsSubject.next([])
  }


  setDocumentSystem(fileSystem: DocumentSystem[]) {
    this.documentSystem = fileSystem;
  }

  getDocumentSystem() {
    return this.documentSystem;
  }
  
  mapData(texts : Text[]): TextMetadata[]{
    return texts.map((text : Text) => ({
      alphabet : text.metadata.alphabet,
      alphabet_url : text.metadata.alphabet_url,
      ancientFindSpotName : text.metadata.ancientFindSpotName,
      authority : text.metadata.authority,
      autopsy: text.metadata.autopsy,
      autopsyDate : text.metadata.autopsyDate,
      autopsyAuthor : text.metadata.autopsyAuthor,
      bodytextpart : text.metadata.bodytextpart,
      condition : text.metadata.condition,
      conditionDesc : text.metadata.conditionDesc,
      conservationInstitution : text.metadata.conservationInstitution,
      dateOfOrigin : text.metadata.dateOfOrigin,
      dateOfOriginNotBefore : text.metadata.dateOfOriginNotBefore,
      dateOfOriginNotAfter : text.metadata.dateOfOriginNotAfter,
      datingCertainty : text.metadata.datingCertainty,
      decoration: text.metadata.decoration,
      detailedFindSpot : text.metadata.detailedFindSpot,
      dimensions : text.metadata.dimensions,
      discoveryYear : text.metadata.discoveryYear,
      editor : text.metadata.editor,
      "element-id" : text['element-id'],
      encoding : text.metadata.encoding,
      encodingSourceUrl : text.metadata.encodingSourceUrl,
      execution : text.metadata.execution,
      execution_conceptUrl : text.metadata.execution_conceptUrl,
      facsimile : text.metadata.facsimile,
      fileID : text.metadata.fileID,
      inscriptionTitle : text.metadata.inscriptionTitle,
      inscriptionType : text.metadata.inscriptionType,
      inventoryNumber : text.metadata.inventoryNumber,
      itAnt_ID : text.metadata.itAnt_ID,
      language : text.metadata.language,
      layoutNotes : text.metadata.layoutNotes,
      license : text.metadata.license,
      opistography : text.metadata.opistography,
      originalPlace : text.metadata.originalPlace,
      palaeographicNotes : text.metadata.palaeographicNotes,
      publicationDate : text.metadata.publicationDate,
      publicationPID : text.metadata.publicationPID,
      reuse : text.metadata.reuse,
      settlement : text.metadata.settlement,
      summary : text.metadata.summary,
      support : text.metadata.support,
      title: text.metadata.title,
      traditionalIDs : text.metadata.traditionalIDs,
      trismegistos : text.metadata.trismegistos,
      wordDivisionType : text.metadata.wordDivisionType,
      writingSystem : text.metadata.writingSystem,
    }))
  }

  filterByDate(century : number, first? : number, row? : number): Observable<TextMetadata[]>{
    const defaultQuery = `[_doc__itAnt_ID="_REGEX_.*" & _doc__dateOfOriginNotBefore="${century}" & _doc__dateOfOriginNotAfter="${century+100}"]`;
    const defaultOffset = '0';
    const defaultLimit = '1000';
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    let params = new HttpParams();
    params = params.set('query', defaultQuery);
   
    
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }
    
    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }
    return this.http.post<GetFilesResponse>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers })
      .pipe(
        map(res => res.files),
        map(texts => this.mapData(texts)),
        shareReplay(),
    );


   /*  return this.texts$.pipe(
      map(texts => texts.filter((text)=> {
        if(century < 0) return parseInt(text.dateOfOriginNotBefore) >= century && parseInt(text.dateOfOriginNotBefore) < (century + 100);
        return parseInt(text.dateOfOriginNotBefore) > (century-100) && parseInt(text.dateOfOriginNotBefore) <= century
      })),
    ) */
  }

  savedSearch : any = [];
  getSavedSearchLocation() {
    return this.savedSearch;
  }

  restoredLocationSearch(){
    this.savedSearch = [];
  }

  filterByLocation(location : string, first? : number, row? : number): Observable<TextMetadata[]>{
    const defaultQuery = `[_doc__itAnt_ID="_REGEX_.*" & _doc__originalPlace__modernNameUrl="https://sws.geonames.org/${location}"]`;
    const defaultOffset = '0';
    const defaultLimit = '1000';
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    let params = new HttpParams();
    params = params.set('query', defaultQuery);
   
    
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }
    
    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }
    return this.http.post<GetFilesResponse>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers })
      .pipe(
        map(res => res.files),
        map(texts => this.mapData(texts)),
        tap(x => this.savedSearch = x),
        shareReplay(),
    );
  }

   
  typeSavedSearch : any = [];
  getTypeSavedSearch() {
    return this.typeSavedSearch;
  }

  restoredTypeSearch(){
    this.typeSavedSearch = [];
  }

  filterByType(type: string, first? : number, row? : number) {
    const defaultQuery = `[_doc__itAnt_ID="_REGEX_.*" & _doc__inscriptionType="${type}"]`;
    const defaultOffset = '0';
    const defaultLimit = '1000';
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    let params = new HttpParams();
    params = params.set('query', defaultQuery);
   
    
    if (first !== undefined) {
      params = params.set('offset', first.toString());
    } else {
      params = params.set('offset', defaultOffset);
    }
    
    if (row !== undefined) {
      params = params.set('limit', row.toString());
    } else {
      params = params.set('limit', defaultLimit);
    }
    return this.http.post<GetFilesResponse>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers })
      .pipe(
        map(res => res.files),
        map(texts => this.mapData(texts)),
        tap(x => this.typeSavedSearch = x),
        shareReplay(),
    );
  }

  

  searchLocation(query : string) : Observable<TextMetadata[]>{
    const defaultQuery = `[_doc__itAnt_ID="_REGEX_.*" & _doc__originalPlace__modernNameUrl="_REGEX_.*${query}.*"]`;
    const defaultOffset = '0';
    const defaultLimit = '1000';
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    
    let params = new HttpParams();
    params = params.set('query', defaultQuery);
    params = params.set('offset', defaultOffset);
    params = params.set('limit', defaultLimit);
    
    return this.http.post<GetFilesResponse>(this.baseUrl + "api/public/searchFiles", params.toString(), { headers: headers })
      .pipe(
        map(res => res.files),
        map(texts => this.mapData(texts)),
        tap(x => this.typeSavedSearch = x),
        shareReplay(),
    );
  }

 

  getContent(nodeId : number) : Observable<XmlAndId> {
    return this.http.get<GetContentResponse>(`${this.baseUrl}api/public/getcontent?requestUUID=11&nodeid=${nodeId}`).pipe(
      map(x => ({xml : x.text, nodeId : nodeId})),
      shareReplay()
    );
  }
  
  getHTMLContent(rawXmlData : XmlAndId) : Observable<string>{
    return this.http.post<LeidenResponse>( this.leidenUrl, {xmlString : rawXmlData.xml}).pipe(
      map(leidenResponse => leidenResponse.xml)
    );
  }

  getHTMLTeiNodeContent(rawXmlData : LeidenRequest) : Observable<string>{
    return this.http.post<LeidenResponse>( '/leiden_itant/', rawXmlData).pipe(
      map(leidenResponse => leidenResponse.xml)
    );
  }

  getTokens(nodeId : number) : Observable<Array<TextToken>> {
    return this.http.get<GetTokensResponse>(`${this.baseUrl}api/public/token?requestUUID=11&nodeid=${nodeId}`).pipe(
      map(x => x.tokens),
      shareReplay()
    )
  }

  getAnnotation(id : number) : Observable<Annotation[]>{
    return this.http.get<AnnotationResponse>(this.baseUrl + 'api/public/annotation?requestUUID=test123&nodeid='+id).pipe(
      map(results => results.annotations.filter(
        anno=> anno.layer == 'attestation'
      )),
      shareReplay()
    );
  }

  mapXmlRequest(res : XmlAndId) : XmlAndId {
    let object = {
      xml : res.xml,
      nodeId : res.nodeId,
    }

    return object;
  }

  getCustomInterpretativeData(req: ListAndId ) {
    return forkJoin(
        req.list.map(innerArray => {
            return forkJoin(
                innerArray.map((node: any) => {
                    return this.getHTMLTeiNodeContent({xmlString: node.outerHTML}).pipe(map(x => x));
                })
            );
        })
    ).pipe(
        switchMap(teiNodeContents => {
            return this.getTokens(req.id).pipe(
                map(tokens => {
                    return {
                        teiNodes: req.list,
                        leidenNodes: teiNodeContents,
                        tokens: tokens
                    };
                })
            );
        }),
        shareReplay(),
    );
}

  getAnnotationsByForms(forms: FormElementTree[]) {
    return forkJoin(
      forms.map(form => {
        return this.searchAttestations(form.form).pipe(
          switchMap(res => {
            if (res.length > 0) {
              let nodeIds: any[] = [];

              res.forEach(
                element => {
                  nodeIds.push(element['element-id'])
                }
              )
              // Usare un altro forkJoin per ottenere le attestazioni
              return forkJoin(
                nodeIds.map(nodeId => {
                  // Chiamare la funzione per ottenere l'attestazione per un nodeId specifico
                  return this.getAnnotation(nodeId).pipe(
                    map(attestations => {
                      const filtered = attestations.filter(attestation=>attestation.value == form.form)
                      return filtered;
                    })
                  );
                })
              ).pipe(
                map(res => {
                  form.leidenContainer = [];
                  res.forEach(
                    att=>{
                      att.forEach(
                        a => {
                          form.leidenContainer.push(a.attributes.leiden)
                        }
                      )
                    }
                  )
                  let leidenTooltip = '';
                  if(form.leidenContainer.length>0){
                    leidenTooltip = `<div class="flex flex-column">
                                        <span class="text-base font-medium">Variants:</span>
                                          <ul>`;
                    form.leidenContainer.forEach(span=> {
                      leidenTooltip += `<li class="font-light">&#x2022; ${span}</li>`
                    })
                    leidenTooltip += `</ul>
                                      </div>`
                  }else{
                    leidenTooltip = ""
                  }
                  

                  form.leidenString = leidenTooltip
                  return form;
                })
              );
            } else {
              form.idContainer = [];
              form.leidenContainer = [];
              return of(form);
            }
          })
        );
      })
    ).pipe(
      // Concatenare l'output in un unico array
      map(results => {
        let output : Array<any> = [];
        results.forEach(form => output.push(form));
        return output;
      })
    );
  }
  

  getForms(annotations : Annotation[]){
    return forkJoin(
      annotations.map(
        (anno : Annotation) => {

          return this.lexiconService.getFormData(anno.value).pipe(
            map(res => {
              return {
                annotation : anno,
                form : res
              }
            })
          )
        }
      )
    ).pipe(
      catchError(err => of(null)),
      tap(res => res)
    )
  }

  getLexicalEntries(formsAndAnno : any){
    return forkJoin(
      formsAndAnno.map(
        (formAndAnno : any) => {

          return this.lexiconService.getLexicalEntryData(formAndAnno.form.lexicalEntry).pipe(
            map(res => {
              return {
                annotation : formAndAnno.annotation,
                lexicalEntry : res
              }
            })
          )
        }
      )
    ).pipe(
      tap(res => res),
      shareReplay()
    )
  }


  getAnnotations(setIds: any){
    
    return forkJoin(
      setIds.map(
        (id : any) => {

          return this.getAnnotation(id)
        }
      )
    ).pipe(
      map((arrays : any) => [].concat(...arrays)),
      tap(res => res),
      shareReplay()
    )
  }

}

