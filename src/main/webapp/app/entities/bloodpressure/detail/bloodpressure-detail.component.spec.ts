import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { BloodpressureDetailComponent } from './bloodpressure-detail.component';

describe('Bloodpressure Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BloodpressureDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: BloodpressureDetailComponent,
              resolve: { bloodpressure: () => of({ id: 123 }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(BloodpressureDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load bloodpressure on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', BloodpressureDetailComponent);

      // THEN
      expect(instance.bloodpressure).toEqual(expect.objectContaining({ id: 123 }));
    });
  });
});
