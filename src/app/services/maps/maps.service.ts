import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, concatMap, delay, filter, forkJoin, from, map, mergeMap, Observable, of, switchMap, takeLast, tap, throwError } from 'rxjs';
import { LocationsCounter } from 'src/app/views/texts/texts.component';
import { environment } from 'src/environments/environment';
import { PlaceModel, TextMetadata } from '../text/text.service';

export interface PleiadesDataModel {
  bbox: Array<number>,
  id: string,
  uri: string,
  description: string,
  reprPoint: Array<number>,
  title: string,
}

export interface BBoxModel {
  north: number,
  south: number,
  west: number,
  east: number,
}


export interface Markers {
  latitude: number,
  longitude: number,
}

export interface GeoNamesDataModel {
  bbox: BBoxModel,
  name: string,
  lat: string,
  lng: string,
}

export interface GlobalGeoDataModel {
  ancientName : string,
  modernName : string,
  ancientBbox : BBoxModel,
  modernBbox: BBoxModel,
  modernId: string,
  ancientId : string
  description: string,
  reprPoint: Markers,
  ancientUri: string,
  modernUri : string,
}

@Injectable({
  providedIn: 'root'
})
export class MapsService {

  private pleiadesBaseUrl = environment.endpointPleiades;
  private geoNamesBaseUrl = environment.endpointGeoNames;

  constructor(
    private http: HttpClient,
  ) { }

  mapPleiadesData(place: PleiadesDataModel) {

    return {
      bbox: place.bbox ? { north: place.bbox[2], south: place.bbox[0], west: place.bbox[1], east: place.bbox[3] } : { north: NaN, south: NaN, west: NaN, east: NaN },
      description: place.description,
      id: place.id,
      reprPoint: place.reprPoint ? { latitude: place.reprPoint[1], longitude: place.reprPoint[0] } : { latitude: NaN, longitude: NaN },
      title: place.title,
      uri: place.uri,
    }
  }

  mapGeoNamesData(place: GeoNamesDataModel, id: string, uri: string) {
    
    let bbox = {} as BBoxModel;
    if(place.bbox){
      bbox.north = place.bbox?.north;
      bbox.south = place.bbox?.south;
      bbox.east = place.bbox?.east;
      bbox.west = place.bbox?.west;
    }else{
      bbox.north = NaN;
      bbox.south = NaN;
      bbox.east = NaN;
      bbox.west = NaN;
    }

    return {
      bbox: bbox,
      description: '',
      id: id,
      reprPoint: { latitude: parseFloat(place.lat), longitude: parseFloat(place.lng) },
      title: place.name,
      uri: uri,
    }
  }

  getSingleLocation(location : PlaceModel) : Observable<any> {
    const modernId = location.modernNameUrl.split('/').pop();
    const ancientId = location.ancientNameUrl.split('/').pop();

    const pleiadesRequest = this.http.get(this.pleiadesBaseUrl + ancientId + '/json').pipe(
      catchError(err => of(null)), // In caso di errore, restituisce null
      map((res : any) => res ? this.mapPleiadesData(res) : null) // Mappa i risultati solo se non sono nulli
    );

    const geoNamesRequest = this.http.get(
      this.geoNamesBaseUrl +
      'getJSON?formatted=true&geonameId=' +
      modernId +
      '&username=mmallia92&style=full').pipe(
      catchError(err => of(null)), // In caso di errore, restituisce null
      map((res : any) => res ? this.mapGeoNamesData(res, (modernId || ''), location.modernNameUrl) : null) // Mappa i risultati solo se non sono nulli
    );

    // Restituisce entrambi i risultati in un unico oggetto
    return forkJoin([pleiadesRequest, geoNamesRequest]).pipe(
      map(([pleiadesData, geoNamesData]) => {
        if (!pleiadesData && !geoNamesData) {
          return null; // Return null if both requests fail
        }
    
        // Inizializza un oggetto GlobalGeoDataModel vuoto
        let result: GlobalGeoDataModel = {
          ancientName: '',
          modernName: '',
          ancientBbox: { north: NaN, south: NaN, west: NaN, east: NaN },
          modernBbox: { north: NaN, south: NaN, west: NaN, east: NaN },
          ancientId: '',
          modernId: '',
          description: '',
          reprPoint: { latitude: NaN, longitude: NaN },
          ancientUri: '',
          modernUri: '',
        };
    
        // Se i dati di Pleiades sono disponibili, li aggiunge al risultato
        if (pleiadesData) {
          result.ancientName = pleiadesData.title;
          result.ancientBbox = pleiadesData.bbox;
          result.ancientId = pleiadesData.id;
          result.description = pleiadesData.description;
          result.reprPoint = pleiadesData.reprPoint;
          result.ancientUri = pleiadesData.uri;
        }
    
        // Se i dati di GeoNames sono disponibili, li aggiunge al risultato
        if (geoNamesData) {
          result.modernName = geoNamesData.title;
          result.modernBbox = geoNamesData.bbox;
          result.modernId = geoNamesData.id;
          result.description = geoNamesData.description || result.description;
          result.reprPoint = geoNamesData.reprPoint || result.reprPoint;
          result.modernUri = geoNamesData.uri;
        }
    
        return result;
      }),
      catchError(err => of(null)), // In caso di errore, restituisce null
    ).pipe(
      tap(res=>res)
    )
  }

