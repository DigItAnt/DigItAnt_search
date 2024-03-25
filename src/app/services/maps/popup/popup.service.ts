import { Injectable } from '@angular/core';
import { TextMetadata } from '../../text/text.service';
import { GlobalGeoDataModel, Markers } from '../maps.service';

@Injectable({
  providedIn: 'root',
})
export class PopupService {
  constructor() {}

  // Funzione per mostrare un popup con le informazioni geografiche
  showGeoPopup(places: any): string {
    // Definizione di un'etichetta per i casi in cui non ci sono informazioni disponibili
    let noInfoSpan = '<span class="text-italic">Nessuna informazione</span>';

    // Inizio della costruzione della stringa di output con le informazioni sui luoghi
    let output = `
    <div>ID luogo moderno: ${
      places.modernId ? places.modernId : noInfoSpan
    }</div>
    <div>Nome moderno: ${
      places.modernName ? places.modernName : noInfoSpan
    }</div>
    <div>Nome antico: ${
      places.ancientName ? places.ancientName : noInfoSpan
    }</div>
    <div>URI moderno: <a href="${
      places.modernUri ? places.modernUri : ''
    }" target="_blank">${
      places.modernUri ? places.modernUri : noInfoSpan
    }</a></div>
    <div>Latitudine: ${
      places.reprPoint.latitude ? places.reprPoint.latitude : noInfoSpan
    }</div>
    <div>Longitudine: ${
      places.reprPoint.longitude ? places.reprPoint.longitude : noInfoSpan
    }</div>
  `;

    // Se places.attestations è un array con elementi, aggiungi una lista di attestazioni
    if (
      places.attestations &&
      Array.isArray(places.attestations.files) &&
      places.attestations.files.length > 0
    ) {
      output +=
        '<div style="max-height: 10vh; overflow: auto;">Attestazioni: <ul>';
      // Aggiungi ogni attestazione come un elemento della lista
      places.attestations.files.forEach((attestation: any) => {
        output += `<li><a href="texts?file=${attestation.metadata.itAnt_ID}" target="_blank">${attestation.metadata.itAnt_ID}</a></li>`;
      });

      output += '</ul></div>';
    } else {
      // Se non ci sono attestazioni disponibili, visualizza un messaggio appropriato
      output += `<div>Attestazioni: ${noInfoSpan}</div>`;
    }

    return output;
  }
}
