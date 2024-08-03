import { TestBed } from '@angular/core/testing';

import { sampleWithRequiredData, sampleWithNewData } from '../user-activity.test-samples';

import { UserActivityFormService } from './user-activity-form.service';

describe('UserActivity Form Service', () => {
  let service: UserActivityFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserActivityFormService);
  });

  describe('Service methods', () => {
    describe('createUserActivityFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createUserActivityFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            reportedFor: expect.any(Object),
            recordedAt: expect.any(Object),
            userId: expect.any(Object),
            reportedAbsoluteCount: expect.any(Object),
            patient: expect.any(Object),
          }),
        );
      });

      it('passing IUserActivity should create a new form with FormGroup', () => {
        const formGroup = service.createUserActivityFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            reportedFor: expect.any(Object),
            recordedAt: expect.any(Object),
            userId: expect.any(Object),
            reportedAbsoluteCount: expect.any(Object),
            patient: expect.any(Object),
          }),
        );
      });
    });

    describe('getUserActivity', () => {
      it('should return NewUserActivity for default UserActivity initial value', () => {
        const formGroup = service.createUserActivityFormGroup(sampleWithNewData);

        const userActivity = service.getUserActivity(formGroup) as any;

        expect(userActivity).toMatchObject(sampleWithNewData);
      });

      it('should return NewUserActivity for empty UserActivity initial value', () => {
        const formGroup = service.createUserActivityFormGroup();

        const userActivity = service.getUserActivity(formGroup) as any;

        expect(userActivity).toMatchObject({});
      });

      it('should return IUserActivity', () => {
        const formGroup = service.createUserActivityFormGroup(sampleWithRequiredData);

        const userActivity = service.getUserActivity(formGroup) as any;

        expect(userActivity).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IUserActivity should not enable id FormControl', () => {
        const formGroup = service.createUserActivityFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewUserActivity should disable id FormControl', () => {
        const formGroup = service.createUserActivityFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
