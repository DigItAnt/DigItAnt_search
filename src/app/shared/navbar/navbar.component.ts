import { AfterContentInit, AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Subject, takeUntil, } from 'rxjs';
import { TextsService, TextMetadata } from 'src/app/services/text/text.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {

  items: MenuItem[] = [];
  menuItems: MenuItem[] = [];
  isActive : boolean = false;
  textItems = this.textService.texts$;
  browseButtonActive = ['texts', 'lexicon', 'bibliography']
  destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(private route: Router,
    private textService: TextsService,
    private activatedRoute: ActivatedRoute) { }

  ngOnInit(): void {

  

    this.route.events.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event instanceof NavigationEnd) {
        const urlTree = this.route.parseUrl(event.url);
        if (Object.keys(urlTree.root.children).length > 0) {
          const urlSegments = urlTree.root.children['primary'].segments.map(segment => segment.path);
          const url = urlSegments[0]
          this.isActive = this.browseButtonActive.includes(url);
        }
      }
    });

    



    this.items = [
      { label: 'Texts', icon: 'fa-solid fa-file-lines', routerLink: '/texts', queryParams: { filter: 'all' } },
      { label: 'Lexicon', icon: 'fa-solid fa-font', routerLink: '/lexicon', queryParams: { filter: 'all' } },
      { label: 'Bibliography', icon: 'fa-solid fa-book', routerLink: '/bibliography', queryParams: { filter: 'all', letter : 'a' }  },
      /* { label: 'Concordances', icon: 'fa-solid fa-list-check', routerLink: '/concordances' } */
    ];

    this.menuItems = [
      {
        label: 'Home',
        routerLink: '/'
      },
      {
        label: 'Browse',

      },
      {
        label: 'Search',
        routerLink: '/search'
      },
      {
        label: 'References',
        routerLink: '/references'
      }
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

}
