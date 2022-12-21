import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { debounceTime, filter, map, Observable, shareReplay, Subject, switchMap, tap, timeout } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';

export interface DocumentSystem {
  documentSystem : Text[]
}

export interface TextMetadata {
  itAnt_ID : string,
  originalPlace : PlaceModel,
  title: string,
  support : object,
  dateOfOrigin : string,
  language : Array<object>,
  inscriptionType : string,
}

export interface PlaceModel {
  ancientName : string,
  ancientNameUrl : string,
  modernName : string,
  modernNameUrl : string
}

export interface Text {
  type: string,
  metadata : TextMetadata
}


@Injectable({
  providedIn: 'root'
})
export class TextsService {

  private baseUrl = environment.cash_baseUrl;
  private documentSystem: DocumentSystem[] = [];

  texts$ : Observable<TextMetadata[]> = this.authService.getAccessToken().pipe(
    switchMap(token => this.getTextCollection(token)),
    map(texts => texts.filter(text => text.type == 'file' && Object.keys(text.metadata).length > 0)),
    map(texts => this.mapData(texts)),
    shareReplay()
  )

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }


  getTextCollection(auth_token?: string) : Observable<Text[]> {
    const header = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth_token}`
    })
    return this.http.get<DocumentSystem>(this.baseUrl + "api/getDocumentSystem?requestUUID=11", { headers: header }).pipe(
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
      itAnt_ID : text.metadata.itAnt_ID,
      originalPlace : text.metadata.originalPlace,
      title: text.metadata.title,
      support : text.metadata.support,
      dateOfOrigin : text.metadata.dateOfOrigin,
      language : text.metadata.language,
      inscriptionType: text.metadata.inscriptionType,
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
 
}
