import { Injectable } from '@angular/core';
import { TextMetadata } from '../../text/text.service';
import { GlobalGeoDataModel, Markers } from '../maps.service';

@Injectable({
  providedIn: 'root'
})



export class PopupService {

  constructor() { }


  showGeoPopup(places: any) : string {
    let noInfoSpan = '<span class="text-italic">No info</span>'

    // Iniziamo a costruire la stringa di output
    let output = `
      <div>Modern Place ID: ${places.modernId ? places.modernId : noInfoSpan}</div>
      <div>Modern name: ${places.modernName ? places.modernName : noInfoSpan}</div>
      <div>Ancient name: ${places.ancientName ? places.ancientName : noInfoSpan}</div>
      <div>Modern Uri: <a href="${places.modernUri ? places.modernUri : ''}" target="_blank">${places.modernUri ? places.modernUri : noInfoSpan}</a></div>
      <div>Latitude: ${places.reprPoint.latitude ? places.reprPoint.latitude : noInfoSpan}</div>
      <div>Longitude: ${places.reprPoint.longitude ? places.reprPoint.longitude : noInfoSpan}</div>
    `

    // Se places.attestations è un array con elementi, aggiungi una lista di attestazioni
    if(places.attestations && Array.isArray(places.attestations) && places.attestations.length > 0) {
        output += '<div>Attestations: <ul>'

        // Aggiungi ogni attestazione come un elemento della lista
        places.attestations.forEach((attestation:TextMetadata) => {
            output += `<li><a href="texts?file=${attestation.fileID}" target="_blank">${attestation.itAnt_ID}</a></li>`
        })

        output += '</ul></div>'
    }
    else {
        output += `<div>Attestations: ${noInfoSpan}</div>`
    }

    return output
  }
}
