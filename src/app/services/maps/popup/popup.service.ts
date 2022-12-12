import { Injectable } from '@angular/core';
import { GlobalGeoDataModel, Markers } from '../maps.service';

@Injectable({
  providedIn: 'root'
})



export class PopupService {

  constructor() { }


  showGeoPopup(places: GlobalGeoDataModel) : string {
    let noInfoSpan = '<span class="text-italic">No info</span>'
    return `
      <div>Place ID: ${places.id ? places.id : noInfoSpan}</div>
      <div>Ancient name: ${places.title ? places.title : noInfoSpan}</div>
      <div>Uri: <a href="${places.uri ? places.uri : ''}" target="_blank">${places.uri ? places.uri : noInfoSpan}</a></div>
      <div>Latitude: ${places.reprPoint.latitude ? places.reprPoint.latitude : noInfoSpan}</div>
      <div>Longitude: ${places.reprPoint.longitude ? places.reprPoint.longitude : noInfoSpan}</div>
    `
  }
}
