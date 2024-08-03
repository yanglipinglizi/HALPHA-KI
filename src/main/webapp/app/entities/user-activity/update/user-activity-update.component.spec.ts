import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, from } from 'rxjs';

import { IPatient } from 'src/main/webapp/app/entities/patient/patient.model';
import { PatientService } from 'src/main/webapp/app/entities/patient/service/patient.service';
import { UserActivityService } from '../service/user-activity.service';
import { IUserActivity } from '../user-activity.model';
import { UserActivityFormService } from './user-activity-form.service';

import { UserActivityUpdateComponent } from './user-activity-update.component';

describe('UserActivity Management Update Component', () => {
  let comp: UserActivityUpdateComponent;
  let fixture: ComponentFixture<UserActivityUpdateComponent>;
  let activatedRoute: ActivatedRoute;
  let userActivityFormService: UserActivityFormService;
  let userActivityService: UserActivityService;
  let patientService: PatientService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([]), UserActivityUpdateComponent],
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
      .overrideTemplate(UserActivityUpdateComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(UserActivityUpdateComponent);
    activatedRoute = TestBed.inject(ActivatedRoute);
    userActivityFormService = TestBed.inject(UserActivityFormService);
    userActivityService = TestBed.inject(UserActivityService);
    patientService = TestBed.inject(PatientService);

    comp = fixture.componentInstance;
  });

  describe('ngOnInit', () => {
    it('Should call Patient query and add missing value', () => {
      const userActivity: IUserActivity = { id: 456 };
      const patient: IPatient = { id: 7140 };
      userActivity.patient = patient;

      const patientCollection: IPatient[] = [{ id: 31977 }];
      jest.spyOn(patientService, 'query').mockReturnValue(of(new HttpResponse({ body: patientCollection })));
      const additionalPatients = [patient];
      const expectedCollection: IPatient[] = [...additionalPatients, ...patientCollection];
      jest.spyOn(patientService, 'addPatientToCollectionIfMissing').mockReturnValue(expectedCollection);

      activatedRoute.data = of({ userActivity });
      comp.ngOnInit();

      expect(patientService.query).toHaveBeenCalled();
      expect(patientService.addPatientToCollectionIfMissing).toHaveBeenCalledWith(
        patientCollection,
        ...additionalPatients.map(expect.objectContaining),
      );
      expect(comp.patientsSharedCollection).toEqual(expectedCollection);
    });

    it('Should update editForm', () => {
      const userActivity: IUserActivity = { id: 456 };
      const patient: IPatient = { id: 23833 };
      userActivity.patient = patient;

      activatedRoute.data = of({ userActivity });
      comp.ngOnInit();

      expect(comp.patientsSharedCollection).toContain(patient);
      expect(comp.userActivity).toEqual(userActivity);
    });
  });

  describe('save', () => {
    it('Should call update service on save for existing entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IUserActivity>>();
      const userActivity = { id: 123 };
      jest.spyOn(userActivityFormService, 'getUserActivity').mockReturnValue(userActivity);
      jest.spyOn(userActivityService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ userActivity });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: userActivity }));
      saveSubject.complete();

      // THEN
      expect(userActivityFormService.getUserActivity).toHaveBeenCalled();
      expect(comp.previousState).toHaveBeenCalled();
      expect(userActivityService.update).toHaveBeenCalledWith(expect.objectContaining(userActivity));
      expect(comp.isSaving).toEqual(false);
    });

    it('Should call create service on save for new entity', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IUserActivity>>();
      const userActivity = { id: 123 };
      jest.spyOn(userActivityFormService, 'getUserActivity').mockReturnValue({ id: null });
      jest.spyOn(userActivityService, 'create').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ userActivity: null });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.next(new HttpResponse({ body: userActivity }));
      saveSubject.complete();

      // THEN
      expect(userActivityFormService.getUserActivity).toHaveBeenCalled();
      expect(userActivityService.create).toHaveBeenCalled();
      expect(comp.isSaving).toEqual(false);
      expect(comp.previousState).toHaveBeenCalled();
    });

    it('Should set isSaving to false on error', () => {
      // GIVEN
      const saveSubject = new Subject<HttpResponse<IUserActivity>>();
      const userActivity = { id: 123 };
      jest.spyOn(userActivityService, 'update').mockReturnValue(saveSubject);
      jest.spyOn(comp, 'previousState');
      activatedRoute.data = of({ userActivity });
      comp.ngOnInit();

      // WHEN
      comp.save();
      expect(comp.isSaving).toEqual(true);
      saveSubject.error('This is an error!');

      // THEN
      expect(userActivityService.update).toHaveBeenCalled();
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
