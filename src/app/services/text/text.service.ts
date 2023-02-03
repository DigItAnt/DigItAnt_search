import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { debounceTime, filter, map, Observable, of, shareReplay, Subject, switchMap, tap, timeout } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

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
  bodytextpart : Array<BodyTextPart>,
  condition : string,
  conditionDesc : string,
  conservationInstitution : ConservationInstitution,
  dateOfOrigin : string,
  dateOfOriginNotBefore : string,
  datingCertainty : string,
  decoration : string,
  detailedFindSpot : string,
  dimensions : string,
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

@Injectable({
  providedIn: 'root'
})
export class TextsService {

  private baseUrl = environment.cashUrl;
  private leidenUrl = environment.leidenUrl;
  private documentSystem: DocumentSystem[] = [];

  texts$ : Observable<TextMetadata[]> = this.getTextCollection().pipe(
    map(texts => texts.filter(text => text.type == 'file' && Object.keys(text.metadata).length > 0)),
    map(texts => this.mapData(texts)),
    shareReplay()
  )

  constructor(
    private http: HttpClient,
  ) { }


  getTextCollection() : Observable<Text[]> {
    
    return this.http.get<DocumentSystem>(this.baseUrl + "api/public/getDocumentSystem?requestUUID=11").pipe(
      map(res => res.documentSystem),
    )
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
      autopsyAuthor : text.metadata.autopsyAuthor,
      bodytextpart : text.metadata.bodytextpart,
      condition : text.metadata.condition,
      conditionDesc : text.metadata.conditionDesc,
      conservationInstitution : text.metadata.conservationInstitution,
      dateOfOrigin : text.metadata.dateOfOrigin,
      dateOfOriginNotBefore : text.metadata.dateOfOriginNotBefore,
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

  getContent(nodeId : number) : Observable<string> {
    return this.http.get<GetContentResponse>(`${this.baseUrl}api/public/getcontent?requestUUID=11&nodeid=${nodeId}`).pipe(
      map(x => x.text)
    );
  }
  
  getHTMLContent(rawXmlData : LeidenRequest) : Observable<string>{
    return this.http.post<LeidenResponse>('/leiden_demo/', rawXmlData).pipe(
      map(leidenResponse => leidenResponse.xml)
    );
    
  }

  mapXmlRequest(rawXml : string) : LeidenRequest {
    let object = {
      xmlString : rawXml
    }

    return object;
  }

}
