import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { circle, latLng, LeafletMouseEvent, polygon, tileLayer} from 'leaflet';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-location',
  templateUrl: './location.component.html',
  styleUrls: ['./location.component.scss']
})
export class LocationComponent implements OnInit, OnDestroy {

  current_route: string = '';
  route_subscription: Subscription = new Subscription();
  text_items: any[] = [];
  pagination_items: any[] = [];
  filtered_items : any[] = [];

  century_array: number[] = [-6, -5, -4, -3, -2, -1, 1];
  places_array: string[] = ['Venetum', 'Florence', 'Rome', 'Falisc'];

  options: any;
  layers: any;

  overlays: any[] = [];

  first : number = 0;
  rows : number = 0;



  constructor(private route: Router, private activated_route : ActivatedRoute, private zone : NgZone) { }

  ngOnInit(): void {
    

    this.route_subscription = this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkCurrentRoute(event);
      }

     
    });

    this.options = {
      layers: [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 8, minZoom: 5, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' })
      ],
      zoom: 5,
      center: latLng(42.61, 12.521472473398102)
    };


    this.layers = [
      polygon([[45.8, 11.91], [45.19, 11.92], [45.19, 12.51], [45.55, 12.70]]).on('click', event => {
        this.navigateTo('../venetum');
      }),

      circle([ 41.92, 12.31 ], { radius: 50000 }).on('click', event => {
        this.navigateTo('../rome');
      }),
      circle([ 43.77, 11.25 ], { radius: 30000 }).on('click', event => {
        this.navigateTo('../florence');      
      }),

      circle([ 41.35, 15.09 ], { radius: 30000 }).on('click', event => {
        this.navigateTo('../falisc');
      }),
    ];


    for (let i = 0; i < 467; i++) {
      this.text_items.push(
        {
          id: 'ItAnt' + i,
          title: 'Lorem ipsum' + i,
          place: this.places_array[Math.floor(Math.random() * this.places_array.length)],
          date: this.century_array[Math.floor(Math.random() * this.century_array.length)],
          label: 'ItAnt ' + i,
          value: 'ItAnt ' + i
        }
      );
    }

    this.checkCurrentRoute();

  }

  navigateTo(path : string){
    this.zone.run( ()=> {
      console.log()
      this.route.navigate([path], { relativeTo: this.activated_route });
    });
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
      this.filterByPlace(splitted_url[splitted_url.length-1]);
    }else{
      this.filterByPlace();
      
    }
  }

  onClickMap(evt: LeafletMouseEvent) {
    console.log(evt)
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


  filterByPlace(params? : string){
    if(params){
      this.filtered_items = this.text_items.filter(x => {
        return x.place.toLowerCase() == params;
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
