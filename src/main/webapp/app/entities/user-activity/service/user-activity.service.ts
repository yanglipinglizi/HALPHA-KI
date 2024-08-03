import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { isPresent } from 'src/main/webapp/app/core/util/operators';
import { ApplicationConfigService } from 'src/main/webapp/app/core/config/application-config.service';
import { createRequestOption } from 'src/main/webapp/app/core/request/request-util';
import { IUserActivity, NewUserActivity } from '../user-activity.model';

export type PartialUpdateUserActivity = Partial<IUserActivity> & Pick<IUserActivity, 'id'>;

export type EntityResponseType = HttpResponse<IUserActivity>;
export type EntityArrayResponseType = HttpResponse<IUserActivity[]>;

@Injectable({ providedIn: 'root' })
export class UserActivityService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/user-activities');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(userActivity: NewUserActivity): Observable<EntityResponseType> {
    return this.http.post<IUserActivity>(this.resourceUrl, userActivity, { observe: 'response' });
  }

  update(userActivity: IUserActivity): Observable<EntityResponseType> {
    return this.http.put<IUserActivity>(`${this.resourceUrl}/${this.getUserActivityIdentifier(userActivity)}`, userActivity, {
      observe: 'response',
    });
  }

  partialUpdate(userActivity: PartialUpdateUserActivity): Observable<EntityResponseType> {
    return this.http.patch<IUserActivity>(`${this.resourceUrl}/${this.getUserActivityIdentifier(userActivity)}`, userActivity, {
      observe: 'response',
    });
  }

  find(id: number): Observable<EntityResponseType> {
    return this.http.get<IUserActivity>(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<IUserActivity[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: number): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  getUserActivityIdentifier(userActivity: Pick<IUserActivity, 'id'>): number {
    return userActivity.id;
  }

  compareUserActivity(o1: Pick<IUserActivity, 'id'> | null, o2: Pick<IUserActivity, 'id'> | null): boolean {
    return o1 && o2 ? this.getUserActivityIdentifier(o1) === this.getUserActivityIdentifier(o2) : o1 === o2;
  }

  addUserActivityToCollectionIfMissing<Type extends Pick<IUserActivity, 'id'>>(
    userActivityCollection: Type[],
    ...userActivitiesToCheck: (Type | null | undefined)[]
  ): Type[] {
    const userActivities: Type[] = userActivitiesToCheck.filter(isPresent);
    if (userActivities.length > 0) {
      const userActivityCollectionIdentifiers = userActivityCollection.map(
        userActivityItem => this.getUserActivityIdentifier(userActivityItem)!,
      );
      const userActivitiesToAdd = userActivities.filter(userActivityItem => {
        const userActivityIdentifier = this.getUserActivityIdentifier(userActivityItem);
        if (userActivityCollectionIdentifiers.includes(userActivityIdentifier)) {
          return false;
        }
        userActivityCollectionIdentifiers.push(userActivityIdentifier);
        return true;
      });
      return [...userActivitiesToAdd, ...userActivityCollection];
    }
    return userActivityCollection;
  }
}
