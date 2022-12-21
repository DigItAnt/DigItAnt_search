import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, concatMap, delay, filter, forkJoin, from, map, mergeMap, Observable, of, switchMap, takeLast, tap, throwError } from 'rxjs';
import { LocationsCounter } from 'src/app/views/texts/texts.component';
import { environment } from 'src/environments/environment';

export interface PleiadesDataModel {
  bbox : Array<number>,
  id: string,
  uri: string,
  description : string,
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
  bbox: BBoxModel,
  id: string,
  description : string,
  reprPoint: Markers,
  title: string,
  uri: string,
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
  
  mapPleiadesData(place : PleiadesDataModel) : GlobalGeoDataModel{
    
    return {
      bbox : place.bbox ? {north: place.bbox[2], south: place.bbox[0], west: place.bbox[1], east: place.bbox[3]} : {north: NaN, south: NaN, west: NaN, east: NaN},
      description : place.description,
      id: place.id,
      reprPoint: place.reprPoint ? {latitude: place.reprPoint[1], longitude: place.reprPoint[0]} : {latitude: NaN, longitude: NaN},
      title: place.title,
      uri: place.uri,
    }
  }

  mapGeoNamesData(place : GeoNamesDataModel, id: string, uri: string) : GlobalGeoDataModel{
    return {
      bbox : {north: place.bbox.north, south: place.bbox.south, west: place.bbox.west, east: place.bbox.east},
      description : '',
      id: id,
      reprPoint: {latitude: parseFloat(place.lat), longitude: parseFloat(place.lng)},
      title: place.name,
      uri: uri,
    }
  }
  
  getGeoPlaceData(locations: LocationsCounter[]) {

    return forkJoin(
      locations.map(
        (req) => {
          if((req.ancientPlaceId != 'unknown' && req.ancientPlaceId.length != 0)){
            return this.http.get(this.pleiadesBaseUrl + req.ancientPlaceId + '/json').pipe(
              catchError(err => of(err)),
              map(res => this.mapPleiadesData(res))
            )
          }
        return this.http.get(
          this.geoNamesBaseUrl + 
          'getJSON?formatted=true&geonameId=' + 
          req.modernPlaceId + 
          '&username=mmallia92&style=full').pipe(
            catchError(err => of(err)),
            map(res => this.mapGeoNamesData(res, req.modernPlaceId, req.modernPlaceUrl))
          );
        }
      )
    ).pipe(
        catchError(err => of(err)),
        map((results : GlobalGeoDataModel[]) => results.filter(element=> !isNaN(element.bbox.north)&& !isNaN(element.reprPoint.latitude) )),
    )
  }
}
