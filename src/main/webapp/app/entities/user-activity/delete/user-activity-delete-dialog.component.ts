import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { ITEM_DELETED_EVENT } from 'src/main/webapp/app/config/navigation.constants';
import { IUserActivity } from '../user-activity.model';
import { UserActivityService } from '../service/user-activity.service';

@Component({
  standalone: true,
  templateUrl: './user-activity-delete-dialog.component.html',
  imports: [SharedModule, FormsModule],
})
export class UserActivityDeleteDialogComponent {
  userActivity?: IUserActivity;

  constructor(
    protected userActivityService: UserActivityService,
    protected activeModal: NgbActiveModal,
  ) {}

  cancel(): void {
    this.activeModal.dismiss();
  }

  confirmDelete(id: number): void {
    this.userActivityService.delete(id).subscribe(() => {
      this.activeModal.close(ITEM_DELETED_EVENT);
    });
  }
}
