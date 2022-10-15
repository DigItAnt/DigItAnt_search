import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, NavigationStart, ActivatedRoute } from '@angular/router';
import { last, Subscription } from 'rxjs';

import * as data from '../../../../assets/mock/words.json'

@Component({
  selector: 'app-word',
  templateUrl: './word.component.html',
  styleUrls: ['./word.component.scss']
})
export class WordComponent implements OnInit {

  current_word: string = '';
  current_occurences : number = 0;
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
  filtered_mode_by_word : boolean = false;
  previous_path : string = '';


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

    /* this.route_subscription = this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkCurrentRoute();
      }

      if (event instanceof NavigationStart) {
        console.log(event)
      }
    }); */

    

    
    this.word_items = (data as any).default;

    this.word_items = this.word_items.sort(function(a, b){
      if(a.label < b.label){return -1;}
      if(a.label > b.label){return 1;}
      return 0;
    });

    this.activated_route_subscription = this.activated_route.params.subscribe(event => {
      if (event['id'] != undefined) {
        this.previous_path = '';
        this.current_word = '';
        if(event['id'] == 'all'){
          this.filtered_mode_by_letter = false;
          this.filtered_mode_by_word = false;
    
        }else if(event['id'].length == 1){
          this.filtered_mode_by_letter = true;
          this.filtered_mode_by_word = false;
    
        }else if(event['id'].length > 1){
          this.filtered_mode_by_letter = false;
          this.filtered_mode_by_word = true;
        }
        
        if(!this.filtered_mode_by_letter && !this.filtered_mode_by_word){
          this.first = 0;
          this.rows = 17;
          this.getAllData();
        }

        else if(this.filtered_mode_by_letter){
          this.first = 0;
          this.rows = 17;
          this.filterByLetter(event['id'])
        }else if(this.filtered_mode_by_word){
          this.first = 0;
          this.rows = 5;
          this.previous_path = event['id'][0].toLowerCase();
          this.current_word = event['id'].toLowerCase();
          this.filterByWord(event['id']);
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
      this.pagination_items = this.filtered_items.slice(this.first, this.rows)
    } else if(this.rows != 0 && this.first != 0) {
      this.pagination_items = this.filtered_items.slice(this.first, this.first + this.rows)
    }else{
      if(!this.filtered_mode_by_letter && !this.filtered_mode_by_word){
        this.pagination_items = this.filtered_items.slice(0, 17)
      }else if(this.filtered_mode_by_letter){
        this.pagination_items = this.filtered_items.slice(0, 17)
      }else if(this.filtered_mode_by_word){
        this.pagination_items = this.filtered_items.slice(0, 5)
      }
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

  filterByWord(params : string){

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
