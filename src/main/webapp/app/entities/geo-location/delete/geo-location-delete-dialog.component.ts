import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { ITEM_DELETED_EVENT } from 'src/main/webapp/app/config/navigation.constants';
import { IGeoLocation } from '../geo-location.model';
import { GeoLocationService } from '../service/geo-location.service';

@Component({
  standalone: true,
  templateUrl: './geo-location-delete-dialog.component.html',
  imports: [SharedModule, FormsModule],
})
export class GeoLocationDeleteDialogComponent {
  geoLocation?: IGeoLocation;

  constructor(
    protected geoLocationService: GeoLocationService,
    protected activeModal: NgbActiveModal,
  ) {}

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: number): void {
    this.geoLocationService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
