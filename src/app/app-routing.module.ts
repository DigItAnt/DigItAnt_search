import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AbbreviationsComponent } from './views/abbreviations/abbreviations.component';
import { BibliographyComponent } from './views/bibliography/bibliography.component';
import { BrowseComponent } from './views/browse/browse.component';
import { DateComponent } from './views/browse/date/date.component';
import { LocationComponent } from './views/browse/location/location.component';
import { ThemeComponent } from './views/browse/theme/theme.component';
import { TypeComponent } from './views/browse/type/type.component';
import { WordComponent } from './views/browse/word/word.component';
import { ConventionsComponent } from './views/conventions/conventions.component';
import { HomeComponent } from './views/home/home.component';
import { SearchComponent } from './views/search/search.component';

const routes: Routes = [
  {
    path: '', 
    component: HomeComponent
  },
  {
    path: 'browse', 
    component: BrowseComponent,

    children : [
      {
        path: 'date',
        redirectTo: 'date/all',
      },
      {
        path: 'date/:id',
        component: DateComponent
      },
      {
        path: 'location',
        redirectTo: 'location/all',
      },
      {
        path: 'location/:id',
        component: LocationComponent
        
      },
      {
        path: 'word',
        redirectTo: 'word/all',
      },
      {
        path: 'word/:id',
        component: WordComponent
      },
      {
        path: 'type',
        redirectTo: 'type/all',
      },
      {
        path: 'type/:id',
        component: TypeComponent
      },
      {
        path: 'theme',
        redirectTo: 'theme/all',
      },
      {
        path: 'theme/:id',
        component: ThemeComponent
      }
    ]
  },
  {
    path: 'search',
    component: SearchComponent
  },
  {
    path: 'abbreviations',
    redirectTo: 'abbreviations/all',
  },
  {
    path: 'abbreviations/:id',
    component: AbbreviationsComponent
  },
  {
    path: 'bibliography',
    redirectTo: 'bibliography/all',
  },
  {
    path: 'bibliography/:id',
    component: BibliographyComponent
  },
  {
    path: 'conventions',
    component: ConventionsComponent
  }
  /* { path: '**', component: PageNotFoundComponent } */
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
