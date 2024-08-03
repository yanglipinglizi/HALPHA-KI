import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApplicationConfigService } from 'src/main/webapp/app/core/config/application-config.service';

@Injectable({ providedIn: 'root' })
export class PasswordService {
  constructor(
    private http: HttpClient,
    private applicationConfigService: ApplicationConfigService,
  ) {}

  save(newPassword: string, currentPassword: string): Observable<{}> {
    return this.http.post(this.applicationConfigService.getEndpointFor('api/account/change-password'), { currentPassword, newPassword });
  }
}
