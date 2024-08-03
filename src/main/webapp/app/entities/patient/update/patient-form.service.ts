import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { IPatient, NewPatient } from '../patient.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IPatient for edit and NewPatientFormGroupInput for create.
 */
type PatientFormGroupInput = IPatient | PartialWithRequiredKeyOf<NewPatient>;

type PatientFormDefaults = Pick<NewPatient, 'id'>;

type PatientFormGroupContent = {
  id: FormControl<IPatient['id'] | NewPatient['id']>;
  health: FormControl<IPatient['health']>;
  geo: FormControl<IPatient['geo']>;
  user_id: FormControl<IPatient['user_id']>;
  nickname: FormControl<IPatient['nickname']>;
  title: FormControl<IPatient['title']>;
  birthday: FormControl<IPatient['birthday']>;
  sex: FormControl<IPatient['sex']>;
  home_longitude: FormControl<IPatient['home_longitude']>;
  home_latitude: FormControl<IPatient['home_latitude']>;
  medical_preconditions: FormControl<IPatient['medical_preconditions']>;
};

export type PatientFormGroup = FormGroup<PatientFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class PatientFormService {
  createPatientFormGroup(patient: PatientFormGroupInput = { id: null }): PatientFormGroup {
    const patientRawValue = {
      ...this.getFormDefaults(),
      ...patient,
    };
    return new FormGroup<PatientFormGroupContent>({
      id: new FormControl(
        { value: patientRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      health: new FormControl(patientRawValue.health),
      geo: new FormControl(patientRawValue.geo),
      user_id: new FormControl(patientRawValue.user_id),
      nickname: new FormControl(patientRawValue.nickname),
      title: new FormControl(patientRawValue.title),
      birthday: new FormControl(patientRawValue.birthday),
      sex: new FormControl(patientRawValue.sex),
      home_longitude: new FormControl(patientRawValue.home_longitude),
      home_latitude: new FormControl(patientRawValue.home_latitude),
      medical_preconditions: new FormControl(patientRawValue.medical_preconditions),
    });
  }

  getPatient(form: PatientFormGroup): IPatient | NewPatient {
    return form.getRawValue() as IPatient | NewPatient;
  }

  resetForm(form: PatientFormGroup, patient: PatientFormGroupInput): void {
    const patientRawValue = { ...this.getFormDefaults(), ...patient };
    form.reset(
      {
        ...patientRawValue,
        id: { value: patientRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): PatientFormDefaults {
    return {
      id: null,
    };
  }
}
