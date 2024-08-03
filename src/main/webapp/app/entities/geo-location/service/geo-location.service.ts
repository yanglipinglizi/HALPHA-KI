import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { isPresent } from 'src/main/webapp/app/core/util/operators';
import { ApplicationConfigService } from 'src/main/webapp/app/core/config/application-config.service';
import { createRequestOption } from 'src/main/webapp/app/core/request/request-util';
import { IGeoLocation, NewGeoLocation } from '../geo-location.model';

export type PartialUpdateGeoLocation = Partial<IGeoLocation> & Pick<IGeoLocation, 'id'>;

export type EntityResponseType = HttpResponse<IGeoLocation>;
export type EntityArrayResponseType = HttpResponse<IGeoLocation[]>;

@Injectable({ providedIn: 'root' })
export class GeoLocationService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/geo-locations');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(geoLocation: NewGeoLocation): Observable<EntityResponseType> {
    return this.http.post<IGeoLocation>(this.resourceUrl, geoLocation, { observe: 'response' });
  }

  update(geoLocation: IGeoLocation): Observable<EntityResponseType> {
    return this.http.put<IGeoLocation>(`${this.resourceUrl}/${this.getGeoLocationIdentifier(geoLocation)}`, geoLocation, {
      observe: 'response',
    });
  }

  partialUpdate(geoLocation: PartialUpdateGeoLocation): Observable<EntityResponseType> {
    return this.http.patch<IGeoLocation>(`${this.resourceUrl}/${this.getGeoLocationIdentifier(geoLocation)}`, geoLocation, {
      observe: 'response',
    });
  }

  find(id: number): Observable<EntityResponseType> {
    return this.http.get<IGeoLocation>(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<IGeoLocation[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: number): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  getGeoLocationIdentifier(geoLocation: Pick<IGeoLocation, 'id'>): number {
    return geoLocation.id;
  }

  compareGeoLocation(o1: Pick<IGeoLocation, 'id'> | null, o2: Pick<IGeoLocation, 'id'> | null): boolean {
    return o1 && o2 ? this.getGeoLocationIdentifier(o1) === this.getGeoLocationIdentifier(o2) : o1 === o2;
  }

  addGeoLocationToCollectionIfMissing<Type extends Pick<IGeoLocation, 'id'>>(
    geoLocationCollection: Type[],
    ...geoLocationsToCheck: (Type | null | undefined)[]
  ): Type[] {
    const geoLocations: Type[] = geoLocationsToCheck.filter(isPresent);
    if (geoLocations.length > 0) {
      const geoLocationCollectionIdentifiers = geoLocationCollection.map(
        geoLocationItem => this.getGeoLocationIdentifier(geoLocationItem)!,
      );
      const geoLocationsToAdd = geoLocations.filter(geoLocationItem => {
        const geoLocationIdentifier = this.getGeoLocationIdentifier(geoLocationItem);
        if (geoLocationCollectionIdentifiers.includes(geoLocationIdentifier)) {
          return false;
        }
        geoLocationCollectionIdentifiers.push(geoLocationIdentifier);
        return true;
      });
      return [...geoLocationsToAdd, ...geoLocationCollection];
    }
    return geoLocationCollection;
  }
}
