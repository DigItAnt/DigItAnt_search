import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
})
export class TruncatePipe implements PipeTransform {
  // Definisce una funzione denominata 'transform' che accetta una stringa e un limite numerico come parametri.
  // Il parametro 'limit' ha un valore predefinito di 50 se non viene fornito.
  transform(value: string, limit: number = 50): string {
    // Controlla se il valore fornito è falso (cioè una stringa vuota, null, undefined, ecc.).
    // Se è falso, ritorna una stringa vuota.
    if (!value) return '';

    // Controlla se la lunghezza del valore è minore o uguale al limite specificato.
    // Se è vero, ritorna il valore così com'è.
    if (value.length <= limit) return value;

    // Se il valore supera la lunghezza del limite, ritorna una substringa che va dall'inizio del valore
    // fino al carattere che si trova nella posizione 'limit'. Aggiunge poi '...' alla fine.
    return value.substring(0, limit) + '...';
  }
}
