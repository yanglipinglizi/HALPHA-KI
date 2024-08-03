import { Component, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IPatient } from '../patient.model';
import { PatientService } from '../service/patient.service';
import { PatientFormService, PatientFormGroup } from './patient-form.service';

@Component({
  standalone: true,
  selector: 'jhi-patient-update',
  templateUrl: './patient-update.component.html',
  imports: [SharedModule, FormsModule, ReactiveFormsModule],
})
export class PatientUpdateComponent implements OnInit {
  isSaving = false;
  patient: IPatient | null = null;

  editForm: PatientFormGroup = this.patientFormService.createPatientFormGroup();

  medicalConditions: string[] = ['blood pressure related disease', 'heart disease', 'other disease'];
  customCondition: string = '';
  fullMedicalCondition: string | null = null;

  constructor(
    protected patientService: PatientService,
    protected patientFormService: PatientFormService,
    protected activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ patient }) => {
      this.patient = patient;
      if (patient) {
        this.updateForm(patient);
        this.fullMedicalCondition = patient.medical_preconditions;
        this.splitMedicalCondition(this.fullMedicalCondition);
        this.updateMedicalCondition();
        patient.medical_preconditions = this.fullMedicalCondition;
      }
    });
  }

  splitMedicalCondition(condition: string | null): void {
    if (condition) {
      // Check if the condition is in the predefined list of diseases
      const matchedCondition = this.medicalConditions.find(c => condition.includes(c));
      if (matchedCondition) {
        // If it is a predefined disease, the dropdown form displays the disease
        this.editForm.get('medical_preconditions')?.setValue(matchedCondition);
        if (condition.includes(':')) {
          this.customCondition = condition.replace(matchedCondition + ': ', ''); // Remove category prefixes
        } else {
          this.customCondition = condition.replace(matchedCondition, '');
        }
      } else {
        // If the disease is not predefined, the drop-down form displays "other diseases"
        this.editForm.get('medical_preconditions')?.setValue('other disease');
        this.customCondition = condition.replace('other disease: ', ''); // Remove category prefixes
      }
    }
  }

  updateMedicalCondition(): void {
    const selectedCategory = this.editForm.get('medical_preconditions')?.value || '';
    this.fullMedicalCondition = selectedCategory + (this.customCondition.length === 0 ? '' : ': ' + this.customCondition);
    console.log('customCondition' + this.fullMedicalCondition);
  }

  previousState(): void {
    window.history.back();
  }

  save(): void {
    this.isSaving = true;
    //const patient = this.patientFormService.getPatient(this.editForm);
    this.updateMedicalCondition();
    const patient = {
      ...this.patientFormService.getPatient(this.editForm),
      medical_preconditions: this.fullMedicalCondition, // Use the updated full condition
    };
    if (patient.id !== null) {
      this.subscribeToSaveResponse(this.patientService.update(patient));
    } else {
      this.subscribeToSaveResponse(this.patientService.create(patient));
    }
  }

  protected subscribeToSaveResponse(result: Observable<HttpResponse<IPatient>>): void {
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

  protected updateForm(patient: IPatient): void {
    this.patient = patient;
    this.patientFormService.resetForm(this.editForm, patient);
  }
}
