import { inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, EMPTY, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { IGeoLocation } from '../geo-location.model';
import { GeoLocationService } from '../service/geo-location.service';

export const geoLocationResolve = (route: ActivatedRouteSnapshot): Observable<null | IGeoLocation> => {
  const id = route.params['id'];
  if (id) {
    return inject(GeoLocationService)
      .find(id)
      .pipe(
        mergeMap((geoLocation: HttpResponse<IGeoLocation>) => {
          if (geoLocation.body) {
            return of(geoLocation.body);
          } else {
            inject(Router).navigate(['404']);
            return EMPTY;
          }
        }),
      );
  }
  return of(null);
};

export default geoLocationResolve;
