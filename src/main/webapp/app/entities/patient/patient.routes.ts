import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'src/main/webapp/app/core/auth/user-route-access.service';
import { ASC } from 'src/main/webapp/app/config/navigation.constants';
import { PatientComponent } from './list/patient.component';
import { PatientDetailComponent } from './detail/patient-detail.component';
import { PatientUpdateComponent } from './update/patient-update.component';
import PatientResolve from './route/patient-routing-resolve.service';

const patientRoute: Routes = [
  {
    path: '',
    component: PatientComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: PatientDetailComponent,
    resolve: {
      patient: PatientResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: PatientUpdateComponent,
    resolve: {
      patient: PatientResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: PatientUpdateComponent,
    resolve: {
      patient: PatientResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default patientRoute;
