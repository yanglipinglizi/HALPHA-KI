import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IPatient } from 'src/main/webapp/app/entities/patient/patient.model';
import { PatientService } from 'src/main/webapp/app/entities/patient/service/patient.service';
import { IBloodpressure } from '../bloodpressure.model';
import { BloodpressureService } from '../service/bloodpressure.service';
import { BloodpressureFormService, BloodpressureFormGroup } from './bloodpressure-form.service';

@Component({
  standalone: true,
  selector: 'jhi-bloodpressure-update',
  templateUrl: './bloodpressure-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class BloodpressureUpdateComponent implements OnInit {
  isSaving = false;
  bloodpressure: IBloodpressure | null = null;

  patientsSharedCollection: IPatient[] = [];

  editForm: BloodpressureFormGroup = this.bloodpressureFormService.createBloodpressureFormGroup();

  constructor(
    protected bloodpressureService: BloodpressureService,
    protected bloodpressureFormService: BloodpressureFormService,
    protected patientService: PatientService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  comparePatient = (o1: IPatient | null, o2: IPatient | null): boolean => this.patientService.comparePatient(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ bloodpressure }) => {
      this.bloodpressure = bloodpressure;
      if (bloodpressure) {
        this.updateForm(bloodpressure);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const bloodpressure = this.bloodpressureFormService.getBloodpressure(this.editForm);
    if (bloodpressure.id !== null) {
      this.subscribeToSaveResponse(this.bloodpressureService.update(bloodpressure));
    } else {
      this.subscribeToSaveResponse(this.bloodpressureService.create(bloodpressure));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IBloodpressure>>): void {
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

  protected updateForm(bloodpressure: IBloodpressure): void {
    this.bloodpressure = bloodpressure;
    this.bloodpressureFormService.resetForm(this.editForm, bloodpressure);

    this.patientsSharedCollection = this.patientService.addPatientToCollectionIfMissing<IPatient>(
      this.patientsSharedCollection,
      bloodpressure.patient,
    );
  }

  protected loadRelationshipsOptions(): void {
    this.patientService
      .query()
      .pipe(map((res: HttpResponse<IPatient[]>) => res.body ?? []))
      .pipe(
        map((patients: IPatient[]) => this.patientService.addPatientToCollectionIfMissing<IPatient>(patients, this.bloodpressure?.patient)),
      )
      .subscribe((patients: IPatient[]) => (this.patientsSharedCollection = patients));
  }
}
