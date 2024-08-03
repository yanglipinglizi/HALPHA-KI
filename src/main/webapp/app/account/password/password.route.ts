import { Route } from '@angular/router';

import { UserRouteAccessService } from 'src/main/webapp/app/core/auth/user-route-access.service';
import PasswordComponent from './password.component';

const passwordRoute: Route = {
  path: 'password',
  component: PasswordComponent,
  title: 'global.menu.account.password',
  canActivate: [UserRouteAccessService],
};

export default passwordRoute;
