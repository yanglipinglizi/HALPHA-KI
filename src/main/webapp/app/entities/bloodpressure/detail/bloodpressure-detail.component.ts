import { Component, Input } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe } from 'src/main/webapp/app/shared/date';
import { IBloodpressure } from '../bloodpressure.model';

@Component({
  standalone: true,
  selector: 'jhi-bloodpressure-detail',
  templateUrl: './bloodpressure-detail.component.html',
  imports: [SharedModule, RouterModule, DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe],
})
export class BloodpressureDetailComponent {
  @Input() bloodpressure: IBloodpressure | null = null;

  constructor(protected activatedRoute: ActivatedRoute) {}

  previousState(): void {
    window.history.back();
  }
}
