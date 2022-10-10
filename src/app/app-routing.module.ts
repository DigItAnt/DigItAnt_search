import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BrowseComponent } from './views/browse/browse.component';
import { DateComponent } from './views/browse/date/date.component';
import { HomeComponent } from './views/home/home.component';

const routes: Routes = [
  {
    path: '', 
    component: HomeComponent,
    data : {
      breadcrumb : [
        {
          label : 'Home',
          url: '',
          active: true,
          class: 'breadcrumb-item active'
        }
      ]
    }
  },
  {
    path: 'browse', 
    component: BrowseComponent,
    data : {
      breadcrumb : [
        {
          label : 'Browse',
          url: '/browse',
          active: true,
          class: 'breadcrumb-item active'
        }
      ]
    },children : [
      {
        path: 'date',
        component: DateComponent,
        data : {
          breadcrumb : [
            {
              label : 'Browse',
              url: '/browse',
              active: false,
              class: 'breadcrumb-item'
            },
            {
              label : 'Date',
              url: '/browse/date',
              active: true,
              class: 'breadcrumb-item'
            }
          ]
        },
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
