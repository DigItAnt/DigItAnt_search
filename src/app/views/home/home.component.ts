import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  Router,
  ActivatedRoute,
  NavigationStart,
  NavigationEnd,
} from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

export interface AppRoutes {
  home: '/';
}
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  path: string = 'home';
  destroy$: Subject<boolean> = new Subject<boolean>();
  index: number = 0;
  isMainView: boolean = false;

  constructor(private route: Router, private activatedRoute: ActivatedRoute) {}

  // Metodo chiamato quando il componente viene inizializzato
  ngOnInit(): void {
    // Sottoscrizione agli eventi del router per gestire la navigazione
    this.route.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      // Verifica se l'evento è una NavigationEnd (fine della navigazione)
      if (event instanceof NavigationEnd) {
        // Stampa l'evento nel registro di console
        console.log(event);

        // Verifica se il componente è nella vista principale
        this.isMainView =
          this.activatedRoute.children.length == 0 &&
          this.activatedRoute.snapshot.url[0].path == this.path;
      }
    });

    // Controlla se il componente è nella vista principale anche al momento dell'inizializzazione
    this.isMainView =
      this.activatedRoute.children.length == 0 &&
      this.activatedRoute.snapshot.url[0].path == this.path;
  }

  // Metodo chiamato quando il componente viene distrutto
  ngOnDestroy(): void {
    // Emittiamo un valore al subject per segnalare che il componente è stato distrutto
    this.destroy$.next(true);
    // Completiamo il subject per evitare memory leak
    this.destroy$.complete();
  }
}
