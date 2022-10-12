import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';

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

  century_array : number[] = [-6, -5, -4, -3, -2, -1, 1];

  constructor(private route: Router) { }

  ngOnInit(): void {
    this.checkCurrentRoute();

    this.route_subscription = this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkCurrentRoute();
      }

      if(event instanceof NavigationStart){
       console.log(event)
      }
    });

    


    for (let i = 0; i < 467; i++) {
      this.text_items.push(
        { 
          id: 'ItAnt' + i,
          title: 'Lorem ipsum' + i,
          place: 'Corynth',
          date: this.century_array[Math.floor(Math.random()*this.century_array.length)],
          label: 'ItAnt ' + i, 
          value: 'ItAnt ' + i 
        }
      );
    }

    this.pagination_items = this.text_items.slice(0, 4);
  }

  ngOnDestroy(): void {
    this.route_subscription.unsubscribe();
  }

  checkCurrentRoute() {
    this.current_route = this.route.url;
    
  }

  pagination(event:any){
    //console.log(event); console.log(event)
    let first = event.first;

    if(first <= this.text_items.length){
      this.pagination_items = this.text_items.slice(first, first+4)
    }
  }

}
