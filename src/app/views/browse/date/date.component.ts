import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd, NavigationStart, ActivatedRoute, RoutesRecognized } from '@angular/router';
import { Subscription, take } from 'rxjs';

@Component({
  selector: 'app-date',
  templateUrl: './date.component.html',
  styleUrls: ['./date.component.scss']
})
export class DateComponent implements OnInit, OnDestroy {

  current_route: string = '';
  activated_route_subscription: Subscription = new Subscription();
  text_items: any[] = [];
  pagination_items: any[] = [];
  filtered_items : any[] = [];
  century_array: number[] = [-6, -5, -4, -3, -2, -1, 1];

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

          this.filterByDate();
        }else{
          this.all_date_mode = false;
          this.specific_date_mode = true;

          this.first = 0;
          this.rows = 5;

          this.filterByDate(parseInt(event['id']))
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


  filterByDate(params? : number){
    if(params){
      this.filtered_items = this.text_items.filter(x => {
        return x.date == params;
      });
    }else{
      this.filtered_items = this.text_items;
    }    
    this.pagination();
 
  }

}
