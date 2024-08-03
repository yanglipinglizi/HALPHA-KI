import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness, RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { UserActivityDetailComponent } from './user-activity-detail.component';

describe('UserActivity Management Detail Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserActivityDetailComponent, RouterTestingModule.withRoutes([], { bindToComponentInputs: true })],
      providers: [
        provideRouter(
          [
            {
              path: '**',
              component: UserActivityDetailComponent,
              resolve: { userActivity: () => of({ id: 123 }) },
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    })
      .overrideTemplate(UserActivityDetailComponent, '')
      .compileComponents();
  });

  describe('OnInit', () => {
    it('Should load userActivity on init', async () => {
      const harness = await RouterTestingHarness.create();
      const instance = await harness.navigateByUrl('/', UserActivityDetailComponent);

      // THEN
      expect(instance.userActivity).toEqual(expect.objectContaining({ id: 123 }));
    });
  });
});
