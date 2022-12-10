import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-type',
  templateUrl: './type.component.html',
  styleUrls: ['./type.component.scss']
})
export class TypeComponent implements OnInit {

  current_route: string = '';
  activated_route_subscription: Subscription = new Subscription();
  text_items: any[] = [];
  pagination_items: any[] = [];
  filtered_items : any[] = [];
  century_array: number[] = [-6, -5, -4, -3, -2, -1, 1];
  type_array : string[] = ['funerary', 'honorific', 'oracle', 'heroes', 'sacrifical_regulation']

  first : number = 0;
  rows : number = 0;
  
  all_date_mode : boolean = false;
  specific_date_mode : boolean = false;

  constructor(private route: Router, private activated_route: ActivatedRoute) { }

  ngOnInit(): void {

    for (let i = 0; i < 467; i++) {
      this.text_items.push(
        {
          id: 'ItAnt' + i,
          title: 'Lorem ipsum' + i,
          place: 'Corynth',
          date: this.century_array[Math.floor(Math.random() * this.century_array.length)],
          type: this.type_array[Math.floor(Math.random() * this.type_array.length)],
          label: 'ItAnt ' + i,
          value: 'ItAnt ' + i
        }
      );
    }

    this.activated_route_subscription = this.activated_route.params.subscribe(event => {
      if (event['id'] != undefined) {
        
        if(event['id'] == 'all'){
          this.all_date_mode = true;
          this.specific_date_mode = false;

          this.first = 0;
          this.rows = 5;

          this.filterByType();
        }else{
          this.all_date_mode = false;
          this.specific_date_mode = true;

          this.first = 0;
          this.rows = 5;

          this.filterByType(event['id'])
        }
        
        
      }
    })

  }

  ngOnDestroy(): void {
    this.activated_route_subscription.unsubscribe();
  }

 

  pagination(event?: any) {
    console.log(event);
    if(event != undefined){
      this.first = event.first;
      this.rows = event.rows;
    }

    if (this.first != this.rows && this.first < this.rows) {
      this.pagination_items = this.filtered_items.slice(this.first, this.rows)
    } else if(this.rows != 0 && this.first != 0) {
      this.pagination_items = this.filtered_items.slice(this.first, this.first + this.rows)
    }else{
      this.pagination_items = this.filtered_items.slice(0, 5)
    }
  }


  filterByType(params? : string){
    if(params){
      this.filtered_items = this.text_items.filter(x => {
        return x.type == params;
      });
    }else{
      this.filtered_items = this.text_items;
    }    
    this.pagination();
 
  }

}
