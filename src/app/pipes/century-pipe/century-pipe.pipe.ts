import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'centuryPipe',
})
export class CenturyPipe implements PipeTransform {
  // Definisce una funzione chiamata "transform" che prende un numero (secolo) come input e restituisce una stringa.
  transform(century: number): string {
    // Inizializza una variabile "beforeOrAfter" come stringa.
    // Assegna 'BC' se il secolo è negativo, altrimenti 'AD'.
    let beforeOrAfter: string = century < 0 ? 'BC' : 'AD';

    // Inizializza una variabile "absCentury" come stringa.
    // Calcola il valore assoluto del secolo, lo divide per 100 e lo converte in stringa.
    let absCentury: string = (Math.abs(century) / 100).toString();

    // Utilizza uno switch per assegnare un suffisso corretto a "absCentury" basato sul suo valore.
    switch (absCentury) {
      // Se "absCentury" è 0, aggiunge "st" al 1, poiché non esiste lo 0 secolo.
      case '0':
        absCentury = 1 + 'st';
        break;
      // Se "absCentury" è 1, aggiunge "st" per formare "1st".
      case '1':
        absCentury = absCentury + 'st';
        break;
      // Se "absCentury" è 2, aggiunge "nd" per formare "2nd".
      case '2':
        absCentury = absCentury + 'nd';
        break;
      // Se "absCentury" è 3, aggiunge "rd" per formare "3rd".
      case '3':
        absCentury = absCentury + 'rd';
        break;
      // Per tutti gli altri casi, aggiunge "th" per formare, ad esempio, "4th", "5th", ecc.
      default:
        absCentury = absCentury + 'th';
        break;
    }
    // Restituisce la stringa finale combinando il secolo con il suffisso appropriato e il prefisso BC/AD.
    return absCentury + ' century ' + beforeOrAfter;
  }
}
