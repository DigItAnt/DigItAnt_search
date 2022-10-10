import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit {

  home: MenuItem = {};
  breadcrumbs_items : MenuItem[] = [];

  constructor(private route: Router) { }

  ngOnInit(): void {
    this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        let snapshot = this.route.routerState.snapshot;
        if(snapshot.root.children[0].children[0] != undefined){
          if(Object.keys(snapshot.root.children[0].children[0].data['breadcrumb']).length > 1){
            this.breadcrumbs_items = snapshot.root.children[0].children[0].data['breadcrumb']
          }
        }
        else{
          this.breadcrumbs_items = snapshot.root.children[0].data['breadcrumb'];
        }
      }
    });
    this.home = {icon: 'pi pi-home', routerLink: '/'};
  }

}
