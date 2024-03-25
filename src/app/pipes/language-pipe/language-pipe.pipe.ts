import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'labelMapping',
})
export class LabelMappingPipe implements PipeTransform {
  // Definizione di un oggetto per mappare abbreviazioni di etichette a nomi completi.
  private labelMappings: { [label: string]: string } = {
    osc: 'Oscan', // 'osc' viene mappato a 'Oscan'
    xfa: 'Faliscan', // 'xfa' viene mappato a 'Faliscan'
  };

  // Funzione che trasforma un'etichetta abbreviata nella sua forma completa, se presente nella mappatura.
  transform(label: string): string {
    // Cerca l'etichetta nella mappatura e la ritorna se trovata, altrimenti ritorna l'etichetta originale.
    return this.labelMappings[label] || label; // Ritorna la label originale se non esiste una mappatura
  }
}
