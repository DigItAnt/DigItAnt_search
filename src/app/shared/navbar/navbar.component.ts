import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';


@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {

  filteredText: any[] = [];
  items: any[] = [];

  menu_items: MenuItem[] = [];

  constructor() { }

  ngOnInit(): void {
    for (let i = 0; i < 10000; i++) {
      this.items.push({ label: 'Item ' + i, value: 'Item ' + i });
    }

    this.menu_items = [
      {
        label: 'Home',
      },
      {
        label: 'Browse',        
      },
      {
        label: 'Search',        
      },
      {
        label: 'References',        
      }
    ];
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
