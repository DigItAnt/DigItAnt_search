import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class AdvancedSearchComponent implements OnInit, OnDestroy {


  

  advancedSearchForm: FormGroup = new FormGroup({
    text: new FormControl(null),
    greek_mode: new FormControl(false),
    search_text_mode: new FormControl('start'),
    date: new FormControl(null),
    location: new FormControl(null),
    type: new FormControl(null),
    theme : new FormControl(null)
  });
  constructor(private form_builder: FormBuilder, private activated_route : ActivatedRoute, private route: Router) { }

  ngOnInit(): void {}

  ngOnDestroy(): void {
  }

  search(){
    
  }

  resetForm(){
    
  }

  pagination(event?: any) {
    
  }

  filterText(){

  }
}
