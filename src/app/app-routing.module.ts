import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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
  /* { path: '**', component: PageNotFoundComponent } */
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
