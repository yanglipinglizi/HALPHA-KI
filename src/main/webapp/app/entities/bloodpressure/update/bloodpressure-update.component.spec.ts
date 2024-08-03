import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, from } from 'rxjs';

import { IPatient } from 'src/main/webapp/app/entities/patient/patient.model';
import { PatientService } from 'src/main/webapp/app/entities/patient/service/patient.service';
import { BloodpressureService } from '../service/bloodpressure.service';
import { IBloodpressure } from '../bloodpressure.model';
import { BloodpressureFormService } from './bloodpressure-form.service';

import { BloodpressureUpdateComponent } from './bloodpressure-update.component';

describe('Bloodpressure Management Update Component', () => {
  let comp: BloodpressureUpdateComponent;
  let fixture: ComponentFixture<BloodpressureUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let bloodpressureFormService: BloodpressureFormService;
  let bloodpressureService: BloodpressureService;
  let patientService: PatientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([]), BloodpressureUpdateComponent],
      providers: [
        FormBuilder,
        {
          provide: ActivatedRoute,
          useValue: {
            params: from([{}]),
          },
        },
      ],
    })
      .overrideTemplate(BloodpressureUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(BloodpressureUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    bloodpressureFormService = TestBed.inject(BloodpressureFormService);
    bloodpressureService = TestBed.inject(BloodpressureService);
    patientService = TestBed.inject(PatientService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('Should call Patient query and add missing value', () => {
      const bloodpressure: IBloodpressure = { id: 456 };
      const patient: IPatient = { id: 19723 };
      bloodpressure.patient = patient;

      const patientCollection: IPatient[] = [{ id: 9405 }];
      jest.spyOn(patientService, 'query').mockReturnValue(of(new HttpResponse({ body: patientCollection })));
      const additionalPatients = [patient];
      const expectedCollection: IPatient[] = [...additionalPatients, ...patientCollection];
      jest.spyOn(patientService, 'addPatientToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ bloodpressure });
      comp.ngOnInit();

      expect(patientService.query).toHaveBeenCalled();
      expect(patientService.addPatientToCollectionIfMissing).toHaveBeenCalledWith(
        patientCollection,
        ...additionalPatients.map(expect.objectContaining),
      );
      expect(comp.patientsSharedCollection).toEqual(expectedCollection);
    });

    it('Should update editForm', () => {
      const bloodpressure: IBloodpressure = { id: 456 };
      const patient: IPatient = { id: 24853 };
      bloodpressure.patient = patient;

      activatedRoute.data = of({ bloodpressure });
      comp.ngOnInit();

      expect(comp.patientsSharedCollection).toContain(patient);
      expect(comp.bloodpressure).toEqual(bloodpressure);
    });
  });

  describe('save', () => {
    it('Should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IBloodpressure>>();
      const bloodpressure = { id: 123 };
      jest.spyOn(bloodpressureFormService, 'getBloodpressure').mockReturnValue(bloodpressure);
      jest.spyOn(bloodpressureService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ bloodpressure });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: bloodpressure }));
      saveSubject.complete();

      // THEN
      expect(bloodpressureFormService.getBloodpressure).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(bloodpressureService.update).toHaveBeenCalledWith(expect.objectContaining(bloodpressure));
      expect(comp.isSaving).toEqual(false);
    });

    it('Should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IBloodpressure>>();
      const bloodpressure = { id: 123 };
      jest.spyOn(bloodpressureFormService, 'getBloodpressure').mockReturnValue({ id: null });
      jest.spyOn(bloodpressureService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ bloodpressure: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: bloodpressure }));
      saveSubject.complete();

      // THEN
      expect(bloodpressureFormService.getBloodpressure).toHaveBeenCalled();
      expect(bloodpressureService.create).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('Should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IBloodpressure>>();
      const bloodpressure = { id: 123 };
      jest.spyOn(bloodpressureService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ bloodpressure });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(bloodpressureService.update).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).not.toHaveBeenCalled();
    });
  });

  describe('Compare relationships', () => {
    describe('comparePatient', () => {
      it('Should forward to patientService', () => {
        const entity = { id: 123 };
        const entity2 = { id: 456 };
        jest.spyOn(patientService, 'comparePatient');
        comp.comparePatient(entity, entity2);
        expect(patientService.comparePatient).toHaveBeenCalledWith(entity, entity2);
      });
    });
  });
});
