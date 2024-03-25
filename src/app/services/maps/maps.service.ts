import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  catchError,
  concatMap,
  delay,
  filter,
  forkJoin,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  takeLast,
  tap,
  throwError,
} from 'rxjs';
import { LocationsCounter } from 'src/app/views/texts/texts.component';
import { environment } from 'src/environments/environment';
import { PlaceModel, TextMetadata } from '../text/text.service';

export interface PleiadesDataModel {
  bbox: Array<number>;
  id: string;
  uri: string;
  description: string;
  reprPoint: Array<number>;
  title: string;
}

export interface BBoxModel {
  north: number;
  south: number;
  west: number;
  east: number;
}

export interface Markers {
  latitude: number;
  longitude: number;
}

export interface GeoNamesDataModel {
  bbox: BBoxModel;
  name: string;
  lat: string;
  lng: string;
}

export interface GlobalGeoDataModel {
  ancientName: string;
  modernName: string;
  ancientBbox: BBoxModel;
  attestations?: any;
  modernBbox: BBoxModel;
  modernId: string;
  ancientId: string;
  description: string;
  reprPoint: Markers;
  ancientUri: string;
  modernUri: string;
}

@Injectable({
  providedIn: 'root',
})
export class MapsService {
  private pleiadesBaseUrl = environment.endpointPleiades;
  private geoNamesBaseUrl = environment.endpointGeoNames;

  constructor(private http: HttpClient) {}

  // Funzione per mappare i dati provenienti da Pleiades
  mapPleiadesData(place: PleiadesDataModel) {
    return {
      // Se esiste, mappa i valori delle coordinate per definire il bounding box, altrimenti setta i valori a NaN
      bbox: place.bbox
        ? {
            north: place.bbox[2],
            south: place.bbox[0],
            west: place.bbox[1],
            east: place.bbox[3],
          }
        : { north: NaN, south: NaN, west: NaN, east: NaN },
      // Descrizione del luogo
      description: place.description,
      // ID del luogo
      id: place.id,
      // Punto rappresentativo del luogo con le coordinate della latitudine e della longitudine
      reprPoint: place.reprPoint
        ? { latitude: place.reprPoint[1], longitude: place.reprPoint[0] }
        : { latitude: NaN, longitude: NaN },
      // Titolo del luogo
      title: place.title,
      // URI del luogo
      uri: place.uri,
    };
  }

