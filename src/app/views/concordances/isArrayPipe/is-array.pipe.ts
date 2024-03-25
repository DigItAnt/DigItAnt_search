import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'isArray',
})
export class IsArrayPipe implements PipeTransform {
  // Funzione che trasforma un valore in un booleano
  // Restituisce true se il valore è un array, altrimenti restituisce false.
  transform(value: any): boolean {
    return Array.isArray(value); // Verifica se il valore è un array e restituisce true se lo è, altrimenti restituisce false.
  }
}
