import { Component, Input } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe } from 'src/main/webapp/app/shared/date';
import { IPatient } from '../patient.model';
import { SharedService } from '../../../services/shared.service';
import { Subscription } from 'rxjs';
import generateSummary from '../../bloodpressure/list/gptSummary';
@Component({
  standalone: true,
  selector: 'jhi-patient-detail',
  templateUrl: './patient-detail.component.html',
  imports: [SharedModule, RouterModule, DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe],
})
export class PatientDetailComponent {
  @Input() patient: IPatient | null = null;
  summary: string | null = null;
  geoSummary: string | null = null;
  geosubSummarygeo: string | null = null;
  geosubSummarystep: string | null = null;

  private geoSubSummarySubscription: Subscription | null = null;
  private geoSubStepSummarySubscription: Subscription | null = null;
  private summarySubscription: Subscription | null = null;
  constructor(
    protected activatedRoute: ActivatedRoute,
    private sharedService: SharedService,
  ) {}
  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe(params => {
      const userId = params.get('id');
      if (this.sharedService.getSummary(userId ?? '') !== null) {
        //@ts-ignore
        this.summarySubscription = this.sharedService.getSummary(userId ?? '').subscribe(summary => {
          this.summary = summary;
        });
      }

      this.generateSummary(userId ?? '');
      // this.userService.getUserById(userId).subscribe(user => {
      //   this.patient = user;
      // });
    });
  }

  async generateSummary(userId: string): Promise<void> {
    if (this.sharedService.getGeoSummary(userId ?? '') !== null) {
      //@ts-ignore
      this.geoSubSummarySubscription = this.sharedService.getGeoSummary(userId ?? '').subscribe(geoSummary => {
        this.geosubSummarygeo = geoSummary;
      });
    }

    if (this.sharedService.getActivitySummary(userId ?? '') !== null) {
      //@ts-ignore
      this.geoSubStepSummarySubscription = this.sharedService.getActivitySummary(userId ?? '').subscribe(activitySummary => {
        this.geosubSummarystep = activitySummary;
      });
    }

    const geoSummaryInput = (this.geosubSummarygeo || '') + this.geosubSummarystep;

    console.log(geoSummaryInput);

    if (geoSummaryInput.length > 0) {
      this.geoSummary =
        (await generateSummary(
          geoSummaryInput +
            'summarize 3 main bullet points for this user according to the above information into a paragraph in HTML format. One bullet point is a summary of the current situation. One is the future trend. One is a suggestion for this user. Please use <br> and <li> to format the paragraph. Each bullet point should be no more than 50words.',
        )) || 'Sorry, no summary available';
    }
  }

  // fetchSummary(): void {
  //   // Assuming sharedService provides summary directly
  //   // If it returns an Observable, subscribe and set the summary in the subscription callback
  //   this.summary = this.sharedService.currentSummary??""; // Replace with actual method to fetch summary
  // }
  previousState(): void {
    window.history.back();
  }
}
