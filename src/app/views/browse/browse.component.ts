import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subscription, take } from 'rxjs';

@Component({
  selector: 'app-browse',
  templateUrl: './browse.component.html',
  styleUrls: ['./browse.component.scss']
})
export class BrowseComponent implements OnInit, OnDestroy {

  current_route : string = '';
  route_subscription : Subscription = new Subscription();
  text_items: any[] = [];

  pagination_items: any[] = [];

  constructor(private route : Router) { }

  ngOnInit(): void {

    this.checkCurrentRoute();

    this.route_subscription = this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        //let snapshot = this.route.routerState.snapshot;
        this.checkCurrentRoute();
      }
    });

    for (let i = 0; i < 467; i++) {
      this.text_items.push(
        { 
          id: 'ItAnt' + i,
          title: 'Lorem ipsum' + i,
          place: 'Corynth',
          date: Date.now(),
          label: 'ItAnt ' + i, 
          value: 'ItAnt ' + i 
        }
      );
    }

    this.pagination_items = this.text_items.slice(0, 5);
  }

  ngOnDestroy(): void {
      this.route_subscription.unsubscribe();
  }

  checkCurrentRoute(){
    this.current_route = this.route.url;
  }

  pagination(event:any){
    console.log(event);
    let first = event.first;

    if(first <= this.text_items.length){
      this.pagination_items = this.text_items.slice(first, first+5)
    }
  }

}
