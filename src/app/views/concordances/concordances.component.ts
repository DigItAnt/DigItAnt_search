import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TextMetadata, TextsService } from 'src/app/services/text/text.service';
import { FilterService } from 'primeng/api';

@Component({
  selector: 'app-concordances',
  templateUrl: './concordances.component.html',
  styleUrls: ['./concordances.component.scss'],
})
export class ConcordancesComponent implements OnInit {
  // Definizione dell'attributo 'texts$' come Observable di un array di metadati di testo
  texts$: Observable<TextMetadata[]> = this.textsService.concordances$;

  // Costruttore della classe
  constructor(
    private textsService: TextsService,
    private filterService: FilterService
  ) {}

  // Metodo chiamato quando il componente viene inizializzato
  ngOnInit(): void {
    // Registra un filtro personalizzato all'interno del FilterService
    this.filterService.register('custom', (value: any, filter: any) => {
      return this.filterArrayByKeyword(value, filter);
    });
  }

  // Metodo per stampare il documento corrente
  printDocument() {
    window.print();
  }

  // Metodo per ottenere il valore di input da un evento
  getInputValue(event: Event): string | null {
    const target = event.target as HTMLInputElement;
    return target ? target.value : null;
  }

  // Metodo per filtrare un array in base a una parola chiave
  filterArrayByKeyword(data: any[] | any, filter: string): boolean {
    // Verifica se i dati o il filtro sono nulli o indefiniti
    if (!data || !filter) {
      return false;
    }

    // Se i dati non sono un array
    if (!Array.isArray(data)) {
      // Estrae il valore dell'ID tradizionale dall'oggetto data e lo converte in stringa
      const value = data?.traditionalID?.toString();
      // Restituisce true se il valore include la parola chiave del filtro, altrimenti false
      return value?.includes(filter) || false;
    }

    // Se i dati sono un array
    // Restituisce true se almeno un elemento nell'array ha un valore di ID tradizionale che include la parola chiave del filtro, altrimenti false
    return data.some((item) => {
      const value = item?.traditionalID?.toString();
      return value?.includes(filter);
    });
  }
}
