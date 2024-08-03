import { Component, Input } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe } from 'src/main/webapp/app/shared/date';
import { IUserActivity } from '../user-activity.model';

@Component({
  standalone: true,
  selector: 'jhi-user-activity-detail',
  templateUrl: './user-activity-detail.component.html',
  imports: [SharedModule, RouterModule, DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe],
})
export class UserActivityDetailComponent {
  @Input() userActivity: IUserActivity | null = null;

  constructor(protected activatedRoute: ActivatedRoute) {}

  previousState(): void {
    window.history.back();
  }
}
