import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { Subscription } from 'rxjs';

//import * as data from '../../../../assets/mock/words.json'


@Component({
  selector: 'app-theme',
  templateUrl: './theme.component.html',
  styleUrls: ['./theme.component.scss']
})
export class ThemeComponent implements OnInit {

  current_word: string = '';
  current_occurences : string = '';
  current_page_template : string = '';
  route_subscription: Subscription = new Subscription();  
  activated_route_subscription: Subscription = new Subscription();

  text_items : any[] = [];
  pagination_items: any[] = [];
  filtered_items : any[] = [];

  theme_items : any[] = ["Adornment", "Animal", "Animal", "Animal", "Animal", "Animal", "Area", "Authority", "Bakery", "Childbirth", "Clothing", "Cult", "personnel", "Dairy", "Death", "Deities", "and", "heroes", "Epithet", "Ethnicity", "Festival", "Group", "Individual", "Liquid", "Meal", "Menstruation", "Month", "Object", "Object", "Offering", "Official", "Oracle", "Plants", "and", "seeds", "Portion", "Prayer", "Punishment", "Purity", "and", "Purification", "Sacrificial", "performance", "Sexual", "relations", "Speech", "act", "Structure"];

  century_array : number[] = [-6, -5, -4, -3, -2, -1, 1];
  themes_array : any[] = []
  first : number = 0;
  rows : number = 0;
  places_array: string[] = ['Venetum', 'Florence', 'Rome', 'Falisc'];

  all_themes_mode : boolean = false;
  filtered_by_theme_mode : boolean = false;
  previous_path : string = '';

  @ViewChild('paginator', { static: true }) paginator: Paginator | undefined


  constructor(private route: Router, private activated_route: ActivatedRoute) { }

  ngOnInit(): void {
    for (let i = 0; i < 467; i++) {
      this.text_items.push(
        {
          id: 'ItAnt' + i,
          title: 'Lorem ipsum' + i,
          place: this.places_array[Math.floor(Math.random() * this.places_array.length)],
          date: this.century_array[Math.floor(Math.random() * this.century_array.length)],
          theme: this.theme_items[Math.floor(Math.random() * this.century_array.length)],
          label: 'ItAnt ' + i,
          value: 'ItAnt ' + i
        }
      );
    }    

    this.theme_items.forEach( theme_label => {
      let object : any = {};
      object['label'] = theme_label;
      object['count'] = Math.floor(Math.random() * this.century_array.length)
      this.themes_array.push(object)
    })

    this.themes_array[6]['items'] = [
      {
        label : "Arg"+Math.floor(Math.random() * this.places_array.length),
        count : Math.floor(Math.random() * this.places_array.length)
      },
      {
        label : "Arg"+Math.floor(Math.random() * this.places_array.length),
        count : Math.floor(Math.random() * this.places_array.length)
      },
      {
        label : "Arg"+Math.floor(Math.random() * this.places_array.length),
        count : Math.floor(Math.random() * this.places_array.length)
      },
      {
        label : "Arg"+Math.floor(Math.random() * this.places_array.length),
        count : Math.floor(Math.random() * this.places_array.length)
      },
      {
        label : "Arg"+Math.floor(Math.random() * this.places_array.length),
        count : Math.floor(Math.random() * this.places_array.length)
      }
    ]


    this.activated_route_subscription = this.activated_route.params.subscribe(event => {
      if (event['id'] != undefined) {
        this.previous_path = '';
        this.current_word = '';
        if(event['id'] == 'all'){
          this.all_themes_mode = true;
          this.filtered_by_theme_mode = false;
    
        }else{
          this.all_themes_mode = false;
          this.filtered_by_theme_mode = true;
        }
        
        if(this.all_themes_mode){
          this.first = 0;
          this.rows = 17;
          this.getAllData();
        }else{
          this.first = 0;
          this.rows = 5;
          this.previous_path = event['id'][0].toLowerCase();
          this.current_word = event['id'].toLowerCase();
          this.filterByTheme(event['id']);
        }
      }
    })

    

  }

  ngOnDestroy(): void {
    this.route_subscription.unsubscribe();
    this.activated_route_subscription.unsubscribe();
  }

  saveTempOccurrences(count : string){
    this.current_occurences = count;
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
      if(!this.all_themes_mode && !this.filtered_by_theme_mode){
        this.pagination_items = this.filtered_items.slice(0, 17)
      }else if(this.all_themes_mode){
        this.pagination_items = this.filtered_items.slice(0, 17)
      }else if(this.filtered_by_theme_mode){
        this.pagination_items = this.filtered_items.slice(0, 5)
      }
    }
  }

  getAllData(){
    this.filtered_items = this.themes_array;

    this.pagination();
  }


  filterByTheme(params : string){

    let min = Math.floor(Math.random() * (450 - 0 + 1)) + 0;
    let max = Math.floor(Math.random() * (466 - min + 1)) + (min);

    /* while(min > max && min != max){
      min = Math.floor(Math.random() * (2466 - 0 + 1)) + 0;
      max = Math.floor(Math.random() * (2466 - 0 + 1)) + 0;
    } */
    
    this.filtered_items = this.text_items.slice(min, max)
    
    this.pagination();

  }

}
