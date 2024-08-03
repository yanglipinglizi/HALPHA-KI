import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: 'patient',
        data: { pageTitle: 'insightsApp.patient.home.title' },
        loadChildren: () => import('./patient/patient.routes'),
      },
      /*
      {
        path: 'bloodpressure',
        data: { pageTitle: 'insightsApp.bloodpressure.home.title' },
        loadChildren: () => import('./bloodpressure/bloodpressure.routes'),
      },
      */
      {
        path: 'bloodpressures/userId/:userId',
        loadChildren: () => import('./bloodpressure/bloodpressure.routes'),
      },
      {
        path: 'user-activity/userId/:userId',
        data: { pageTitle: 'insightsApp.userActivity.home.title' },
        loadChildren: () => import('./user-activity/user-activity.routes'),
      },
      {
        path: 'geo-location/userId/:userId',
        data: { pageTitle: 'insightsApp.geoLocation.home.title' },
        loadChildren: () => import('./geo-location/geo-location.routes'),
      },
      /* jhipster-needle-add-entity-route - JHipster will add entity modules routes here */
    ]),
  ],
})
export class EntityRoutingModule {}
