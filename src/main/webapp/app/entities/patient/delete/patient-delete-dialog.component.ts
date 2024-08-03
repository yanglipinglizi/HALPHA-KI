import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { ITEM_DELETED_EVENT } from 'src/main/webapp/app/config/navigation.constants';
import { IPatient } from '../patient.model';
import { PatientService } from '../service/patient.service';

@Component({
  standalone: true,
  templateUrl: './patient-delete-dialog.component.html',
  imports: [SharedModule, FormsModule],
})
export class PatientDeleteDialogComponent {
  patient?: IPatient;

  constructor(
    protected patientService: PatientService,
    protected activeModal: NgbActiveModal,
  ) {}

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: number): void {
    this.patientService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
