import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationStart, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, } from 'rxjs';


export interface AppRoutes {
  home: '/';
}
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit, OnDestroy {
  path: string = 'home';
  destroy$: Subject<boolean> = new Subject<boolean>();
  index : number = 0;
  isMainView : boolean = false;


  constructor(private route : Router,
              private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.events.pipe(takeUntil(this.destroy$)).subscribe(event => {

      if (event instanceof NavigationEnd) {
        console.log(event)
        this.isMainView = this.activatedRoute.children.length == 0 && this.activatedRoute.snapshot.url[0].path == this.path;

      }
    });

    this.isMainView = this.activatedRoute.children.length == 0 && this.activatedRoute.snapshot.url[0].path == this.path;

  }

  ngOnDestroy(): void {
      this.destroy$.next(true);
      this.destroy$.complete();
  }


}
