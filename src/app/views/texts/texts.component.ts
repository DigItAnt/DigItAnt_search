import { ChangeDetectorRef, Component, NgZone, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Router, ActivatedRoute, NavigationStart, NavigationEnd, Params } from '@angular/router';
import * as L from 'leaflet';
import { bounds, circle, latLng, LeafletMouseEvent, polygon, tileLayer } from 'leaflet';
import { OverlayPanel } from 'primeng/overlaypanel';
import { Paginator } from 'primeng/paginator';
import { Subscription, map, tap, Subject, takeUntil, BehaviorSubject, Observable, groupBy, mergeMap, reduce, count, concatMap, switchMap, take, filter, takeLast, finalize, shareReplay, skipLast } from 'rxjs';
import { GlobalGeoDataModel, MapsService } from 'src/app/services/maps/maps.service';
import { PopupService } from 'src/app/services/maps/popup/popup.service';
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

export interface TypesCounter {
  inscriptionType: string,
  count: number,
}

export interface Filter {
  filter : string;
  date: number;
  place: string;
  type : string;
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
  getGeoData : BehaviorSubject<LocationsCounter[]> = new BehaviorSubject<LocationsCounter[]>([]);
  allowedFilters : string[] = ['all', 'date', 'location', 'type'];
  allowedOperators: string[] = ['filter', 'date', 'place', 'type'];
  options: any;
  layers: Array<L.Circle> = [];

  // @ViewChildren('overlaySpecificMap') private overlayList: QueryList<OverlayPanel> = new QueryList<OverlayPanel>();


  bounds = new L.LatLngBounds(new L.LatLng(33.802052, 4.239242), new L.LatLng(50.230863, 19.812745));

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

