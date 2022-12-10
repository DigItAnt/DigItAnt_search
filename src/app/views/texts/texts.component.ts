import { ChangeDetectorRef, Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Router, ActivatedRoute, NavigationStart, NavigationEnd, Params } from '@angular/router';
import * as L from 'leaflet';
import { bounds, circle, latLng, LeafletMouseEvent, polygon, tileLayer } from 'leaflet';
import { OverlayPanel } from 'primeng/overlaypanel';
import { Paginator } from 'primeng/paginator';
import { Subscription, map, tap, Subject, takeUntil, BehaviorSubject, Observable, groupBy, mergeMap, reduce, count, concatMap, switchMap, take, filter, takeLast } from 'rxjs';
import { TextMetadata, TextService } from 'src/app/services/text/text.service';


export interface CenturiesCounter {
  century : number,
  count : number,
}

export interface LocationsCounter {
  ancientPlaceUrl : string,
  ancientPlaceId : string,
  ancientPlaceLabel : string,
  modernPlaceUrl: string,
  modernPlaceId: string,
  modernPlaceLabel: string,
  count : number,
}

export interface Filter {
  filter : string;
  date: number;
  place: string;
}

const allowedCenturies : number[] = [-600, -500, -400, -300, -200, -100, 100];

@Component({
  selector: 'app-texts',
  templateUrl: './texts.component.html',
  styleUrls: ['./texts.component.scss']
})
export class TextsComponent implements OnInit {
  
  path: string = 'texts'
  showSpinner: boolean = true;
  isMainView : boolean = false;
  first: number = 0;
  rows : number = 6;
  destroy$: Subject<boolean> = new Subject<boolean>();
  triggerDateFilter : BehaviorSubject<number> = new BehaviorSubject(NaN);
  allowedFilters : string[] = ['all', 'date', 'location', 'type'];
  allowedOperators: string[] = ['filter', 'date', 'place'];
  options: any;
  layers: any;

  @ViewChildren('overlaySpecificMap') private overlayList: QueryList<OverlayPanel> = new QueryList<OverlayPanel>();


  bounds = new L.LatLngBounds(new L.LatLng(39.02, 10.66), new L.LatLng(46.10, 14.52));

  totalRecords: Observable<number> = this.textService.texts$.pipe(
    takeUntil(this.destroy$),
    map((texts) => texts.length || 0),
  );

