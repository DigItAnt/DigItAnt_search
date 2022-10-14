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
  route_subscription: Subscription = new Subscription();
  text_items: any[] = [];
  pagination_items: any[] = [];
  filtered_items : any[] = [];
  century_array: number[] = [-6, -5, -4, -3, -2, -1, 1];

  first : number = 0;
  rows : number = 0;

  constructor(private route: Router, /* private activated_route: ActivatedRoute */) { }

  ngOnInit(): void {


    this.route_subscription = this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {

        
        this.checkCurrentRoute(event)
      }
    });

    

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

    this.checkCurrentRoute();


  }

  ngOnDestroy(): void {
    this.route_subscription.unsubscribe();
  }

  checkCurrentRoute(event? : any) {
    this.current_route = this.route.url;
    let splitted_url = [];
    let index = '';

    if(event!=undefined){
      splitted_url = event.urlAfterRedirects.split('/')
    }else{
      splitted_url = this.current_route.split('/');
    }
    
    index = splitted_url[splitted_url.length - 1];

    if(index != 'all'){
      this.filterByDate(parseInt(index));
    }else{
      this.filterByDate();
      
    }
   

  }

  pagination(event: any) {
    console.log(event);
    this.first = event.first;
    this.rows = event.rows;

    if (this.first != this.rows && this.first < this.rows) {
      this.pagination_items = this.filtered_items.slice(this.first, this.rows)
    } else {
      this.pagination_items = this.filtered_items.slice(this.first, this.first + this.rows)
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
    


    if (this.first != this.rows && this.first < this.rows) {
      this.pagination_items = this.filtered_items.slice(this.first, this.rows)
    } else if(this.rows != 0 && this.first != 0) {
      this.pagination_items = this.filtered_items.slice(this.first, this.first + this.rows)
    }else{
      this.pagination_items = this.filtered_items.slice(0, 5)
    }
  }

}
