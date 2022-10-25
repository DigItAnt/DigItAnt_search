import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, NavigationStart } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { Subscription } from 'rxjs';

import * as data from '../../../assets/mock/words.json'


@Component({
  selector: 'app-abbreviations',
  templateUrl: './abbreviations.component.html',
  styleUrls: ['./abbreviations.component.scss']
})
export class AbbreviationsComponent implements OnInit, OnDestroy {

  current_occurences : number = 0;
  current_page_template : string = '';
  route_subscription: Subscription = new Subscription();  
  activated_route_subscription: Subscription = new Subscription();

  word_items: any[] = [];
  text_items : any[] = [];
  pagination_items: any[] = [];
  filtered_items : any[] = [];


  century_array : number[] = [-6, -5, -4, -3, -2, -1, 1];
  alphabet_array : string[] = ["all", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]

  first : number = 0;
  rows : number = 0;
  places_array: string[] = ['Venetum', 'Florence', 'Rome', 'Falisc'];

  filtered_mode_by_letter : boolean = false;

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
          label: 'ItAnt ' + i,
          value: 'ItAnt ' + i
        }
      );
    }    
    
    this.word_items = (data as any).default;

    this.word_items = this.word_items.sort(function(a, b){
      if(a.label < b.label){return -1;}
      if(a.label > b.label){return 1;}
      return 0;
    });


    this.activated_route_subscription = this.activated_route.params.subscribe(event => {
      if (event != undefined) {

        if(event['id'] == 'all'){
          this.filtered_mode_by_letter = false;
          this.first = 0;
          this.rows = this.word_items.length-1;
          this.getAllData();
    
        }else if(event['id'].length == 1){
          this.filtered_mode_by_letter = true;
          this.first = 0;
          this.rows = 6;
          
          this.filterByLetter(event['id']);
        }
      }
    })

    

  }

  ngOnDestroy(): void {
    this.route_subscription.unsubscribe();
    this.activated_route_subscription.unsubscribe();
  }

  saveTempOccurrences(count : number){
    this.current_occurences = count;
  }

  pagination(event?: any) {
    if(event){
      this.first = event.first;
      this.rows = event.rows;
    }
    

    if (this.first != this.rows && this.first < this.rows) {
      this.pagination_items = this.filtered_items.slice(this.first, this.rows);

      let temp_array : any = {};

      if(!this.filtered_mode_by_letter){
        this.alphabet_array.forEach(element => {
          temp_array[element] = [];
          this.pagination_items.forEach( word_element => {
            if(word_element.label[0].toLowerCase() == element && element != 'all'){
              temp_array[element].push(word_element);
            }
          })
        });
        this.pagination_items = temp_array;
      }else{
        this.pagination_items = this.filtered_items.slice(this.first, this.rows);
      }
    } else if(this.rows != 0 && this.first != 0) {
      this.pagination_items = this.filtered_items.slice(this.first, this.first + this.rows)
      
    }else{
      this.pagination_items = this.filtered_items.slice(0,6);
      
    }
  }

  getAllData(){
    this.filtered_items = this.word_items;

    this.pagination();
  }

  filterByLetter(params : string){
    
    this.filtered_items = this.word_items.filter(x => {
      return x.label.toLowerCase()[0] == params;
    });
    
    this.pagination();

  }



}
