//INTERNAL ANGULAR LIBS
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

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
import {TableModule} from 'primeng/table';
import {TabViewModule} from 'primeng/tabview';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {MenuModule} from 'primeng/menu';
import {OverlayPanelModule} from 'primeng/overlaypanel';


//LEAFLET
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

//SHARED COMPONENTS
import { NavbarComponent } from './shared/navbar/navbar.component';
import { MainComponent } from './shared/main/main.component';
import { FooterComponent } from './shared/footer/footer.component';

//VIEWS
import { HomeComponent } from './views/home/home.component';
import { WordComponent } from './views/word/word.component';
import { TypeComponent } from './views/type/type.component';
import { AdvancedSearchComponent } from './views/search/search.component';
import { BibliographyComponent } from './views/bibliography/bibliography.component';
import { ConcordancesComponent } from './views/concordances/concordances.component';
import { LexiconComponent } from './views/lexicon/lexicon.component';
import { TextsComponent } from './views/texts/texts.component';
import { ProjectComponent } from './views/home/project/project.component';
import { AboutComponent } from './views/home/about/about.component';
import { ContactComponent } from './views/home/contact/contact.component';
import { CitationsComponent } from './views/home/citations/citations.component';

//PIPES
import { CenturyPipePipe } from './pipes/century-pipe/century-pipe.pipe';
import { UrlDecoderPipe } from './pipes/url-decoder/url-decoder.pipe';


@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HomeComponent,
    MainComponent,
    FooterComponent,
    WordComponent,
    TypeComponent,
    AdvancedSearchComponent,
    BibliographyComponent,
    ConcordancesComponent,
    LexiconComponent,
    TextsComponent,
    ProjectComponent,
    AboutComponent,
    ContactComponent,
    CitationsComponent,
    CenturyPipePipe,
    UrlDecoderPipe,
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
    DropdownModule,
    TableModule,
    TabViewModule,
    HttpClientModule,
    ProgressSpinnerModule,
    MenuModule,
    OverlayPanelModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
