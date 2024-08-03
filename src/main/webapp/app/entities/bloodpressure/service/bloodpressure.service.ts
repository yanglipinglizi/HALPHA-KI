import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { isPresent } from 'src/main/webapp/app/core/util/operators';
import { ApplicationConfigService } from 'src/main/webapp/app/core/config/application-config.service';
import { createRequestOption } from 'src/main/webapp/app/core/request/request-util';
import { IBloodpressure, NewBloodpressure } from '../bloodpressure.model';

export type PartialUpdateBloodpressure = Partial<IBloodpressure> & Pick<IBloodpressure, 'id'>;

export type EntityResponseType = HttpResponse<IBloodpressure>;
export type EntityArrayResponseType = HttpResponse<IBloodpressure[]>;

@Injectable({ providedIn: 'root' })
export class BloodpressureService {
  protected resourceUrl = this.applicationConfigService.getEndpointFor('api/bloodpressures');

  constructor(
    protected http: HttpClient,
    protected applicationConfigService: ApplicationConfigService,
  ) {}

  create(bloodpressure: NewBloodpressure): Observable<EntityResponseType> {
    return this.http.post<IBloodpressure>(this.resourceUrl, bloodpressure, { observe: 'response' });
  }

  update(bloodpressure: IBloodpressure): Observable<EntityResponseType> {
    return this.http.put<IBloodpressure>(`${this.resourceUrl}/${this.getBloodpressureIdentifier(bloodpressure)}`, bloodpressure, {
      observe: 'response',
    });
  }

  partialUpdate(bloodpressure: PartialUpdateBloodpressure): Observable<EntityResponseType> {
    return this.http.patch<IBloodpressure>(`${this.resourceUrl}/${this.getBloodpressureIdentifier(bloodpressure)}`, bloodpressure, {
      observe: 'response',
    });
  }

  find(id: number): Observable<EntityResponseType> {
    return this.http.get<IBloodpressure>(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  query(req?: any): Observable<EntityArrayResponseType> {
    const options = createRequestOption(req);
    return this.http.get<IBloodpressure[]>(this.resourceUrl, { params: options, observe: 'response' });
  }

  delete(id: number): Observable<HttpResponse<{}>> {
    return this.http.delete(`${this.resourceUrl}/${id}`, { observe: 'response' });
  }

  getBloodpressureIdentifier(bloodpressure: Pick<IBloodpressure, 'id'>): number {
    return bloodpressure.id;
  }

  compareBloodpressure(o1: Pick<IBloodpressure, 'id'> | null, o2: Pick<IBloodpressure, 'id'> | null): boolean {
    return o1 && o2 ? this.getBloodpressureIdentifier(o1) === this.getBloodpressureIdentifier(o2) : o1 === o2;
  }

  addBloodpressureToCollectionIfMissing<Type extends Pick<IBloodpressure, 'id'>>(
    bloodpressureCollection: Type[],
    ...bloodpressuresToCheck: (Type | null | undefined)[]
  ): Type[] {
    const bloodpressures: Type[] = bloodpressuresToCheck.filter(isPresent);
    if (bloodpressures.length > 0) {
      const bloodpressureCollectionIdentifiers = bloodpressureCollection.map(
        bloodpressureItem => this.getBloodpressureIdentifier(bloodpressureItem)!,
      );
      const bloodpressuresToAdd = bloodpressures.filter(bloodpressureItem => {
        const bloodpressureIdentifier = this.getBloodpressureIdentifier(bloodpressureItem);
        if (bloodpressureCollectionIdentifiers.includes(bloodpressureIdentifier)) {
          return false;
        }
        bloodpressureCollectionIdentifiers.push(bloodpressureIdentifier);
        return true;
      });
      return [...bloodpressuresToAdd, ...bloodpressureCollection];
    }
    return bloodpressureCollection;
  }
}