  activeType : Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams : Params) => queryParams as Filter),
    map((filter: Filter) => {
      if(filter.type) return filter.type;
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

  groupTypes = this.textService.texts$.pipe(
    takeUntil(this.destroy$),
    map(texts=> groupTypes(texts)),
  )
  
  geoData = this.groupLocations.pipe(
    take(1),
    switchMap(locations => this.mapsService.getGeoPlaceData(locations)),
    tap(data => this.drawMap(data))
  )
  //TODO: fetch locations

  constructor(private route: Router,
              private activatedRoute: ActivatedRoute,
              private textService: TextService,
              private mapsService : MapsService,
              private ngZone : NgZone,
              private popupService : PopupService
  ) { }

  ngOnInit(): void {

    this.activatedRoute.queryParams.pipe(takeUntil(this.destroy$)).subscribe(
      (event)=>{
        if(event){
          const keys  = Object.keys(event);
          const values = Object.values(event);
          if(keys){
            for(const [key, value] of Object.entries(event)) {
              if(!this.allowedOperators.includes(key) ||  
                  event[key] == '' || 
                  (Array.isArray(event[key]) && Array.from(event[key]).length > 1))
              {
                this.goToDefaultUrl(); 
                return;
              }
            }
          }
          if(keys.length>1){
            this.pagination({} as Paginator, keys[1], values[1])
          }
          
        }
      }
    );

    

    this.options = {
      layers: [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 15, 
          minZoom: 5, 
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
        ),
      ],
      zoom: 5,
      center: [42.296818, 12.254809]
    };


    
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

  filterByDate(century : number, f? : number, r? : number) : void {
    if(century){
      if(!f && !r){this.first = 0;this.rows = 6; this.paginationItems = this.textService.filterByDate(century).pipe(map(text=>text.slice(this.first, this.rows)))}
      if(f || r){this.paginationItems = this.textService.filterByDate(century).pipe(map(text=>text.slice(f, r)))}
  
      this.totalRecords = this.textService.filterByDate(century).pipe(map(texts=>texts.length || 0))
    }else{
      this.getAllData(f, r);
    }
  }


  filterByLocation(locationId : number, f? : number, r? : number) : void {
    if(locationId){
      if(!f && !r){this.first = 0;this.rows = 6; this.paginationItems = this.textService.filterByLocation(locationId).pipe(map(text=>text.slice(this.first, this.rows)))}
      if(f || r){this.paginationItems = this.textService.filterByLocation(locationId).pipe(map(text=>text.slice(f, r)))}
  
      this.totalRecords = this.textService.filterByLocation(locationId).pipe(map(texts=>texts.length || 0))
    }else{
      this.getAllData(f, r);
    }
    
  }

  filterByType(type : string, f? : number, r?: number) : void {
    if(type){
      if(!f && !r){this.first = 0;this.rows = 6; this.paginationItems = this.textService.filterByType(type).pipe(map(text=>text.slice(this.first, this.rows)))}
      if(f || r){this.paginationItems = this.textService.filterByType(type).pipe(map(text=>text.slice(f, r)))}
  
      this.totalRecords = this.textService.filterByType(type).pipe(map(texts=>texts.length || 0))
    }else{
      this.getAllData(f, r);
    }
  }
  

  pagination(event: Paginator, ...args : any[]){
    if(Object.keys(event).length != 0){this.first = event.first; this.rows = event.rows;}
    if(Object.keys(event).length == 0){this.first = 0; this.rows = 6;}

    let rows = (this.first != this.rows) && (this.first < this.rows) ? this.rows : this.first + this.rows;
    if(args.length>0){args =args.filter(query=>query != null)}
    if(args.length==1){
      this.getAllData(this.first, rows);
      return;
    }
    if(args.length>1){
      let filter = args[0];
      let value = !isNaN(parseInt(args[1])) ? parseInt(args[1]) : args[1];

      switch(filter){
        case 'all' : this.getAllData(this.first, rows); break;
        case 'date' : this.filterByDate(value, this.first, rows); break;
        case 'place' : this.filterByLocation(value, this.first, rows); break;
        case 'type' : this.filterByType(value, this.first, rows); break;
      }
      return;
    }

   
    
  }

  drawMap(geoData : GlobalGeoDataModel[]) : void{
    
    geoData.forEach(geoPlaceData=>{
      let circleMarker = circle([geoPlaceData.reprPoint.latitude, geoPlaceData.reprPoint.longitude], {radius: 5000}).on('click mouseover', event => {
        console.log(event);
        let eventType = event.type;
        if(eventType == 'mouseover'){
          circleMarker.bindPopup(this.popupService.showGeoPopup(geoPlaceData)).openPopup();
        }
        if(eventType == 'click'){
          this.ngZone.run(()=>{ 
            this.route.navigate( 
              ['/texts'], 
              { queryParams: 
                {
                  filter: 'location', 
                  place: geoPlaceData.id
                }
              }
            );
          })
        }
        
      })
      circleMarker.bindPopup
      this.layers.push(circleMarker);
    })
    

  }


}

function groupByCenturies(texts: TextMetadata[]) : CenturiesCounter[]{
  let tmp : CenturiesCounter[] = [];
  let count : number = 0;
  allowedCenturies.forEach(value=>{
    if(value < 0) count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOrigin) >= value && parseInt(cur.dateOfOrigin) < (value + 100)) ? ++acc : acc, 0); 
    if(value > 0) count = texts.reduce((acc, cur) => (parseInt(cur.dateOfOrigin) > (value-100) && parseInt(cur.dateOfOrigin) <= value) ? ++acc : acc, 0);
    if(count > 0) tmp.push({century: value, count: count,})
  })

  return tmp;
}

function groupLocations(texts : TextMetadata[]) : LocationsCounter[] {
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


function groupTypes(texts : TextMetadata[]) : TypesCounter[]{
  let tmp : TypesCounter[] = [];
  let count : number = 0;
  texts.forEach(text => {
    count = texts.reduce((acc, cur) => cur.inscriptionType == text.inscriptionType ? ++acc : acc, 0);
    if(count > 0) {tmp.push({ inscriptionType: text.inscriptionType, count : count} )
    }
  });

  tmp = Object.values(
    tmp.reduce((acc, object) => ({...acc, [object.inscriptionType] : object}), {})
  )

  return tmp;
}