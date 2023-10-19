import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TextMetadata, TextsService } from 'src/app/services/text/text.service';
import { FilterService } from 'primeng/api';

@Component({
  selector: 'app-concordances',
  templateUrl: './concordances.component.html',
  styleUrls: ['./concordances.component.scss']
})
export class ConcordancesComponent implements OnInit {

  
  texts$ : Observable<TextMetadata[]> = this.textsService.concordances$;
  constructor(private textsService : TextsService, private filterService : FilterService) { }

  ngOnInit(): void {
    this.filterService.register('custom', (value : any, filter : any) => {
      return this.filterArrayByKeyword(value, filter);
    });

  }

  printDocument(){
    window.print();
  }

  getInputValue(event: Event): string | null {
    const target = event.target as HTMLInputElement;
    return target ? target.value : null;
  }

  filterArrayByKeyword(data: any[] | any, filter: string): boolean {
    if (!data || !filter) {
      return false;
    }

    // Caso in cui i dati sono un oggetto
    if (!Array.isArray(data)) {
        const value = data?.traditionalID?.toString();
        return value?.includes(filter) || false;
    }
  
    // Caso in cui i dati sono un array
    return data.some(item => {
      const value = item?.traditionalID?.toString();
      return value?.includes(filter);
    });
}
 
}
