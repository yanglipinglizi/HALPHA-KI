import { Routes } from '@angular/router';

import { UserRouteAccessService } from 'src/main/webapp/app/core/auth/user-route-access.service';
import { ASC } from 'src/main/webapp/app/config/navigation.constants';
import { UserActivityComponent } from './list/user-activity.component';
import { UserActivityDetailComponent } from './detail/user-activity-detail.component';
import { UserActivityUpdateComponent } from './update/user-activity-update.component';
import UserActivityResolve from './route/user-activity-routing-resolve.service';

const userActivityRoute: Routes = [
  {
    path: '',
    component: UserActivityComponent,
    data: {
      defaultSort: 'id,' + ASC,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/view',
    component: UserActivityDetailComponent,
    resolve: {
      userActivity: UserActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: 'new',
    component: UserActivityUpdateComponent,
    resolve: {
      userActivity: UserActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
  {
    path: ':id/edit',
    component: UserActivityUpdateComponent,
    resolve: {
      userActivity: UserActivityResolve,
    },
    canActivate: [UserRouteAccessService],
  },
];

export default userActivityRoute;
