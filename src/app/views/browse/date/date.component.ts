import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-date',
  templateUrl: './date.component.html',
  styleUrls: ['./date.component.scss']
})
export class DateComponent implements OnInit, OnDestroy {

  current_route: string = '';
  route_subscription: Subscription = new Subscription();

  constructor(private route: Router) { }

  ngOnInit(): void {
    this.checkCurrentRoute();

    this.route_subscription = this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        //let snapshot = this.route.routerState.snapshot;
        this.checkCurrentRoute();
      }
    });
  }

  ngOnDestroy(): void {
    this.route_subscription.unsubscribe();
  }

  checkCurrentRoute() {
    this.current_route = this.route.url;
  }

}
