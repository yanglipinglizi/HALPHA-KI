import { inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, EMPTY, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { IUserActivity } from '../user-activity.model';
import { UserActivityService } from '../service/user-activity.service';

export const userActivityResolve = (route: ActivatedRouteSnapshot): Observable<null | IUserActivity> => {
  const id = route.params['id'];
  if (id) {
    return inject(UserActivityService)
      .find(id)
      .pipe(
        mergeMap((userActivity: HttpResponse<IUserActivity>) => {
          if (userActivity.body) {
            return of(userActivity.body);
          } else {
            inject(Router).navigate(['404']);
            return EMPTY;
          }
        }),
      );
  }
  return of(null);
};

export default userActivityResolve;
