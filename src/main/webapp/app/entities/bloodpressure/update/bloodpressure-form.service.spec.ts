import { TestBed } from '@angular/core/testing';

import { sampleWithRequiredData, sampleWithNewData } from '../bloodpressure.test-samples';

import { BloodpressureFormService } from './bloodpressure-form.service';

describe('Bloodpressure Form Service', () => {
  let service: BloodpressureFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BloodpressureFormService);
  });

  describe('Service methods', () => {
    describe('createBloodpressureFormGroup', () => {
      it('should create a new form with FormControl', () => {
        const formGroup = service.createBloodpressureFormGroup();

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            systolic: expect.any(Object),
            diastolic: expect.any(Object),
            pulse: expect.any(Object),
            recorded_at: expect.any(Object),
            user_id: expect.any(Object),
            patient: expect.any(Object),
          }),
        );
      });

      it('passing IBloodpressure should create a new form with FormGroup', () => {
        const formGroup = service.createBloodpressureFormGroup(sampleWithRequiredData);

        expect(formGroup.controls).toEqual(
          expect.objectContaining({
            id: expect.any(Object),
            systolic: expect.any(Object),
            diastolic: expect.any(Object),
            pulse: expect.any(Object),
            recorded_at: expect.any(Object),
            user_id: expect.any(Object),
            patient: expect.any(Object),
          }),
        );
      });
    });

    describe('getBloodpressure', () => {
      it('should return NewBloodpressure for default Bloodpressure initial value', () => {
        const formGroup = service.createBloodpressureFormGroup(sampleWithNewData);

        const bloodpressure = service.getBloodpressure(formGroup) as any;

        expect(bloodpressure).toMatchObject(sampleWithNewData);
      });

      it('should return NewBloodpressure for empty Bloodpressure initial value', () => {
        const formGroup = service.createBloodpressureFormGroup();

        const bloodpressure = service.getBloodpressure(formGroup) as any;

        expect(bloodpressure).toMatchObject({});
      });

      it('should return IBloodpressure', () => {
        const formGroup = service.createBloodpressureFormGroup(sampleWithRequiredData);

        const bloodpressure = service.getBloodpressure(formGroup) as any;

        expect(bloodpressure).toMatchObject(sampleWithRequiredData);
      });
    });

    describe('resetForm', () => {
      it('passing IBloodpressure should not enable id FormControl', () => {
        const formGroup = service.createBloodpressureFormGroup();
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, sampleWithRequiredData);

        expect(formGroup.controls.id.disabled).toBe(true);
      });

      it('passing NewBloodpressure should disable id FormControl', () => {
        const formGroup = service.createBloodpressureFormGroup(sampleWithRequiredData);
        expect(formGroup.controls.id.disabled).toBe(true);

        service.resetForm(formGroup, { id: null });

        expect(formGroup.controls.id.disabled).toBe(true);
      });
    });
  });
});
