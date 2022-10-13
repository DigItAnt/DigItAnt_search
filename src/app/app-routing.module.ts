import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowseComponent } from './views/browse/browse.component';
import { DateComponent } from './views/browse/date/date.component';
import { SubdateComponent } from './views/browse/date/subdate/subdate.component';
import { LocationComponent } from './views/browse/location/location.component';
import { SublocationComponent } from './views/browse/location/sublocation/sublocation.component';
import { HomeComponent } from './views/home/home.component';

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
        component: DateComponent,
        children: [
          {
            path: ':id',
            component: SubdateComponent
          }
        ]
      },
      {
        path: 'location',
        component: LocationComponent,
        children: [
          {
            path: ':id',
            component: SublocationComponent
          }
        ]
      }
    ]
  },
  /* { path: '**', component: PageNotFoundComponent } */
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