  // Funzione per mappare i dati provenienti da GeoNames
  mapGeoNamesData(place: GeoNamesDataModel, id: string, uri: string) {
    let bbox = {} as BBoxModel;
    if (place.bbox) {
      // Se esiste, mappa i valori delle coordinate per definire il bounding box, altrimenti setta i valori a NaN
      bbox.north = place.bbox?.north;
      bbox.south = place.bbox?.south;
      bbox.east = place.bbox?.east;
      bbox.west = place.bbox?.west;
    } else {
      // Setta i valori del bounding box a NaN se non sono disponibili
      bbox.north = NaN;
      bbox.south = NaN;
      bbox.east = NaN;
      bbox.west = NaN;
    }

    return {
      // Bounding box del luogo
      bbox: bbox,
      // Descrizione del luogo (vuota per i dati provenienti da GeoNames)
      description: '',
      // ID del luogo
      id: id,
      // Punto rappresentativo del luogo con le coordinate della latitudine e della longitudine
      reprPoint: {
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lng),
      },
      // Titolo del luogo
      title: place.name,
      // URI del luogo
      uri: 'https://sws.geonames.org/' + id,
    };
  }

  // Funzione per ottenere i dati di una singola località
  getSingleLocation(location: PlaceModel): Observable<any> {
    // Estrapola l'ID moderno e antico dalla URL
    const modernId = location.modernNameUrl.split('/').pop();
    const ancientId = location.ancientNameUrl.split('/').pop();

    // Richiesta HTTP per i dati di Pleiades
    const pleiadesRequest = this.http
      .get(this.pleiadesBaseUrl + ancientId + '/json')
      .pipe(
        catchError((err) => of(null)), // In caso di errore, restituisce null
        map((res: any) => (res ? this.mapPleiadesData(res) : null)) // Mappa i risultati solo se non sono nulli
      );

    // Richiesta HTTP per i dati di GeoNames
    const geoNamesRequest = this.http
      .get(
        this.geoNamesBaseUrl +
          'getJSON?formatted=true&geonameId=' +
          modernId +
          '&username=mmallia92&style=full'
      )
      .pipe(
        catchError((err) => of(null)), // In caso di errore, restituisce null
        map((res: any) =>
          res
            ? this.mapGeoNamesData(res, modernId || '', location.modernNameUrl)
            : null
        ) // Mappa i risultati solo se non sono nulli
      );

    // Restituisce entrambe le richieste in un unico Observable
    return forkJoin([pleiadesRequest, geoNamesRequest])
      .pipe(
        map(([pleiadesData, geoNamesData]) => {
          if (!pleiadesData && !geoNamesData) {
            return null; // Restituisce null se entrambe le richieste falliscono
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

          // Se i dati di GeoNames sono disponibili e la sua rappresentazione dei punti non è undefined o non sono NaN, li aggiunge al risultato
          if (
            geoNamesData &&
            (geoNamesData.title != undefined ||
              !isNaN(geoNamesData.reprPoint.latitude))
          ) {
            result.modernName = geoNamesData.title;
            result.modernBbox = geoNamesData.bbox;
            result.modernId = geoNamesData.id;
            result.description = geoNamesData.description || result.description;
            result.reprPoint = geoNamesData.reprPoint || result.reprPoint;
            result.modernUri = geoNamesData.uri;
          }

          return result;
        }),
        catchError((err) => of(null)) // In caso di errore, restituisce null
      )
      .pipe(tap((res) => res));
  }

  /**
   * Ottiene i dati geografici relativi a una serie di luoghi.
   * @param locations Un array di oggetti LocationsCounter che contengono gli identificatori dei luoghi.
   * @returns Un Observable contenente i dati geografici per tutti i luoghi.
   */
  getGeoPlaceData(locations: LocationsCounter[]) {
    return forkJoin(
      locations.map((req) => {
        // Effettua entrambe le chiamate HTTP in parallelo

        // Richiesta per i dati di GeoNames
        const geoNamesRequest = this.http
          .get(
            this.geoNamesBaseUrl +
              'getJSON?formatted=true&geonameId=' +
              req.modernPlaceId +
              '&username=mmallia92&style=full'
          )
          .pipe(
            catchError((err) => of(null)), // In caso di errore, restituisce null
            map((res: any) =>
              res
                ? this.mapGeoNamesData(
                    res,
                    req.modernPlaceId,
                    req.modernPlaceUrl
                  )
                : null
            ) // Mappa i risultati solo se non sono nulli
          );

        // Restituisce entrambi i risultati in un unico oggetto
        return forkJoin([geoNamesRequest]).pipe(
          map(([geoNamesData]) => {
            if (!geoNamesData) {
              return null; // Restituisce null se entrambe le richieste falliscono
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

            // Se i dati di GeoNames sono disponibili, li aggiunge al risultato
            if (geoNamesData) {
              result.modernName = geoNamesData.title;
              result.modernBbox = geoNamesData.bbox;
              result.modernId = geoNamesData.id;
              result.description =
                geoNamesData.description || result.description;
              result.reprPoint = geoNamesData.reprPoint || result.reprPoint;
              result.modernUri = geoNamesData.uri;
            }

            return result;
          }),
          catchError((err) => of(null)) // In caso di errore, restituisce null
        );
      })
    ).pipe(
      map(
        (results: (GlobalGeoDataModel | null)[]) =>
          results.filter((element) => element !== null) as GlobalGeoDataModel[]
      ),
      map((results: GlobalGeoDataModel[]) =>
        results.filter(
          (element) =>
            !isNaN(element.modernBbox.north) &&
            !isNaN(element.reprPoint.latitude)
        )
      )
    );
  }
}
