import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, catchError, combineLatest, debounceTime, EMPTY, filter, forkJoin, map, Observable, of, shareReplay, Subject, switchMap, take, tap, timeout, withLatestFrom } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams, HttpResponseBase } from '@angular/common/http';
import { FormElement, FormElementTree, LexiconService } from '../lexicon/lexicon.service';

export interface DocumentSystem {
  documentSystem : Text[]
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
  paleographicNotes : string,
  publicationDate : string,
  publicationPID : string,
  reuse : string,
  settlement : Settlement,
  summary : string,
  support : SupportModel,
  title: string,
  traditionalIDs : Array<TraditionalIDs>,
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
  list : Array<Element>,
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
  editor : BookEditor,
  title : string,
  url : string,
}

export interface BookAuthor {
  name : string,
  surname : string
}

export interface BookEditor extends BookAuthor{

}

export interface Graphic {
  description : string,
  url : string
}



@Injectable({
  providedIn: 'root'
})
export class TextsService {

  private baseUrl = environment.cashUrl;
  private leidenUrl = environment.leidenUrl;
  private lexoUrl = environment.lexoUrl;
  private documentSystem: DocumentSystem[] = [];

  texts$ : Observable<TextMetadata[]> = this.getTextCollection().pipe(
    map(texts => texts.filter(text => text.type == 'file' && Object.keys(text.metadata).length > 0)),
    map(texts => this.mapData(texts)),
    shareReplay()
  )

  private attestationsSubject = new BehaviorSubject<TextMetadata[]>([]);
  attestations$: Observable<TextMetadata[]> = this.attestationsSubject.asObservable();
  somethingWrong: boolean = false;

  constructor(
    private http: HttpClient,
    private lexiconService : LexiconService
  ) { }


  getTextCollection() : Observable<Text[]> {
    
    return this.http.get<DocumentSystem>(this.baseUrl + "api/public/getDocumentSystem?requestUUID=11").pipe(
      map(res => res.documentSystem),
    )
  }

  searchAttestations(formId: string, limit? : number, offset? : number): Observable<Attestation[]> {
    return this.http.post<AnnotationsRows>(this.baseUrl + "api/public/search?limit=100&offset=0&query="+encodeURIComponent('[attestation="'+formId+'"]'), null).pipe(
      map(res => res.rows)
    )
  }


  filterAttestations(query : string, limit? : number, offset? : number): Observable<TextMetadata[]> {

    if(limit){
      return this.http.post<AnnotationsRows>(this.baseUrl + "api/public/search?limit="+limit+"&offset="+offset+"&query="+encodeURIComponent(query), null).pipe(
      
        map(res => res.rows),
        map(postData => Array.from(postData.reduce((map, obj) => map.set(obj.nodeId, obj), new Map()).values())), // Aggiunto per rimuovere duplicati
        withLatestFrom(this.texts$),
        map(([postData, texts]) => {
          let tmp : TextMetadata[] = [];
          postData.forEach(
            el=>{
              texts.forEach(
                t=>{
                  if(el.nodeId == t['element-id'])tmp.push(t)
                }
              )
            }
          )
          this.attestationsSubject.next(tmp);
          return tmp
        }),
        shareReplay()
      )
    }

    return this.http.post<AnnotationsRows>(this.baseUrl + "api/public/search?limit=100&offset=0&query="+encodeURIComponent(query), null).pipe(
      
      map(res => res.rows),
      map(postData => Array.from(postData.reduce((map, obj) => map.set(obj.nodeId, obj), new Map()).values())), // Aggiunto per rimuovere duplicati
      withLatestFrom(this.texts$),
      map(([postData, texts]) => {
        let tmp : TextMetadata[] = [];
        postData.forEach(
          el=>{
            texts.forEach(
              t=>{
                if(el.nodeId == t['element-id'])tmp.push(t)
              }
            )
          }
        )
        this.attestationsSubject.next(tmp);
        return tmp
      }),
      shareReplay()
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

  sliceFilteredAttestations(pageIndex: number, pageSize: number): Observable<TextMetadata[]> {
    return this.attestations$.pipe(
      switchMap(attestations => {
        if(attestations && attestations.length > 0) {
          return of(attestations.slice(pageIndex, pageSize));
        } else {
          return this.texts$.pipe(
            map(allAttestations => allAttestations.slice(pageIndex , pageSize))
          );
        }
      })
    );
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
      paleographicNotes : text.metadata.paleographicNotes,
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

  filterByDate(century : number): Observable<TextMetadata[]>{
    return this.texts$.pipe(
      map(texts => texts.filter((text)=> {
        if(century < 0) return parseInt(text.dateOfOrigin) >= century && parseInt(text.dateOfOrigin) < (century + 100);
        return parseInt(text.dateOfOrigin) > (century-100) && parseInt(text.dateOfOrigin) <= century
      })),
    )
  }

  filterByLocation(location : number): Observable<TextMetadata[]>{
    return this.texts$.pipe(
      map(texts => texts.filter((text)=> {
        let uniqueId = (text.originalPlace.ancientNameUrl == '' || text.originalPlace.ancientNameUrl == 'unknown') ? text.originalPlace.modernNameUrl : text.originalPlace.ancientNameUrl;
        uniqueId = uniqueId.split('/')[uniqueId.split('/').length-1];
        return parseInt(uniqueId) == location;
      }))
    );
  }

  filterByType(type: string) {
    return this.texts$.pipe(
      map(texts => texts.filter((text)=> {
        return text.inscriptionType == type;
      }))
    );
  }

  searchLocation(query : string) : Observable<TextMetadata[]>{
    return this.texts$.pipe(
      map(texts=>texts.filter((text) => {
        return text.originalPlace.ancientName.includes(query) || text.originalPlace.modernName.includes(query);
      })),
    )
  }

  getIndexOfText(fileId : string) : Observable<number> {
    return this.texts$.pipe(
      map(texts => texts.findIndex(text => text.fileID == fileId))
    )
  }

  getFileIdByIndex(index : number) : Observable<string> {
    return this.texts$.pipe(
      map(texts => texts[index].fileID)
    )
  }

  getFileByIndex(index : number) : Observable<TextMetadata> {
    return this.texts$.pipe(
      map(texts => texts[index])
    )
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

  getCustomInterpretativeData(req : ListAndId){
    let teiNodeContent : Array<string> = [];
    return forkJoin(
      req.list.map(
        (node: any) => {
          return this.getHTMLTeiNodeContent({xmlString : node.outerHTML}).pipe(map(x => x))
        }
      ),
      
    ).pipe(
      tap(x => teiNodeContent = x),
      switchMap(x => this.getTokens(req.id)),
      map(tokens => {
        return {
          teiNodes: req.list, 
          leidenNodes : teiNodeContent, 
          tokens : tokens
        }
      }),
      shareReplay()
    )
  }

  getAnnotationsByForms(forms: FormElementTree[]) {
    return forkJoin(
      forms.map(form => {
        return this.searchAttestations(form.form, 100, 0).pipe(
          switchMap(res => {
            if (res.length > 0) {
              let idSet = new Set();
              res.forEach(element => {
                idSet.add(JSON.stringify({ nodeId: element.nodeId, nodePath: element.nodePath }));
              });
              let arrayFromSet: any[] = [];
              idSet.forEach((element: any) => {
                let el = JSON.parse(element);
                arrayFromSet.push(el.nodeId);
              });
              form.idContainer = arrayFromSet;
  
              // Usare un altro forkJoin per ottenere le attestazioni
              return forkJoin(
                arrayFromSet.map(nodeId => {
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

