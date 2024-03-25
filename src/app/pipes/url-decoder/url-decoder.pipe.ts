import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'urlDecoder',
})
export class UrlDecoderPipe implements PipeTransform {
  // Definizione di una funzione chiamata "transform"
  // Accetta un parametro "uri" di tipo stringa
  transform(uri: string): string {
    // Restituisce il risultato della funzione "decodeURI"
    // Questa funzione decodifica l'URI fornito in input, sostituendo le sequenze di escape con i caratteri rappresentati
    return decodeURI(uri);
  }
}
