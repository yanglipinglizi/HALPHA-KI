import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { IUserActivity, NewUserActivity } from '../user-activity.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IUserActivity for edit and NewUserActivityFormGroupInput for create.
 */
type UserActivityFormGroupInput = IUserActivity | PartialWithRequiredKeyOf<NewUserActivity>;

type UserActivityFormDefaults = Pick<NewUserActivity, 'id'>;

type UserActivityFormGroupContent = {
  id: FormControl<IUserActivity['id'] | NewUserActivity['id']>;
  reportedFor: FormControl<IUserActivity['reportedFor']>;
  recordedAt: FormControl<IUserActivity['recordedAt']>;
  userId: FormControl<IUserActivity['userId']>;
  reportedAbsoluteCount: FormControl<IUserActivity['reportedAbsoluteCount']>;
  patient: FormControl<IUserActivity['patient']>;
};

export type UserActivityFormGroup = FormGroup<UserActivityFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class UserActivityFormService {
  createUserActivityFormGroup(userActivity: UserActivityFormGroupInput = { id: null }): UserActivityFormGroup {
    const userActivityRawValue = {
      ...this.getFormDefaults(),
      ...userActivity,
    };
    return new FormGroup<UserActivityFormGroupContent>({
      id: new FormControl(
        { value: userActivityRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      reportedFor: new FormControl(userActivityRawValue.reportedFor),
      recordedAt: new FormControl(userActivityRawValue.recordedAt),
      userId: new FormControl(userActivityRawValue.userId),
      reportedAbsoluteCount: new FormControl(userActivityRawValue.reportedAbsoluteCount),
      patient: new FormControl(userActivityRawValue.patient),
    });
  }

  getUserActivity(form: UserActivityFormGroup): IUserActivity | NewUserActivity {
    return form.getRawValue() as IUserActivity | NewUserActivity;
  }

  resetForm(form: UserActivityFormGroup, userActivity: UserActivityFormGroupInput): void {
    const userActivityRawValue = { ...this.getFormDefaults(), ...userActivity };
    form.reset(
      {
        ...userActivityRawValue,
        id: { value: userActivityRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): UserActivityFormDefaults {
    return {
      id: null,
    };
  }
}
