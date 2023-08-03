import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { TextMetadata, TextsService } from 'src/app/services/text/text.service';

@Component({
  selector: 'app-concordances',
  templateUrl: './concordances.component.html',
  styleUrls: ['./concordances.component.scss']
})
export class ConcordancesComponent implements OnInit {

  
  texts : Observable<TextMetadata[]> = this.textsService.texts$;
  constructor(private textsService : TextsService) { }

  ngOnInit(): void {
    
  }

  printDocument(){
    window.print();
  }

}
