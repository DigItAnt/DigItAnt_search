import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {

  filteredText: any[] = [];
  items: any[] = [];

  menu_items: MenuItem[] = [];

  route_subscription : Subscription = new Subscription();
  allowed_active_items = ['abbreviations', 'bibliography', 'conventions', 'glossary', 'concordances']
  maintain_active : boolean = false;
  constructor(private route: Router, private activated_route: ActivatedRoute) { }

  ngOnInit(): void {
    for (let i = 0; i < 10000; i++) {
      this.items.push({ label: 'Item ' + i, value: 'Item ' + i });
    }

    
    this.route_subscription = this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        let snapshot = this.route.routerState.snapshot.url.split('/')[1];
        if(this.allowed_active_items.includes(snapshot)){
          this.maintain_active = true;
        }else{
          this.maintain_active = false;
        }
      }
    });
    
    this.menu_items = [
      {
        label: 'Home',
        routerLink : '/'
      },
      {
        label: 'Browse',
        routerLink : '/browse'        
      },
      {
        label: 'Search',   
        routerLink : '/search'     
      },
      {
        label: 'References',    
        routerLink : '/references'    
      }
    ];
  }
  
  ngOnDestroy(): void {
      this.route_subscription.unsubscribe();
  }


  filterText(event: any) {
    let filtered: any[] = [];
    let query = event.query;

    if (this.items != undefined) {
      for (let i = 0; i < this.items.length; i++) {
        let item = this.items[i];
        if (item.label.toLowerCase().indexOf(query.toLowerCase()) == 0) {
          filtered.push(item);
        }
      }
    }

    this.filteredText = filtered;

  }

}
