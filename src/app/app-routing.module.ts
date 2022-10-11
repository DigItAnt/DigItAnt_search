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
          routerLink: '',
          active: true,
          class: 'breadcrumb-item active',
          target: '_self'
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
          routerLink: '/browse',
          active: true,
          class: 'breadcrumb-item active',
          target: '_self'
        }
      ]
    },
    children : [
      {
        path: 'date',
        component: DateComponent,
        data : {
          breadcrumb : [
            {
              label : 'Browse',
              routerLink: '/browse',
              active: false,
              class: 'breadcrumb-item',
              target: '_self'
            },
            {
              label : 'Date',
              routerLink: '/browse/date',
              active: true,
              class: 'breadcrumb-item',
              target: '_self'
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
