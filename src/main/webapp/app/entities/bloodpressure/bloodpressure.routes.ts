import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'src/main/webapp/app/core/auth/user-route-access.service';
import { ASC } from 'src/main/webapp/app/config/navigation.constants';
import { BloodpressureComponent } from './list/bloodpressure.component';
import { BloodpressureDetailComponent } from './detail/bloodpressure-detail.component';
import { BloodpressureUpdateComponent } from './update/bloodpressure-update.component';
import BloodpressureResolve from './route/bloodpressure-routing-resolve.service';

const bloodpressureRoute: Routes = [
  {
    path: '',
    component: BloodpressureComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: BloodpressureDetailComponent,
    resolve: {
      bloodpressure: BloodpressureResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: BloodpressureUpdateComponent,
    resolve: {
      bloodpressure: BloodpressureResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: BloodpressureUpdateComponent,
    resolve: {
      bloodpressure: BloodpressureResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default bloodpressureRoute;