  activeTab : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams : Params) => queryParams as Filter),
    map((filter : Filter) => filter.filter)
  );

  activeDate : Observable<number> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams : Params) => queryParams as Filter),
    map((filter: Filter) => {
      if(filter.date) return filter.date;
      return NaN;
    })
  );

  activeLocation : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams : Params) => queryParams as Filter),
    map((filter: Filter) => {
      if(filter.place) return filter.place;
      return '';
    })
  );


  paginationItems: Observable<TextMetadata[]> = this.textService.texts$.pipe(
    takeUntil(this.destroy$),
    map((texts) => texts.slice(this.first, this.rows)),
    tap((x) => this.showSpinner = false)
  );

  groupCenturies: Observable<CenturiesCounter[]> = this.textService.texts$.pipe(
    takeUntil(this.destroy$),
    map(texts => groupByCenturies(texts)),
  )

  groupLocations = this.textService.texts$.pipe(
    takeUntil(this.destroy$),
    map(texts=> groupLocations(texts)),
  )

  //TODO: fetch locations

  constructor(private route: Router,
              private activatedRoute: ActivatedRoute,
              private textService: TextService,
  ) { }

  ngOnInit(): void {

    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(
      (event)=>{
        if(event){
          const keys  = Object.keys(event);
          if(keys.length == 1)for(const [key, value] of Object.entries(event)) {if(!this.allowedOperators.includes(key) || !this.allowedFilters.includes(value) || event[key] == '' || (Array.isArray(event[key]) && Array.from(event[key]).length > 1)){this.goToDefaultUrl(); return;}}
          if(keys.length>1)for( const [key, value] of Object.entries(event)){if(this.allowedOperators.includes(key)){this.pagination({} as Paginator, key, event[key])}}
        }
      }
    )

    this.options = {
      layers: [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
          bounds: this.bounds,
          maxZoom: 9, 
          minZoom: 5, 
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }
        )
      ],
      zoom: 6,
      center: this.bounds.getCenter(),
      
    };


    this.layers = [
      polygon([[45.8, 11.91], [45.19, 11.92], [45.19, 12.51], [45.55, 12.70]]).on('click', event => {
        /* this.navigateTo('../venetum'); */
      }),

      circle([ 41.92, 12.31 ], { radius: 50000 }).on('click', event => {
        /* this.navigateTo('../rome'); */
      }),
      circle([ 43.77, 11.25 ], { radius: 30000 }).on('click', event => {
        /* this.navigateTo('../florence');     */  
      }),

      circle([ 41.35, 15.09 ], { radius: 30000 }).on('click', event => {
        /* this.navigateTo('../falisc'); */
      }),
    ];
  }

 
  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  getAllData(f? : number, r? : number): void {
    let rows = 0;
    if(f && r){this.first = f; rows = r; }
    if(!f && !r){this.first = 0; this.rows = 6;}
    
   
    this.paginationItems = this.textService.texts$.pipe(map(texts => texts.slice(this.first, rows == 0 ? this.rows : rows)));
    this.totalRecords = this.textService.texts$.pipe(map(texts=>texts.length || 0))
  }

  goToDefaultUrl(){
    this.route.navigate( ['/texts'], { queryParams: {filter: 'all'}});
  }

  filterByDate(century : number, f? : number, r? : number) {
    if(century){
      if(!f && !r){this.first = 0;this.rows = 6; this.paginationItems = this.textService.filterByDate(century).pipe(map(text=>text.slice(this.first, this.rows)))}
      if(f || r){this.paginationItems = this.textService.filterByDate(century).pipe(map(text=>text.slice(f, r)))}
  
      this.totalRecords = this.textService.filterByDate(century).pipe(map(texts=>texts.length || 0))
    }else{
      this.getAllData(f, r);
    }
    
  }

  filterByLocation(locationId : number, f? : number, r? : number) {
    if(locationId){
      if(!f && !r){this.first = 0;this.rows = 6; this.paginationItems = this.textService.filterByLocation(locationId).pipe(map(text=>text.slice(this.first, this.rows)))}
      if(f || r){this.paginationItems = this.textService.filterByLocation(locationId).pipe(map(text=>text.slice(f, r)))}
  
      this.totalRecords = this.textService.filterByLocation(locationId).pipe(map(texts=>texts.length || 0))
    }else{
      this.getAllData(f, r);
    }
    
  }
  
  onClickMap(evt: LeafletMouseEvent) {
    console.log(evt)
  }

  pagination(event: Paginator, ...args : any[]){
    console.log(event);
    if(Object.keys(event).length != 0){this.first = event.first; this.rows = event.rows;}
    if(Object.keys(event).length == 0){this.first = 0; this.rows = 6;}

    let rows = (this.first != this.rows) && (this.first < this.rows) ? this.rows : this.first + this.rows;
    
    if(args.length>0){
      let filter = args[0];
      let value = !isNaN(parseInt(args[1])) ? parseInt(args[1]) : args[1];

      switch(filter){
        case 'all' : this.getAllData(this.first, rows); break;
        case 'date' : this.filterByDate(value, this.first, rows); break;
        case 'place' : this.filterByLocation(value, this.first, rows); break;
      }
      
    }
    
  }

  onRightClick(event : OverlayPanel){
    console.log(event, this.overlayList);
    this.overlayList.forEach(overlayEl => {
      if(overlayEl.el == event.el){overlayEl.show(event);return false;}
      if(overlayEl.el != event.el){overlayEl.hide();return false;}
      return false;
    });
    return false;
  }

  

}

function groupByCenturies(texts: TextMetadata[]) {
  let tmp : CenturiesCounter[] = [];
  let count : number = 0;
  allowedCenturies.forEach(value=>{
    if(value < 0) count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOrigin) >= value && parseInt(cur.dateOfOrigin) < (value + 100)) ? ++acc : acc, 0); 
    if(value > 0) count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOrigin) > (value-100) && parseInt(cur.dateOfOrigin) <= value) ? ++acc : acc, 0);
    if(count > 0) tmp.push({century: value, count: count,})
  })

  return tmp;
}

function groupLocations(texts : TextMetadata[]) {
  let tmp : LocationsCounter[] = [];
  let count : number = 0;

  texts.forEach(text => {
    count = texts.reduce((acc, cur) => cur.originalPlace.ancientNameUrl == text.originalPlace.ancientNameUrl ? ++acc : acc, 0);
    if(count > 0) {
      let ancientPlaceStripId = text.originalPlace.ancientNameUrl.split('/')[text.originalPlace.ancientNameUrl.split('/').length -1];
      let modernPlaceStripId = text.originalPlace.modernNameUrl.split('/')[text.originalPlace.modernNameUrl.split('/').length -1];
      tmp.push({
        ancientPlaceUrl : text.originalPlace.ancientNameUrl, 
        ancientPlaceId : ancientPlaceStripId, 
        ancientPlaceLabel: text.originalPlace.ancientName.split(',')[0], 
        modernPlaceUrl: text.originalPlace.modernNameUrl, 
        modernPlaceId: modernPlaceStripId, 
        modernPlaceLabel: text.originalPlace.modernName, 
        count : count}
      )
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.ancientPlaceId] : object}), {})
  )

  return tmp;
}