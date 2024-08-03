import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'src/main/webapp/app/core/auth/user-route-access.service';
import { ASC } from 'src/main/webapp/app/config/navigation.constants';
import { GeoLocationComponent } from './list/geo-location.component';
import { GeoLocationDetailComponent } from './detail/geo-location-detail.component';
import { GeoLocationUpdateComponent } from './update/geo-location-update.component';
import GeoLocationResolve from './route/geo-location-routing-resolve.service';

const geoLocationRoute: Routes = [
  {
    path: '',
    component: GeoLocationComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: GeoLocationDetailComponent,
    resolve: {
      geoLocation: GeoLocationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: GeoLocationUpdateComponent,
    resolve: {
      geoLocation: GeoLocationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: GeoLocationUpdateComponent,
    resolve: {
      geoLocation: GeoLocationResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default geoLocationRoute;