  getGeoPlaceData(locations: LocationsCounter[]) {
    return forkJoin(
      locations.map((req) => {
        // Effettua entrambe le chiamate HTTP in parallelo
        const pleiadesRequest = this.http.get(this.pleiadesBaseUrl + req.ancientPlaceId + '/json').pipe(
          catchError(err => of(null)), // In caso di errore, restituisce null
          map((res : any) => res ? this.mapPleiadesData(res) : null) // Mappa i risultati solo se non sono nulli
        );
  
        const geoNamesRequest = this.http.get(
          this.geoNamesBaseUrl +
          'getJSON?formatted=true&geonameId=' +
          req.modernPlaceId +
          '&username=mmallia92&style=full').pipe(
          catchError(err => of(null)), // In caso di errore, restituisce null
          map((res : any) => res ? this.mapGeoNamesData(res, req.modernPlaceId, req.modernPlaceUrl) : null) // Mappa i risultati solo se non sono nulli
        );
  
        // Restituisce entrambi i risultati in un unico oggetto
        return forkJoin([pleiadesRequest, geoNamesRequest]).pipe(
          map(([pleiadesData, geoNamesData]) => {
            if (!pleiadesData && !geoNamesData) {
              return null; // Return null if both requests fail
            }
        
            // Inizializza un oggetto GlobalGeoDataModel vuoto
            let result: GlobalGeoDataModel = {
              ancientName: '',
              modernName: '',
              ancientBbox: { north: NaN, south: NaN, west: NaN, east: NaN },
              modernBbox: { north: NaN, south: NaN, west: NaN, east: NaN },
              ancientId: '',
              modernId: '',
              description: '',
              reprPoint: { latitude: NaN, longitude: NaN },
              ancientUri: '',
              modernUri: '',
            };
        
            // Se i dati di Pleiades sono disponibili, li aggiunge al risultato
            if (pleiadesData) {
              result.ancientName = pleiadesData.title;
              result.ancientBbox = pleiadesData.bbox;
              result.ancientId = pleiadesData.id;
              result.description = pleiadesData.description;
              result.reprPoint = pleiadesData.reprPoint;
              result.ancientUri = pleiadesData.uri;
            }
        
            // Se i dati di GeoNames sono disponibili, li aggiunge al risultato
            if (geoNamesData) {
              result.modernName = geoNamesData.title;
              result.modernBbox = geoNamesData.bbox;
              result.modernId = geoNamesData.id;
              result.description = geoNamesData.description || result.description;
              result.reprPoint = geoNamesData.reprPoint || result.reprPoint;
              result.modernUri = geoNamesData.uri;
            }
        
            return result;
          }),
          catchError(err => of(null)), // In caso di errore, restituisce null
        );
      })
    ).pipe(
      map((results: (GlobalGeoDataModel | null)[]) => results.filter(element => element !== null) as GlobalGeoDataModel[]),
      map((results: GlobalGeoDataModel[]) => results.filter(element => !isNaN(element.modernBbox.north) && !isNaN(element.reprPoint.latitude))),
    );
    
  }
}
