import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { PatientDetailComponent } from './patient-detail.component';

describe('Patient Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: PatientDetailComponent,
              resolve: { patient: () => of({ id: 123 }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(PatientDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load patient on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', PatientDetailComponent);

      // THEN
      expect(instance.patient).toEqual(expect.objectContaining({ id: 123 }));
    });
  });
});
