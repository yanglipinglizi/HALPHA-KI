import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { GeoLocationDetailComponent } from './geo-location-detail.component';

describe('GeoLocation Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeoLocationDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: GeoLocationDetailComponent,
              resolve: { geoLocation: () => of({ id: 123 }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(GeoLocationDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load geoLocation on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', GeoLocationDetailComponent);

      // THEN
      expect(instance.geoLocation).toEqual(expect.objectContaining({ id: 123 }));
    });
  });
});
