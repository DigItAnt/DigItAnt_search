import {
  AfterContentInit,
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  NavigationStart,
  Router,
} from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { TextsService, TextMetadata } from 'src/app/services/text/text.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit, OnDestroy {
  items: MenuItem[] = [];
  menuItems: MenuItem[] = [];
  isActive: boolean = false;
  textItems = this.textService.concordances$;
  browseButtonActive = ['texts', 'lexicon', 'bibliography'];
  destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    private route: Router,
    private textService: TextsService,
    private activatedRoute: ActivatedRoute
  ) {}

  // Metodo chiamato quando il componente viene inizializzato
  ngOnInit(): void {
    // Sottoscrivi l'evento di navigazione e interrompi la sottoscrizione quando il componente viene distrutto
    this.route.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Controlla se l'evento è di tipo NavigationEnd
        const urlTree = this.route.parseUrl(event.url); // Ottieni l'albero URL dall'evento di navigazione
        if (Object.keys(urlTree.root.children).length > 0) {
          // Verifica se ci sono segmenti nell'URL
          const urlSegments = urlTree.root.children['primary'].segments.map(
            (segment) => segment.path
          ); // Ottieni i segmenti dell'URL
          const url = urlSegments[0]; // Ottieni il primo segmento dell'URL
          this.isActive = this.browseButtonActive.includes(url); // Verifica se l'URL attivo è incluso nell'elenco degli URL attivi
        }
      }
    });

    // Inizializza gli elementi del menu
    this.items = [
      { label: 'Texts', icon: 'fa-solid fa-file-lines', routerLink: '/texts' },
      {
        label: 'Lexicon',
        icon: 'fa-solid fa-font',
        routerLink: '/lexicon',
        queryParams: { filter: 'all' },
      },
      {
        label: 'Bibliography',
        icon: 'fa-solid fa-book',
        routerLink: '/bibliography',
        queryParams: { filter: 'all', letter: 'a' },
      },
      /* { label: 'Concordances', icon: 'fa-solid fa-list-check', routerLink: '/concordances' } */
    ];

    // Inizializza gli elementi del menu principale
    this.menuItems = [
      {
        label: 'Home',
        routerLink: '/',
      },
      {
        label: 'Browse',
      },
      {
        label: 'Search',
        routerLink: '/search',
      },
      {
        label: 'References',
        routerLink: '/references',
      },
    ];
  }

  // Metodo chiamato quando il componente viene distrutto
  ngOnDestroy(): void {
    this.destroy$.next(true); // Invia un segnale per terminare l'osservabile
    this.destroy$.complete(); // Completa l'osservabile
  }
}
