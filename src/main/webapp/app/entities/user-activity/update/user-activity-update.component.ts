import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IPatient } from 'src/main/webapp/app/entities/patient/patient.model';
import { PatientService } from 'src/main/webapp/app/entities/patient/service/patient.service';
import { IUserActivity } from '../user-activity.model';
import { UserActivityService } from '../service/user-activity.service';
import { UserActivityFormService, UserActivityFormGroup } from './user-activity-form.service';

@Component({
  standalone: true,
  selector: 'jhi-user-activity-update',
  templateUrl: './user-activity-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class UserActivityUpdateComponent implements OnInit {
  isSaving = false;
  userActivity: IUserActivity | null = null;

  patientsSharedCollection: IPatient[] = [];

  editForm: UserActivityFormGroup = this.userActivityFormService.createUserActivityFormGroup();

  constructor(
    protected userActivityService: UserActivityService,
    protected userActivityFormService: UserActivityFormService,
    protected patientService: PatientService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  comparePatient = (o1: IPatient | null, o2: IPatient | null): boolean => this.patientService.comparePatient(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ userActivity }) => {
      this.userActivity = userActivity;
      if (userActivity) {
        this.updateForm(userActivity);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const userActivity = this.userActivityFormService.getUserActivity(this.editForm);
    if (userActivity.id !== null) {
      this.subscribeToSaveResponse(this.userActivityService.update(userActivity));
    } else {
      this.subscribeToSaveResponse(this.userActivityService.create(userActivity));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IUserActivity>>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving = false;
  }

  protected updateForm(userActivity: IUserActivity): void {
    this.userActivity = userActivity;
    this.userActivityFormService.resetForm(this.editForm, userActivity);

    this.patientsSharedCollection = this.patientService.addPatientToCollectionIfMissing<IPatient>(
      this.patientsSharedCollection,
      userActivity.patient,
    );
  }

  protected loadRelationshipsOptions(): void {
    this.patientService
      .query()
      .pipe(map((res: HttpResponse<IPatient[]>) => res.body ?? []))
      .pipe(
        map((patients: IPatient[]) => this.patientService.addPatientToCollectionIfMissing<IPatient>(patients, this.userActivity?.patient)),
      )
      .subscribe((patients: IPatient[]) => (this.patientsSharedCollection = patients));
  }
}
