import { HttpResponseBase } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Paginator } from 'primeng/paginator';
import { catchError, EMPTY, filter, iif, map, Observable, of, Subject, Subscription, takeUntil, timeout } from 'rxjs';
import { BibliographyService } from 'src/app/services/bibliography/bibliography.service';
import * as data from '../../../assets/mock/words.json'
import { LexiconFilter } from '../lexicon/lexicon.component';

@Component({
  selector: 'app-bibliography',
  templateUrl: './bibliography.component.html',
  styleUrls: ['./bibliography.component.scss']
})
export class BibliographyComponent implements OnInit {

  destroy$: Subject<boolean> = new Subject<boolean>();
  somethingWrong: boolean = false;

  activeTab: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    filter(params => Object.keys(params).length != 0),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => filter.filter)
  );

  bookOrLetter: Observable<string> = this.activatedRoute.queryParams.pipe(
    takeUntil(this.destroy$),
    map((queryParams: Params) => queryParams as LexiconFilter),
    map((filter: LexiconFilter) => {
      if(filter.letter)return 'letter';
      if(filter.book) return 'book';
      return '';
    })
  )

  totalRecords: Observable<number> = this.bibliographyService.books$.pipe(
    timeout(15000),
    catchError(err => 
      iif(
        () => err,
        this.thereWasAnError(), // -- true, 
        of([]) 
    )),
    takeUntil(this.destroy$),
    /* map((lexicon) => lexicon.length || 0), */
  );

  thereWasAnError(err? : HttpResponseBase, source? : string){
    if(err?.status != 200){
      this.somethingWrong = true;
      return EMPTY;
    }
    

    return of()
  }

  allowedFilters: string[] = ['all', 'language', 'pos', 'sense', 'concept'];


 

  @ViewChild('paginator', { static: true }) paginator: Paginator | undefined


  constructor(private activatedRoute: ActivatedRoute,
              private bibliographyService : BibliographyService) { }

  ngOnInit(): void {
    
   


   

    

  }

  ngOnDestroy(): void {
    
  }

  

  pagination(event?: any) {
    
  }

  getAllData(){
   
  }

  filterByLetter(params : string){
    
    

  }

}
