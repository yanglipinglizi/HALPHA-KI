import { Component, Input } from '@angular/core';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { JvmMetrics } from 'src/main/webapp/app/admin/metrics/metrics.model';

@Component({
  standalone: true,
  selector: 'jhi-jvm-memory',
  templateUrl: './jvm-memory.component.html',
  imports: [SharedModule],
})
export class JvmMemoryComponent {
  /**
   * object containing all jvm memory metrics
   */
  @Input() jvmMemoryMetrics?: { [key: string]: JvmMetrics };

  /**
   * boolean field saying if the metrics are in the process of being updated
   */
  @Input() updating?: boolean;
}
