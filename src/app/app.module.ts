//INTERNAL ANGULAR LIBS
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';


//PRIMENG
import {ToolbarModule} from 'primeng/toolbar';
import {ButtonModule} from 'primeng/button';
import {AutoCompleteModule} from 'primeng/autocomplete';
import {MenubarModule} from 'primeng/menubar';
import {BreadcrumbModule} from 'primeng/breadcrumb';
import {CardModule} from 'primeng/card';
import {PaginatorModule} from 'primeng/paginator';
import {BadgeModule} from 'primeng/badge';
import {PanelModule} from 'primeng/panel';
import {InputTextModule} from 'primeng/inputtext';
import {ToggleButtonModule} from 'primeng/togglebutton';
import {TooltipModule} from 'primeng/tooltip';
import {RadioButtonModule} from 'primeng/radiobutton';
import {DropdownModule} from 'primeng/dropdown';

//LEAFLET
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

//SHARED COMPONENTS
import { NavbarComponent } from './shared/navbar/navbar.component';
import { MainComponent } from './shared/main/main.component';
import { FooterComponent } from './shared/footer/footer.component';

//VIEWS
import { HomeComponent } from './views/home/home.component';
import { BrowseComponent } from './views/browse/browse.component';
import { DateComponent } from './views/browse/date/date.component';
import { LocationComponent } from './views/browse/location/location.component';
import { WordComponent } from './views/browse/word/word.component';
import { TypeComponent } from './views/browse/type/type.component';
import { ThemeComponent } from './views/browse/theme/theme.component';
import { SearchComponent } from './views/search/search.component';
import { ReactiveFormsModule } from '@angular/forms';
import { BibliographyComponent } from './views/bibliography/bibliography.component';
import { ConventionsComponent } from './views/conventions/conventions.component';
import { GlossaryComponent } from './views/glossary/glossary.component';
import { ConcordancesComponent } from './views/concordances/concordances.component';
import { AbbreviationsComponent } from './views/abbreviations/abbreviations.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HomeComponent,
    MainComponent,
    FooterComponent,
    BrowseComponent,
    DateComponent,
    LocationComponent,
    WordComponent,
    TypeComponent,
    ThemeComponent,
    SearchComponent,
    BibliographyComponent,
    ConventionsComponent,
    GlossaryComponent,
    ConcordancesComponent,
    AbbreviationsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ToolbarModule,
    ButtonModule,
    AutoCompleteModule,
    MenubarModule,
    BreadcrumbModule,
    CardModule,
    PaginatorModule,
    LeafletModule,
    BadgeModule,
    PanelModule,
    InputTextModule,
    ToggleButtonModule,
    TooltipModule,
    RadioButtonModule,
    ReactiveFormsModule,
    DropdownModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
