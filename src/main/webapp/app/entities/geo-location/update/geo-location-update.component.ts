import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IPatient } from 'src/main/webapp/app/entities/patient/patient.model';
import { PatientService } from 'src/main/webapp/app/entities/patient/service/patient.service';
import { geoFence } from 'src/main/webapp/app/entities/enumerations/geo-fence.model';
import { geoFenceDetailedStatus } from 'src/main/webapp/app/entities/enumerations/geo-fence-detailed-status.model';
import { GeoLocationService } from '../service/geo-location.service';
import { IGeoLocation } from '../geo-location.model';
import { GeoLocationFormService, GeoLocationFormGroup } from './geo-location-form.service';

@Component({
  standalone: true,
  selector: 'jhi-geo-location-update',
  templateUrl: './geo-location-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class GeoLocationUpdateComponent implements OnInit {
  isSaving = false;
  geoLocation: IGeoLocation | null = null;
  geoFenceValues = Object.keys(geoFence);
  geoFenceDetailedStatusValues = Object.keys(geoFenceDetailedStatus);

  patientsSharedCollection: IPatient[] = [];

  editForm: GeoLocationFormGroup = this.geoLocationFormService.createGeoLocationFormGroup();

  constructor(
    protected geoLocationService: GeoLocationService,
    protected geoLocationFormService: GeoLocationFormService,
    protected patientService: PatientService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  comparePatient = (o1: IPatient | null, o2: IPatient | null): boolean => this.patientService.comparePatient(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ geoLocation }) => {
      this.geoLocation = geoLocation;
      if (geoLocation) {
        this.updateForm(geoLocation);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    const geoLocation = this.geoLocationFormService.getGeoLocation(this.editForm);
    if (geoLocation.id !== null) {
      this.subscribeToSaveResponse(this.geoLocationService.update(geoLocation));
    } else {
      this.subscribeToSaveResponse(this.geoLocationService.create(geoLocation));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IGeoLocation>>): void {
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

  protected updateForm(geoLocation: IGeoLocation): void {
    this.geoLocation = geoLocation;
    this.geoLocationFormService.resetForm(this.editForm, geoLocation);

    this.patientsSharedCollection = this.patientService.addPatientToCollectionIfMissing<IPatient>(
      this.patientsSharedCollection,
      geoLocation.patient,
    );
  }

  protected loadRelationshipsOptions(): void {
    this.patientService
      .query()
      .pipe(map((res: HttpResponse<IPatient[]>) => res.body ?? []))
      .pipe(
        map((patients: IPatient[]) => this.patientService.addPatientToCollectionIfMissing<IPatient>(patients, this.geoLocation?.patient)),
      )
      .subscribe((patients: IPatient[]) => (this.patientsSharedCollection = patients));
  }
}
