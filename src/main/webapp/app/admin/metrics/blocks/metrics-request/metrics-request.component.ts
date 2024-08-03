import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { HttpServerRequests } from 'src/main/webapp/app/admin/metrics/metrics.model';
import { filterNaN } from 'src/main/webapp/app/core/util/operators';

@Component({
  standalone: true,
  selector: 'jhi-metrics-request',
  templateUrl: './metrics-request.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SharedModule],
})
export class MetricsRequestComponent {
  /**
   * object containing http request related metrics
   */
  @Input() requestMetrics?: HttpServerRequests;

  /**
   * boolean field saying if the metrics are in the process of being updated
   */
  @Input() updating?: boolean;

  filterNaN = (input: number): number => filterNaN(input);
}