import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AbbreviationsComponent } from './views/abbreviations/abbreviations.component';
import { BibliographyComponent } from './views/bibliography/bibliography.component';
import { AboutComponent } from './views/browse/about/about.component';
import { CitationsComponent } from './views/browse/citations/citations.component';
import { ContactComponent } from './views/browse/contact/contact.component';
import { LexiconComponent } from './views/browse/lexicon/lexicon.component';
import { LocationComponent } from './views/browse/location/location.component';
import { ProjectComponent } from './views/browse/project/project.component';
import { TextsComponent } from './views/browse/texts/texts.component';
import { ThemeComponent } from './views/browse/theme/theme.component';
import { TypeComponent } from './views/browse/type/type.component';
import { WordComponent } from './views/browse/word/word.component';
import { ConcordancesComponent } from './views/concordances/concordances.component';
import { ConventionsComponent } from './views/conventions/conventions.component';
import { GlossaryComponent } from './views/glossary/glossary.component';
import { HomeComponent } from './views/home/home.component';
import { AdvancedSearchComponent } from './views/search/search.component';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  {
    path: 'home',
    component: HomeComponent,
    children: [
      { path: 'project', component: ProjectComponent },
      { path: 'about', component: AboutComponent },
      { path: 'contact', component: ContactComponent },
      { path: 'citations', component: CitationsComponent, },
    ]
  },
  { path: 'texts', component: TextsComponent},
  { path: 'lexicon', component: LexiconComponent, },
  { path: 'bibliography', component: BibliographyComponent, },
  { path: 'concordances', component: ConcordancesComponent, },
  { path: 'advancedsearch', component: AdvancedSearchComponent },
  /* { path: '**', redirectTo: '/home', }, */
  /* {
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
  } */
  /* ,
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
  },
  {
    path: 'glossary',
    component: GlossaryComponent
  } *//* ,
  {
    path: 'concordances',
    component: ConcordancesComponent
  } */
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
