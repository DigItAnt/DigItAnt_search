import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {


  dates: any[] = [
    {
      label: '6th century BC',
      code: -6
    },
    {
      label: '5th century BC',
      code: -5
    },
    {
      label: '4th century BC',
      code: -4
    },
    {
      label: '3th century BC',
      code: -3
    },
    {
      label: '2th century BC',
      code: -2
    },
    {
      label: '1th century BC',
      code: -1
    },
    {
      label: '1th century AD',
      code: 1
    }
  ];

  grouped_location: any[] = [
    {
      label: 'Venetic', code: 'xve',
      items: [
        { label: 'Venice', code: 'venice' },
        { label: 'Padua', code: 'padua' },
        { label: 'Verona', code: 'verona' },
        { label: 'Trevisum', code: 'trevisum' }
      ]
    },
    {
      label: 'Falisc', code: 'xfa',
      items: [
        { label: 'Rome', code: 'rome' },
        { label: 'Albium', code: 'albium' },
        { label: 'Cerveteri', code: 'cerveteri' },
      ]
    },
    {
      label: 'Oscan', code: 'osc',
      items: [
        { label: 'Perugia', code: 'perugia' },
        { label: 'Castello', code: 'castello' }
      ]
    }
  ];

  types: any[] = [
    {
      label: 'sacrifical',
      code: 'sacrifical'
    },
    {
      label: 'celebrative',
      code: 'celebrative'
    },
    {
      label: 'heroes',
      code: 'heroes'
    },
    {
      label: 'mythology',
      code: 'mythology'
    },
    {
      label: 'murdered',
      code: 'murdered'
    },
    {
      label: 'curse',
      code: 'curse'
    }
  ];

  themes : any[] = [
    {
      label : "Adornment",
      code : "adornment"
    },
    {
      label : "Animal",
      code : "animal"
    },
    {
      label : "Area",
      code : "area"
    },
    {
      label : "Authority",
      code : "authority"
    },
    {
      label : "Bakery",
      code : "bakery"
    }, 
    {
      label : "Childbirth",
      code : "childbirth"
    },
    {
      label : "Clothing",
      code : "clothing"
    }
  ];

  initial_form_data : any;
  query_params : object = {};
  activated_route_subscription: Subscription = new Subscription();
  landing_mode : boolean = false;
  pagination_items: any[] = [];
  filtered_items : any[] = [];
  text_items : any[] = [];
  first : number = 0; 
  rows : number = 0;
  century_array : number[] = [-6, -5, -4, -3, -2, -1, 1];
  current_occurences : number = 0;

  places_array: string[] = ['Venetum', 'Florence', 'Rome', 'Falisc'];

  search_form: FormGroup = new FormGroup({
    text: new FormControl(null),
    greek_mode: new FormControl(false),
    search_text_mode: new FormControl('start'),
    date: new FormControl(null),
    location: new FormControl(null),
    type: new FormControl(null),
    theme : new FormControl(null)
  });
  constructor(private form_builder: FormBuilder, private activated_route : ActivatedRoute, private route: Router) { }

  ngOnInit(): void {

    this.search_form = this.form_builder.group({
      text: null,
      greek_mode: false,
      search_text_mode: 'start',
      date: null,
      location: null,
      type: null,
      theme : null
    })

    this.initial_form_data = this.search_form;
    
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

    this.query_params = this.activated_route.snapshot.queryParams;

    if(Object.keys(this.query_params).length == 0){
      this.landing_mode = true;
    }else{
      this.landing_mode = false;

    }
    this.activated_route_subscription = this.activated_route.queryParams.subscribe(event => {
      if(Object.keys(event).length == 0){
        this.landing_mode = true;
      }else{
        this.landing_mode = false;
        this.filterText();
      }
    })
  }

  ngOnDestroy(): void {
      this.activated_route_subscription.unsubscribe();
  }

  search(){
    let query_params : any = {};
    Object.keys(this.search_form.controls).forEach(key=>{
      if(this.search_form.get(key)?.value){
        query_params[key] = this.search_form.get(key)?.value;
      }
    })

    
    console.log(query_params)


    this.route.navigate(
      ['/search'],
      {
        queryParams: query_params,
        relativeTo: this.activated_route  }
      );
  }

  resetForm(){
    this.search_form= this.form_builder.group({
      text: null,
      greek_mode: false,
      search_text_mode: 'start',
      date: null,
      location: null,
      type: null,
      theme : null
    })
  }

  pagination(event?: any) {
    if(event){
      this.first = event.first;
      this.rows = event.rows;
    }
    

    if (this.first != this.rows && this.first < this.rows) {
      this.pagination_items = this.filtered_items.slice(this.first, this.rows)
    } else if(this.rows != 0 && this.first != 0) {
      this.pagination_items = this.filtered_items.slice(this.first, this.first + this.rows)
    }else{
      
      this.pagination_items = this.filtered_items.slice(0, 5)
      
    }
  }

  filterText(){

    let min = Math.floor(Math.random() * (450 - 0 + 1)) + 0;
    let max = Math.floor(Math.random() * (466 - min + 1)) + (min);
    
    this.filtered_items = this.text_items.slice(min, max)
    this.current_occurences = Math.floor(Math.random() * (466 - min + 1)) + (min);
    this.pagination();

  }
}
