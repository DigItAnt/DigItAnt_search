import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'labelMapping'
})
export class LabelMappingPipe implements PipeTransform {

  private labelMappings: { [label: string]: string } = {
    'osc': 'Oscan',
    'xfa': 'Faliscan'
  };

  transform(label: string): string {
    return this.labelMappings[label] || label;  // Ritorna la label originale se non esiste una mappatura
  }
}