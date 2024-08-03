import { Component, OnInit, ElementRef, OnDestroy } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Data, ParamMap, Router, RouterModule } from '@angular/router';
import { combineLatest, filter, Observable, switchMap, tap } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import generateSummary from './gptSummary';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { SortDirective, SortByDirective } from 'src/main/webapp/app/shared/sort';
import { DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe } from 'src/main/webapp/app/shared/date';
import { ItemCountComponent } from 'src/main/webapp/app/shared/pagination';
import { FormsModule } from '@angular/forms';

import { ITEMS_PER_PAGE, PAGE_HEADER, TOTAL_COUNT_RESPONSE_HEADER } from 'src/main/webapp/app/config/pagination.constants';
import { ASC, DESC, SORT, ITEM_DELETED_EVENT, DEFAULT_SORT_DATA } from 'src/main/webapp/app/config/navigation.constants';
import { IBloodpressure, IAverageData, IMappedBP, Accumulator } from '../bloodpressure.model';
import { EntityArrayResponseType, BloodpressureService } from '../service/bloodpressure.service';
import { BloodpressureDeleteDialogComponent } from '../delete/bloodpressure-delete-dialog.component';
import { IPatient } from '../../patient/patient.model';

import * as d3 from 'd3';
import { HttpClient } from '@angular/common/http';
import * as Plot from '@observablehq/plot';
// @ts-ignore
import * as Inputs from '@observablehq/inputs';
import * as htl from 'src/main/webapp/htl';
import { SharedService } from '../../../services/shared.service';

@Component({
  standalone: true,
  selector: 'jhi-bloodpressure',
  templateUrl: './bloodpressure.component.html',
  imports: [
    RouterModule,
    FormsModule,
    SharedModule,
    SortDirective,
    SortByDirective,
    DurationPipe,
    FormatMediumDatetimePipe,
    FormatMediumDatePipe,
    ItemCountComponent,
  ],
})
export class BloodpressureComponent implements OnInit {
  userId: string | null = null;
  id: number | null = null;
  userName: string = '';

  // data
  bloodpressures?: IBloodpressure[];
  averageData?: IAverageData[];

  // parameters related to insights of each graphs
  bp_pulse: string | null = null;
  pulse_pressure: string | null = null;

  systolic_frequency: string | null = null;
  diastolic_frequency: string | null = null;
  pulse_frequency: string | null = null;

  target_scatter: string | null = null;

  bp_pulse_over_year: string | null = null;
  subtable_insights: string | null = null;

  systolic_box: string | null = null;
  diastolic_box: string | null = null;
  pulse_box: string | null = null;

  isLoading = false;

  predicate = 'id';
  ascending = true;

  itemsPerPage = ITEMS_PER_PAGE;
  totalItems = 0;
  page = 1;

  // parameters related to button/ selectors...
  systolicTargetsDrawn = false;
  diastolicTargetsDrawn = false;
  pulseTargetsDrawn = false;
  nameSelect = false;
  selectedDays: number = 90;
  category: number = 3;
  overallSummary = '';
  scale = 1;

  constructor(
    protected bloodpressureService: BloodpressureService,
    protected activatedRoute: ActivatedRoute,
    public router: Router,
    protected modalService: NgbModal,
    private http: HttpClient,
    private route: ActivatedRoute,
    private elRef: ElementRef,
    private sharedService: SharedService,
  ) {}

  trackId = (_index: number, item: IBloodpressure): number => this.bloodpressureService.getBloodpressureIdentifier(item);

  async ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      this.userId = params.get('userId');
      if (this.userId) {
        await this.generateGraphs(this.userId);
      }
    });
  }
  /**
   * Fetches and processes the blood pressure data for a given user.
   * This method retrieves patient blood pressure and pulse data, generates data visualizations(graphs with insights),
   * and offers a health summary based on the generated rule-based insights.
   * @param userId - The ID of the user for whom to generate graphs.
   */
  async generateGraphs(userId: string) {
    this.http.get<IPatient[]>('/api/patients/userid/' + this.userId).subscribe((data: IPatient[]) => {
      // Process patient data
      this.id = data[0].id;
      this.userName = data[0].nickname ? data[0].nickname + ' ' : '';
      this.nameSelect = true;
      if (data && data.length > 0 && data[0].birthday) {
        const birthDate = new Date(data[0].birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDifference = today.getMonth() - birthDate.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        const medical_condition = data[0].medical_preconditions;
        const predefinedConditions = [
          'diagnosed hypertension', // English for diagnostizierter Bluthochdruck
          'heart failure', // English for Herzinsuffizienz
          'coronary artery disease',
          'chronic kidney disease',
          'heart disease', // selected item
          'blood pressure related disease', // selected item
        ];
        let hasPrecondition = predefinedConditions.some(condition => medical_condition?.includes(condition));
        // Determine the category of the patient based on age and medical condition
        if (age < 65 && hasPrecondition) {
          this.category = 1; // <65 with pre-existing conditions
        } else if (age >= 65 && hasPrecondition) {
          this.category = 2; // >65 with pre-existing conditions
        } else {
          this.category = 3; // others (default one)
        }
      }
    });

    this.http.get<IBloodpressure[]>('/api/bloodpressures/userId/' + userId).subscribe(
      async (data: IBloodpressure[]) => {
        // Pre-process and generate graphs and insights
        this.bloodpressures = data;
        this.averageData = this.getAverageData(this.mapRecord(this.bloodpressures));
        this.systolic_frequency = this.systolic_frequency_insights(this.averageData);
        this.diastolic_frequency = this.diastolic_frequency_insights(this.averageData);
        this.pulse_frequency = this.pulse_frequency_insights(this.averageData);
        this.target_scatter = this.getCategory_TargetPercentage_insights(this.category, this.mapRecord(this.bloodpressures));

        this.load();
        this.createSvgThreeIndicators();
        this.drawLinesThreeIndicators(90);
        this.createSvgPulsePressure();
        this.drawLinesPulsePressure(90);

        this.drawScatterPlot();
        this.drawTable();
        this.drawSubTable();
        this.drawSystolicFrequencyInLastThreeMonths();
        this.drawDiastolicFrequencyInLastThreeMonths();
        this.drawPulseFrequencyInLastThreeMonths();

        this.createSvgPulseBoxplot();
        this.drawPulseBoxplot();
        this.createSvgSystolicBoxplot();
        this.drawSystolicBoxplot();
        this.createSvgDiastolicBoxplot();
        this.drawDiastolicBoxplot();

        // Generate an HTML-formatted summary for doctor's review based on the pre-created insights
        this.overallSummary =
          (this.bp_pulse ?? '') +
          (this.pulse_pressure ?? '') +
          (this.systolic_frequency ?? '') +
          (this.diastolic_frequency ?? '') +
          (this.pulse_frequency ?? '') +
          (this.target_scatter ?? '') +
          (this.bp_pulse_over_year ?? '') +
          (this.systolic_box ?? '') +
          (this.diastolic_box ?? '') +
          (this.pulse_box ?? '');

        const summary =
          (await generateSummary(
            '"' +
              this.overallSummary +
              '" Please create an HTML-formatted summary suitable for a doctor to review, focusing on three key areas based on the provided data on blood pressure and pulse. Structure the summary with individual subtitles for each section, ensuring subtitles are in a slightly larger font size than the regular text. Avoid using an overall title. Adhere to the following simplified guidelines:\n' +
              '\n' +
              '<p><b>Summary of Current Health Condition:</b><br/>Provide a concise summary of the patient’s current health condition, including key statistics for systolic and diastolic blood pressure, and pulse. Mention any significant deviations from normal ranges.</p>\n' +
              '<br/>\n' +
              '<p><b>Prediction of Future Health Trends:</b><br/>Offer a brief prediction of future health trends based on the data trends observed over the past months. Highlight potential concerns or areas of stability.</p>\n' +
              '<br/>\n' +
              '<p><b>Recommendations for Attention and Monitoring:</b><br/Suggest concise recommendations for lifestyle adjustments, further testing, or monitoring protocols to improve or manage the patient’s condition.</p>\n' +
              '\n' +
              'Ensure each section is limited to one paragraph of at least 40 words and no more than 100 words. Use <br/> for separation and clarity.\n',
          )) || 'Sorry, no summary available';

        //@ts-ignore
        document.getElementById('summaryContainer').innerHTML = summary ? summary : '<strong>Summary</strong><br/>';
        this.http.get<IPatient[]>('/api/patients/userid/' + this.userId).subscribe((data: IPatient[]) => {
          //get id in number
          this.sharedService.updateSummary(data[0].id.toString(), summary ?? '');
        });
      },
      error => {
        console.error('Error fetching user activities:', error);
        this.bloodpressures = [];
      },
    );
  }

  /**
   * Generates a summary of insights based on provided text instruction.
   * This method attempts to generate a concise summary from the given insights.
   * @param insights - Text instruction for summary generation including the collected insights to be summarized
   * @returns A promise that resolves to the generated summary, or null in case of an error.
   */
  async generateSummary(insights: string) {
    try {
      const result = await generateSummary(insights);
      return result;
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    }
  }

  delete(bloodpressure: IBloodpressure): void {
    const modalRef = this.modalService.open(BloodpressureDeleteDialogComponent, { size: 'lg', backdrop: 'static' });
    modalRef.componentInstance.bloodpressure = bloodpressure;
    // unsubscribe not needed because closed completes on modal close
    modalRef.closed
      .pipe(
        filter(reason => reason === ITEM_DELETED_EVENT),
        switchMap(() => this.loadFromBackendWithRouteInformations()),
      )
      .subscribe({
        next: (res: EntityArrayResponseType) => {
          this.onResponseSuccess(res);
        },
      });
  }

  load(): void {
    this.loadFromBackendWithRouteInformations().subscribe({
      next: (res: EntityArrayResponseType) => {
        this.onResponseSuccess(res);
      },
    });
  }

  navigateToWithComponentValues(): void {
    this.handleNavigation(this.page, this.predicate, this.ascending);
  }

  navigateToPage(page = this.page): void {
    this.handleNavigation(page, this.predicate, this.ascending);
  }

  protected loadFromBackendWithRouteInformations(): Observable<EntityArrayResponseType> {
    return combineLatest([this.activatedRoute.queryParamMap, this.activatedRoute.data]).pipe(
      tap(([params, data]) => this.fillComponentAttributeFromRoute(params, data)),
      switchMap(() => this.queryBackend(this.page, this.predicate, this.ascending)),
    );
  }

  protected fillComponentAttributeFromRoute(params: ParamMap, data: Data): void {
    const page = params.get(PAGE_HEADER);
    this.page = +(page ?? 1);
    const sort = (params.get(SORT) ?? data[DEFAULT_SORT_DATA]).split(',');
    this.predicate = sort[0];
    this.ascending = sort[1] === ASC;
  }

  protected onResponseSuccess(response: EntityArrayResponseType): void {
    this.fillComponentAttributesFromResponseHeader(response.headers);
    const dataFromBody = this.fillComponentAttributesFromResponseBody(response.body);
    this.bloodpressures = dataFromBody;
  }

  protected fillComponentAttributesFromResponseBody(data: IBloodpressure[] | null): IBloodpressure[] {
    return data ?? [];
  }

  protected fillComponentAttributesFromResponseHeader(headers: HttpHeaders): void {
    this.totalItems = Number(headers.get(TOTAL_COUNT_RESPONSE_HEADER));
  }

  protected queryBackend(page?: number, predicate?: string, ascending?: boolean): Observable<EntityArrayResponseType> {
    this.isLoading = true;
    const pageToLoad: number = page ?? 1;
    const queryObject: any = {
      page: pageToLoad - 1,
      size: this.itemsPerPage,
      sort: this.getSortQueryParam(predicate, ascending),
    };
    return this.bloodpressureService.query(queryObject).pipe(tap(() => (this.isLoading = false)));
  }

  protected handleNavigation(page = this.page, predicate?: string, ascending?: boolean): void {
    const queryParamsObj = {
      page,
      size: this.itemsPerPage,
      sort: this.getSortQueryParam(predicate, ascending),
    };

    this.router.navigate(['./'], {
      relativeTo: this.activatedRoute,
      queryParams: queryParamsObj,
    });
  }

  protected getSortQueryParam(predicate = this.predicate, ascending = this.ascending): string[] {
    const ascendingQueryParam = ascending ? ASC : DESC;
    if (predicate === '') {
      return [];
    } else {
      return [predicate + ',' + ascendingQueryParam];
    }
  }

  previousState(): void {
    window.history.back();
  }

  /**
   * Scrolls the page smoothly to the HTML element identified by the given ID(used in navigation bar).
   * @param elementId - The ID of the element to scroll to.
   * Uses the native `scrollIntoView` method for smooth scrolling.
   */
  scrollTo(elementId: string): void {
    const element = this.elRef.nativeElement.querySelector(`#${elementId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }
  }

  /**
   * Scrolls the window back to the top of the page.
   * This method provides a quick way to return to the top of the page, enhancing user navigation.
   */
  scrollToTop() {
    window.scrollTo(0, 0);
  }

  /**
   * Increases the zoom level of a specific element, in our case of a table, by scaling it up by 10%.
   * It calls `applyTransform` to apply the CSS transformation.
   */
  protected zoomIn() {
    this.scale += 0.1; // 10% amplification at a time
    this.applyTransform();
  }

  /**
   * Decreases the zoom level of a specific element by scaling it down by 10%, with a minimum scale of 1.
   * It ensures the element does not become too small to be unreadable or invisible.
   */
  protected zoomOut() {
    this.scale = Math.max(1, this.scale - 0.1); // Shrink by 10% at a time, but not less than 1
    this.applyTransform();
  }

  /**
   * Applies a CSS transform to scale an element. In our case it is used to scale a table.
   * This method dynamically adjusts the `transform`, `transformOrigin`, and `transition` properties to animate the scaling effect.
   */
  protected applyTransform() {
    const tableContainer = document.querySelector('figure#table');
    if (tableContainer instanceof HTMLElement) {
      tableContainer.style.transform = `scale(${this.scale})`;
      tableContainer.style.transformOrigin = 'top left';
      tableContainer.style.transition = 'transform 0.3s';
    }
  }

  // -----------------------pre-processing data-----------------------
  /**
   * Maps the blood pressure record data to include year information.
   * @param record - Array of blood pressure record objects or undefined if there is no record
   * @returns An array of mapped blood pressure data objects with year information
   */
  protected mapDatawithYear(record: IBloodpressure[] | undefined) {
    if (!record) {
      return [];
    }
    const dataWithYear = record.map(d => {
      if (!d.recorded_at || !d.diastolic || !d.pulse || !d.systolic || !d.userId) {
        console.error('Missing filed:', d);
        return null;
      }
      const dateParts = d.recorded_at.split(' ')[0].split('-'); // Split the date into parts
      const month = parseInt(dateParts[1], 10); // Parse the month to integer to remove leading zero
      const year = parseInt(dateParts[0], 10);
      const timeParts = d.recorded_at?.split(' ')[1].split(':'); // Split the time into parts
      const hours = parseInt(timeParts[0], 10);
      let Zeitslot;
      // Determine if it's morning or evening
      if (hours >= 5 && hours < 12) {
        Zeitslot = 'Morgens';
      } else if (hours >= 17 && hours < 21) {
        Zeitslot = 'Abends';
      } else {
        // Handle cases outside of defined 'morgens' and 'abends' hours
        Zeitslot = 'other';
      }
      return {
        Datum: d.recorded_at,
        Zeitslot: Zeitslot,
        Systolisch: d.systolic,
        Diastolisch: d.diastolic,
        Puls: d.pulse,
        date: parseInt(dateParts[2], 10) + '/' + month,
        year: year,
        month: month,
        user_id: d.userId,
      };
    });
    return dataWithYear;
  }

  /**
   * Maps the blood pressure record data to a specific format (IMappedBP).
   * @param record - Array of blood pressure record objects or undefined if there is no record
   * @returns An array of mapped blood pressure data objects (IMappedBP)
   */
  protected mapRecord(record: IBloodpressure[] | undefined): IMappedBP[] {
    if (!record) {
      return [];
    }
    const mapped_data = record
      .map(d => {
        if (!d.recorded_at || !d.diastolic || !d.pulse || !d.systolic || !d.userId) {
          console.error('Missing filed:', d);
          return null;
        }
        const dateParts = d.recorded_at.split(' ')[0].split('-'); // Split the date into parts
        const month = parseInt(dateParts[1], 10); // Parse the month to integer to remove leading zero
        const timeParts = d.recorded_at?.split(' ')[1].split(':'); // Split the time into parts
        const hours = parseInt(timeParts[0], 10);
        let Zeitslot;
        // Determine if it's morning or evening
        if (hours >= 5 && hours < 12) {
          Zeitslot = 'Morgens';
        } else if (hours >= 17 && hours < 21) {
          Zeitslot = 'Abends';
        } else {
          // Handle cases outside of defined 'morgens' and 'abends' hours
          Zeitslot = 'other';
        }
        return {
          Datum: d.recorded_at,
          Zeitslot: Zeitslot,
          Systolisch: d.systolic,
          Diastolisch: d.diastolic,
          Puls: d.pulse,
          date: parseInt(dateParts[2], 10) + '/' + month,
          month: month,
          user_id: d.userId,
        };
      })
      .filter(Boolean) as IMappedBP[];
    return mapped_data;
  }

  /**
   * Calculates the average blood pressure and pulse data per time box (morning or evening).
   * @param mapped_data - Array of mapped blood pressure data objects
   * @param timeBox - Time box string ('Morgens' or 'Abends') indicating the time of the day
   * @returns An array of average blood pressure and pulse data objects per time box.
   ** Take only one value per time box (morning / evening), use average value for measurements in the same time box.
   */
  protected getAveragePerTimeBox(mapped_data: IMappedBP[], timeBox: string): IAverageData[] {
    const filteredData = mapped_data
      .filter(({ Zeitslot }) => Zeitslot === timeBox)
      .reduce((acc: Accumulator, { Datum, Systolisch, Diastolisch, Puls, month }) => {
        const date = Datum.split(' ')[0];
        if (!acc[date]) {
          acc[date] = { count: 0, totalSystolic: 0, totalDiastolic: 0, totalPulse: 0, year: date.substring(0, 4), month: month };
        }
        acc[date].count++;
        acc[date].totalSystolic += Systolisch;
        acc[date].totalDiastolic += Diastolisch;
        acc[date].totalPulse += Puls;
        return acc;
      }, {});

    return Object.keys(filteredData).map(date => ({
      date,
      year: filteredData[date].year,
      month: filteredData[date].month,
      timeBox: timeBox === 'Morgens' ? 'morning' : 'evening',
      avgSystolicBP: filteredData[date].totalSystolic / filteredData[date].count,
      avgDiastolicBP: filteredData[date].totalDiastolic / filteredData[date].count,
      avgPulse: filteredData[date].totalPulse / filteredData[date].count,
    }));
  }

  /**
   * Calculates the average blood pressure and pulse data per time box (morning or evening) for a box plot visualization.
   * @param bloodpressure - Array of blood pressure data objects
   * @param timeBox - Time box string ('Morgens' or 'Abends') indicating the time of the day
   * @returns An array of average blood pressure and pulse data objects per time box suitable for a box plot visualization.
   */
  protected getAveragePerTimeBox_boxplot(bloodpressure: IBloodpressure[], timeBox: string) {
    let mapped_data = this.mapDatawithYear(bloodpressure);

    const filteredData = mapped_data
      // @ts-ignore
      .filter(({ Zeitslot }) => Zeitslot === timeBox)
      // @ts-ignore
      .reduce((acc: Accumulator, { Datum, Systolisch, Diastolisch, Puls, month }) => {
        const date = Datum.split(' ')[0];
        if (!acc[date]) {
          acc[date] = { count: 0, totalSystolic: 0, totalDiastolic: 0, totalPulse: 0, year: date.substring(0, 4), month: month };
        }
        acc[date].count++;
        acc[date].totalSystolic += Systolisch;
        acc[date].totalDiastolic += Diastolisch;
        acc[date].totalPulse += Puls;
        return acc;
      }, {});

    return Object.keys(filteredData).map(date => ({
      Datum: '',
      year: filteredData[date].year,
      month: filteredData[date].month,
      Zeitslot: timeBox,
      Systolisch: filteredData[date].totalSystolic / filteredData[date].count,
      Diastolisch: filteredData[date].totalDiastolic / filteredData[date].count,
      Puls: filteredData[date].totalPulse / filteredData[date].count,
      date: '',
    }));
  }

  /**
   * Calculates the average data from the mapped blood pressure data.
   * @param mapped_data - Array of mapped blood pressure data objects
   * @returns An array of average data objects containing the calculated averages per time box (morning and evening), combined and sorted by date.
   */
  protected getAverageData(mapped_data: IMappedBP[]): IAverageData[] {
    const morningAverages = this.getAveragePerTimeBox(mapped_data, 'Morgens');
    const eveningAverages = this.getAveragePerTimeBox(mapped_data, 'Abends');
    // Combine the average data pre time box
    let combinedAverages = morningAverages.concat(eveningAverages);
    // Sort combined averages by date
    combinedAverages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return combinedAverages;
  }

  /**
   * Filters and returns a subset of average data within a specified time frame.
   *
   * This method takes an array of data objects (averageData) and a duration (in days),
   * and filters the array to include only those data objects whose dates fall within
   * the range from (today - duration) to today. It is designed to help identify recent
   * trends or averages by focusing on the most current data within the specified time frame.
   *
   * @param {IAverageData[]} averageData - An array of objects containing the data to be filtered.
   * Each object in this array must have a 'date' property that can be parsed into a Date object.
   * @param {number} duration - The number of days before today to start filtering the data from.
   * This determines the time frame over which data is considered recent.
   *
   * @returns {IAverageData[]} A filtered array of data objects that fall within the specified
   * time frame, from (today - duration) days ago to today. This allows for analysis of recent
   * data trends based on the input duration.
   */
  protected getRecentData(averageData: IAverageData[], duration: number) {
    const today = new Date();
    const durationAgo = new Date(today);
    durationAgo.setDate(today.getDate() - duration);
    return averageData.filter(data => {
      const dataDate = new Date(data.date);
      return dataDate >= durationAgo && dataDate <= today;
    });
  }

  /**
   * Filters average data based on the number of months from the current date.
   * @param averageData - Array of average data objects
   * @param amount - Number of months from the current date to include in the filtered result
   * @returns An array containing average data objects filtered based on the specified number of months from the current date.
   */
  protected filterByMonths(averageData: IAverageData[], amount: number) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    return averageData.filter(d => {
      const date = new Date(d.date);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthDifference = (currentYear - year) * 12 + (currentMonth - month);
      return monthDifference >= 0 && monthDifference < amount;
    });
  }

  /**
   * Calculates and returns statistical summaries (min, Q1, mean, Q3, max) for monthly data, excluding outliers. (used for box plot)
   *
   * This method groups the input data by month, calculates statistical summaries for each month,
   * and then filters out outliers based on the Interquartile Range (IQR) method. Outliers are defined
   * as values that fall below Q1 - 1.5 * IQR or above Q3 + 1.5 * IQR. The method focuses on a specific
   * indicator within the data, calculates the relevant statistics for that indicator across each month,
   * and sorts the results chronologically. The last 12 months of data are then returned, providing a
   * snapshot of the most recent yearly statistics.
   *
   * @param {IAverageData[]} mappedData - An array of objects containing the data to be analyzed.
   * Each object must include 'year', 'month', and the specified 'indicator' properties.
   * @param {string} indicator - The key of the data object which the statistical analysis will be
   * performed on. This allows for flexibility in choosing which metric to analyze.
   *
   * @returns {Object[]} An array of objects representing the monthly statistical summaries for the
   * last 12 months in the stored data, sorted by month. Each object includes the month, minimum, first quartile (Q1),
   * mean, third quartile (Q3), and maximum values for the specified indicator, excluding outliers.
   */
  protected getMonthlySumstat(mappedData: IAverageData[], indicator: string) {
    // @ts-ignore
    let groupedData = d3.group(mappedData, d => `${d.year}-${String(d.month).padStart(2, '0')}`);
    // extract Zeitslot and Puls from each subgroup
    let monthlyData = new Map();
    groupedData.forEach((values, month) => {
      // @ts-ignore
      monthlyData.set(
        month,
        //@ts-ignore
        values.map(d => ({ Zeitslot: d.Zeitslot, Indicator: d[indicator] })),
      );
    });

    const statistics = Array.from(monthlyData).map(([month, values]) => {
      // extract systolisch
      // @ts-ignore
      const systolischValues = values.map(d => d.Indicator);
      // asending the systolisch in every month
      systolischValues.sort(d3.ascending);

      // calculate quantile and IQR
      const Q1 = d3.quantile(systolischValues, 0.25);
      const Q3 = d3.quantile(systolischValues, 0.75);
      const IQR = (Q3 ?? 0) - (Q1 ?? 0);

      //calculate boundary value
      const lowerBound = (Q1 ?? 0) - 1.5 * IQR;
      const upperBound = (Q3 ?? 0) + 1.5 * IQR;

      // filter outliers

      // @ts-ignore
      const nonOutliers = systolischValues.filter(d => d >= lowerBound && d <= upperBound);

      // calculate the min and max excluding outliers
      const min = d3.min(nonOutliers);
      const max = d3.max(nonOutliers);
      const mean = d3.mean(systolischValues);
      return {
        month,
        min,
        Q1,
        mean,
        Q3,
        max,
      };
    });
    statistics.sort((a, b) => a.month.localeCompare(b.month));
    return statistics.slice(-12);
  }

  /**
   * Retrieves monthly grouped data from mapped data and extracts specific data based on the indicator.
   * @param mappedData - Array of mapped data
   * @param indicator - Indicator string
   * @returns Map object of the last 12 months' data grouped by month
   */
  protected getMonthlyData(mappedData: IAverageData[], indicator: string) {
    let groupedData = d3.group(mappedData, d => `${d.year}-${String(d.month).padStart(2, '0')}`);

    // sort according to key
    const sortedMonths = Array.from(groupedData.keys()).sort();

    let monthlyData = new Map();
    sortedMonths.forEach(month => {
      const values = groupedData.get(month);
      monthlyData.set(
        month,
        //@ts-ignore
        values.map(d => ({ Zeitslot: d.Zeitslot, Indicator: d[indicator] })),
      );
    });
    const last12MonthsData = Array.from(monthlyData).slice(-12);
    return new Map(last12MonthsData);
  }
  /**
   * Groups the average data by month.
   * @param averageData - Array of average data objects
   * @returns A Map object where keys represent year and month combinations, and values are arrays of average data objects for each combination.
   */
  protected groupByMonth(averageData: IAverageData[]): Map<string, IAverageData[]> {
    return d3.group(averageData, d => `${d.year}-${d.month}`);
  }
  /**
   * Retrieves a subset of grouped data centered around the target month.
   * @param grouped - Array of grouped data objects
   * @param targetMonth - Target month in the format 'YYYY-MM'
   * @returns An array containing a subset of grouped data objects, with the target month at the center and three months before and after it.
   */
  protected getSelectedMonths(grouped: any, targetMonth: string) {
    //@ts-ignore
    const targetIndex = grouped.findIndex(item => item['year-month'] === targetMonth);
    if (targetIndex !== -1) {
      const startIndex = Math.max(0, targetIndex - 3);
      const endIndex = Math.min(grouped.length - 1, targetIndex + 3);
      return grouped.slice(startIndex, endIndex + 1);
    }
    return [];
  }

  //----------------------- Function for target range -----------------------
  protected getBPTarget(category: number): number[][] {
    const systolicTarget: Record<number, number[]> = {
      1: [119, 131], // <65 with pre-existing conditions
      2: [128, 141], // >65 with pre-existing conditions
      3: [120, 135], // others
    };

    const diastolicTarget: Record<number, number[]> = {
      1: [70, 79], // <65 with pre-existing conditions
      2: [70, 79], // >65 with pre-existing conditions
      3: [71, 84], // others
    };

    return [systolicTarget[category], diastolicTarget[category]];
  }

  protected targetAboveOrBelow(filteredData: IAverageData[], indicator: keyof IAverageData, target: number[]): number[] {
    // indicator: "avgSystolicBP","avgDiastolicBP", "avgPulse"
    // target: array (BP: getBPTarget(category), Pulse:[50,100])
    const countAbove = filteredData.filter(d => (d[indicator] as number) > target[1]).length;
    const countBelow = filteredData.filter(d => (d[indicator] as number) < target[0]).length;
    //return the percentage below target and above target in the format of array [below,above]
    return [countBelow / filteredData.length, countAbove / filteredData.length];
  }

  // hilfer function for coefficient of variation
  protected averageForVariance(filteredData: IAverageData[], indicator: keyof IAverageData): number {
    if (!filteredData || filteredData.length === 0 || !filteredData[0][indicator]) {
      return 0; // validate the imported data
    }
    // use reduce to calculate the total of the specific indicator
    const total = filteredData.reduce((sum, item) => {
      const value = item[indicator];
      return typeof value === 'number' ? sum + value : sum;
    }, 0);
    //calculate average
    const average = total / filteredData.length;
    return average;
  }

  protected coefficientOfVariation(filteredData: IAverageData[], indicator: keyof IAverageData): number {
    const average = this.averageForVariance(filteredData, indicator);
    const standardDeviation = Math.sqrt(
      filteredData.reduce((acc, val) => acc + ((val[indicator] as number) - average) ** 2, 0) / filteredData.length,
    );
    return standardDeviation / average;
  }
  //----------------------- Function for generating table (BP & Pulse visualization over year) ---------------------
  protected getMonthName(monthNumber: number): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return months[monthNumber - 1];
  }

  protected monthlyAnalysis(averageData: IAverageData[]) {
    const groupedData = this.groupByMonth(averageData);
    let monthlyAnalysis = new Map();
    groupedData.forEach((values, month) => {
      // For avgSystolicBP
      const systolicBPBelowAbove = this.targetAboveOrBelow(values, 'avgSystolicBP', this.getBPTarget(this.category)[0]);
      const systolicAverage = this.averageForVariance(values, 'avgSystolicBP');
      const systolicCoefficientOfVariance = this.coefficientOfVariation(values, 'avgSystolicBP');
      // For avgDiastolicBP
      const diastolicBPBelowAbove = this.targetAboveOrBelow(values, 'avgDiastolicBP', this.getBPTarget(this.category)[1]);
      const diastolicAverage = this.averageForVariance(values, 'avgDiastolicBP');
      const diastolicCoefficientOfVariance = this.coefficientOfVariation(values, 'avgDiastolicBP');
      // For avgPulse
      const pulseBelowAbove = this.targetAboveOrBelow(values, 'avgPulse', [50, 100]);
      const pulseAverage = this.averageForVariance(values, 'avgPulse');
      const pulseCoefficientOfVariance = this.coefficientOfVariation(values, 'avgPulse');
      monthlyAnalysis.set(month, {
        SystolicBP: [systolicBPBelowAbove, systolicAverage, systolicCoefficientOfVariance],
        DiastolicBP: [diastolicBPBelowAbove, diastolicAverage, diastolicCoefficientOfVariance],
        Pulse: [pulseBelowAbove, pulseAverage, pulseCoefficientOfVariance],
      });
    });
    // transfer map to array
    const grouped = Array.from(monthlyAnalysis, ([month, indicators]) => ({
      year: month.substring(0, 4),
      month: this.getMonthName(month.substring(5, 7)),
      SystolicBP: {
        target: { belowTarget: indicators.SystolicBP[0][0], aboveTarget: indicators.SystolicBP[0][1] },
        average: indicators.SystolicBP[1],
        coefficientOfVariance: indicators.SystolicBP[2],
      },
      DiastolicBP: {
        target: { belowTarget: indicators.DiastolicBP[0][0], aboveTarget: indicators.DiastolicBP[0][1] },
        average: indicators.DiastolicBP[1],
        coefficientOfVariance: indicators.DiastolicBP[2],
      },
      Pulse: {
        target: { belowTarget: indicators.Pulse[0][0], aboveTarget: indicators.Pulse[0][1] },
        average: indicators.Pulse[1],
        coefficientOfVariance: indicators.Pulse[2],
      },
    }));
    return grouped;
  }

  protected getTargetMaxValue(groupedData: any, indicator: any) {
    let max = 0;
    groupedData.forEach((item: any) => {
      const values = item[indicator]['target'];
      const localMax = Math.max(values['belowTarget'], values['aboveTarget']);
      if (localMax > max) {
        max = localMax;
      }
    });
    return max;
  }

  protected getMinMaxAverage(groupedData: any, indicator: any) {
    let max = 0;
    let min = groupedData[0][indicator]['average'];
    groupedData.forEach((item: any) => {
      const value = item[indicator]['average'];
      if (value > max) {
        max = value;
      }
      if (value < min) {
        min = value;
      }
    });
    return [min, max];
  }

  // @ts-ignore
  protected target_average_vk(target, average, coefficientOfVariance, targetMax, averageMinMax, bottomTargetValue, upperTargetValue) {
    const width = 800;
    const height = 100;
    const marginTop = 5;
    const marginRight = 5;
    const marginBottom = 5;
    const marginLeft = 5;

    const svg = d3
      .create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('overflow', 'visible')
      .attr('viewBox', [0, 0, width + marginRight + marginLeft, height + marginTop + marginBottom])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // Define scales
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(targetMax, 0.1)])
      .range([(width - marginRight - marginLeft) / 2, 0]);

    const yScale = d3
      .scaleBand()
      .domain(Object.keys(target))
      .range([height - marginBottom, marginTop])
      .padding(0);

    // Create bars
    svg
      .selectAll('.bar')
      .data(Object.entries(target))
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: any) => xScale(d[1]) + marginLeft / 2) // value
      // @ts-ignore
      .attr('y', d => yScale(d[0]))
      // @ts-ignore
      .attr('width', d => (width - marginRight - marginLeft) / 2 - xScale(d[1]))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => (d[0] === 'belowTarget' ? '#85C1E9' : '#EC7063'));

    // Add text labels
    svg
      .selectAll('.label')
      .data(Object.entries(target))
      .enter()
      .append('text')
      .attr('class', 'label')
      // @ts-ignore
      .attr('x', d => xScale(d[1]) + (width / 2 - marginRight / 2 + marginLeft - xScale(d[1])) / 2) // Center horizontally ->这个位置还要调整
      // @ts-ignore
      .attr('y', d => yScale(d[0]) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      // @ts-ignore
      .text(d => `${(d[1] * 100).toFixed(0)}%`)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-size', '20px');

    // Add the y-axis to the right side
    svg
      .append('g')
      .attr('transform', `translate(${width / 2 - marginRight / 2},${0})`)
      // @ts-ignore
      .call(d3.axisRight(yScale).tickSize(0).tickFormat('')) // hidden ticks and text
      .selectAll('text')
      .style('visibility', 'hidden');

    /* ------------------right part-----------------------*/
    const yScale_right = d3
      .scaleBand()
      .range([0, height - marginTop - marginBottom])
      .domain(['average']) // only one bar
      .padding(0.1);

    const xScale_right = d3
      .scaleLinear()
      .range([0, (width - marginLeft - marginRight) / 2])
      .domain([Math.min(averageMinMax[0] - 10, bottomTargetValue), Math.max(averageMinMax[1], upperTargetValue)]); // may use the max average later

    // add bar
    svg
      .append('rect')
      .attr('class', 'bar')
      // @ts-ignore
      .attr('y', d => (yScale('belowTarget') + yScale('aboveTarget')) / 2)
      .attr('x', (width - marginRight) / 2)
      .attr('height', yScale.bandwidth())
      .attr('width', d => xScale_right(average))
      .style('fill', '#6b486b');

    svg
      .append('text')
      .attr('class', 'label-coefficient')
      // @ts-ignore
      .attr('y', d => (yScale('belowTarget') + yScale('aboveTarget')) / 2 + yScale.bandwidth() / 2)
      .attr('x', d => (width - marginRight) / 2 + xScale_right(average) + marginLeft + 5)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text((coefficientOfVariance * 100).toFixed(0) + '%');

    svg
      .append('text')
      .attr('class', 'label')
      // @ts-ignore
      .attr('y', d => (yScale('belowTarget') + yScale('aboveTarget')) / 2 + yScale.bandwidth() / 2)
      .attr('x', d => (width - marginRight) / 2 + xScale_right(average) / 2 + marginLeft)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .style('font-size', '20px')
      .text(average.toFixed(0));

    svg
      .append('g')
      .attr('transform', 'translate(' + (width - marginRight) / 2 + ',0)')
      // @ts-ignore
      .call(d3.axisLeft(yScale_right).tickSize(0).tickFormat('')) // hidden ticks and text
      .selectAll('text')
      .style('visibility', 'hidden');

    // Add target line
    svg
      .append('line')
      .attr('class', 'target-line')
      .attr('x1', (width - marginRight) / 2 + xScale_right(bottomTargetValue))
      .attr('x2', (width - marginRight) / 2 + xScale_right(bottomTargetValue))
      .attr('y1', marginTop - 20)
      .attr('y2', height - marginBottom + 10)
      .attr('stroke', 'red')
      .attr('stroke-width', '2')
      .attr('stroke-dasharray', '4');

    svg
      .append('line')
      .attr('class', 'target-line')
      .attr('x1', (width - marginRight) / 2 + xScale_right(upperTargetValue))
      .attr('x2', (width - marginRight) / 2 + xScale_right(upperTargetValue))
      .attr('y1', marginTop - 20)
      .attr('y2', height - marginBottom + 10)
      .attr('stroke', 'red')
      .attr('stroke-width', '2')
      .attr('stroke-dasharray', '4');

    if (!this.systolicTargetsDrawn) {
      // Add target label
      svg
        .append('text')
        .attr('class', 'label-target')
        .attr('x', (width - marginRight) / 2 + xScale_right(bottomTargetValue) + 3) // Offset the label slightly to the right of the line
        .attr('y', marginTop - 5) // Position the label above the line
        .style('fill', 'red')
        .style('font-size', '22px')
        .text(bottomTargetValue);

      svg
        .append('text')
        .attr('class', 'label-target')
        .attr('x', (width - marginRight) / 2 + xScale_right(upperTargetValue) + 3) // Offset the label slightly to the right of the line
        .attr('y', marginTop - 5) // Position the label above the line
        .style('fill', 'red')
        .style('font-size', '22px')
        .text(upperTargetValue);
      this.systolicTargetsDrawn = true;
    } else if (!this.diastolicTargetsDrawn) {
      // Add target label
      svg
        .append('text')
        .attr('class', 'label-target')
        .attr('x', (width - marginRight) / 2 + xScale_right(bottomTargetValue) + 3) // Offset the label slightly to the right of the line
        .attr('y', marginTop - 5) // Position the label above the line
        .style('fill', 'red')
        .style('font-size', '22px')
        .text(bottomTargetValue);

      svg
        .append('text')
        .attr('class', 'label-target')
        .attr('x', (width - marginRight) / 2 + xScale_right(upperTargetValue) + 3) // Offset the label slightly to the right of the line
        .attr('y', marginTop - 5) // Position the label above the line
        .style('fill', 'red')
        .style('font-size', '22px')
        .text(upperTargetValue);
      this.diastolicTargetsDrawn = true;
    } else if (!this.pulseTargetsDrawn) {
      // Add target label
      svg
        .append('text')
        .attr('class', 'label-target')
        .attr('x', (width - marginRight) / 2 + xScale_right(bottomTargetValue) + 3) // Offset the label slightly to the right of the line
        .attr('y', marginTop - 5) // Position the label above the line
        .style('fill', 'red')
        .style('font-size', '22px')
        .text(bottomTargetValue);

      svg
        .append('text')
        .attr('class', 'label-target')
        .attr('x', (width - marginRight) / 2 + xScale_right(upperTargetValue) + 3) // Offset the label slightly to the right of the line
        .attr('y', marginTop - 5) // Position the label above the line
        .style('fill', 'red')
        .style('font-size', '22px')
        .text(upperTargetValue);
      this.pulseTargetsDrawn = true;
    }
    return svg.node();
  }

  //----------------------- Summary Functions ---------------------
  // insights for bp & pulse
  // @ts-ignore
  protected analyzeConsistency(data, category, thresholdPercentage, day) {
    let insights = '';
    // target corridor
    const targetRanges = {
      systolic: this.getBPTarget(category)[0],
      diastolic: this.getBPTarget(category)[1],
      pulse: [50, 100],
    };
    // check whether the value is within the target
    // @ts-ignore
    function withinTarget(value, range) {
      return value >= range[0] && value <= range[1];
    }

    // @ts-ignore
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // average value
    // @ts-ignore
    function calculateAverage(values) {
      // @ts-ignore
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    // check the frequency out of range
    // @ts-ignore
    const frequencyOutOfRange = (measurements, range) => {
      const outOfRange = measurements.filter((measurement: any) => !withinTarget(measurement, range));
      const aboveRange = measurements.filter((measurement: any) => measurement > range[1]);
      const belowRange = measurements.filter((measurement: any) => measurement < range[0]);
      const totalMeasurements = measurements.length;
      const outOfRangeCount = outOfRange.length;
      // @ts-ignore
      const averageDeviation =
        outOfRangeCount > 0
          ? outOfRange.reduce((acc: any, val: any) => acc + Math.abs(val - (val < range[0] ? range[0] : range[1])), 0) / outOfRangeCount
          : 0;
      return {
        frequency: (outOfRangeCount / totalMeasurements) * 100,
        averageDeviation,
        aboveRangeCount: aboveRange.length,
        belowRangeCount: belowRange.length,
        aboveRangePercentage: (aboveRange.length / totalMeasurements) * 100,
        belowRangePercentage: (belowRange.length / totalMeasurements) * 100,
      };
    };

    // Generate insights for each measurement
    const measurements = [
      { type: 'systolic blood pressure', key: 'avgSystolicBP', range: targetRanges.systolic },
      { type: 'diastolic blood pressure', key: 'avgDiastolicBP', range: targetRanges.diastolic },
      { type: 'pulse', key: 'avgPulse', range: targetRanges.pulse },
    ];

    const measurementUnits = {
      'systolic blood pressure': 'mmHg',
      'diastolic blood pressure': 'mmHg',
      pulse: 'bpm',
    };

    // insights for average value
    measurements.forEach(({ type, key, range }) => {
      const values = data.map((d: any) => d[key]);
      const average = calculateAverage(values);
      // @ts-ignore
      const unit = measurementUnits[type];
      let rangeStatus;

      if (average < range[0]) {
        const difference = range[0] - average;
        rangeStatus = difference.toFixed(0) + ' mmHg below target';
      } else if (average > range[1]) {
        const difference = average - range[0];
        rangeStatus = difference.toFixed(0) + ' mmHg above target';
      } else {
        rangeStatus = 'within target';
      }
      if (insights === '') {
        insights += ` For the past ${day} days, the ${type} average is ${average.toFixed(0)} ${unit}, which is ${rangeStatus}. `;
      } else {
        insights += `${capitalizeFirstLetter(type)} average is ${average.toFixed(0)} ${unit}, which is ${rangeStatus}. `;
      }
    });
    // end of the insights about average value
    insights += '<br/><br/>';

    // insights for 100% within the target range
    measurements.forEach(({ type, key, range }) => {
      const { frequency, averageDeviation, aboveRangeCount, belowRangeCount, aboveRangePercentage, belowRangePercentage } =
        frequencyOutOfRange(
          data.map((d: any) => d[key]),
          range,
        );
      if (frequency === 0) {
        insights += `All ${type} measurements were within the target range.\n`;
      }
    });
    // insights for out of the target range & above/below range values
    measurements.forEach(({ type, key, range }) => {
      const { frequency, averageDeviation, aboveRangeCount, belowRangeCount, aboveRangePercentage, belowRangePercentage } =
        frequencyOutOfRange(
          data.map((d: any) => d[key]),
          range,
        );
      // insights for out of the target range
      if (frequency > thresholdPercentage) {
        insights += `Attention needed: ${type} has been out of the target range of ${frequency.toFixed(
          0,
        )}% with an average deviation of ${averageDeviation.toFixed(0)} mmHg.\n`;
      }
      // insights for above/below range values
      if (aboveRangeCount > 0 || belowRangeCount > 0) {
        insights += `${capitalizeFirstLetter(type)} has ${aboveRangeCount} measurements (${aboveRangePercentage.toFixed(
          0,
        )}%) above and ${belowRangeCount} measurements (${belowRangePercentage.toFixed(0)}%) below the target range.\n`;
      }
    });
    // end of the insights about target
    insights += '<br/><br/>';
    return insights;
  }

  // insights for the pulse pressure
  // @ts-ignore
  protected aboveCount(group) {
    let countAbove50 = 0;
    let totalCount = group.length;
    group.forEach((d: any) => {
      if (d.avgSystolicBP - d.avgDiastolicBP > 50) {
        countAbove50 += 1;
      }
    });
    return (
      'A total of ' +
      totalCount +
      ' measurements were taken, among which ' +
      countAbove50 +
      ' measurements (' +
      ((countAbove50 / group.length) * 100).toFixed(0) +
      '%) are above 50 mmHg.'
    );
  }
  // @ts-ignore
  protected getAvgPulsePressure(group, days) {
    let sumSystolic = 0,
      sumDiastolic = 0,
      count = group.length;
    group.forEach((d: any) => {
      sumSystolic += d.avgSystolicBP;
      sumDiastolic += d.avgDiastolicBP;
    });
    const summary =
      'The average pulse pressure over the last ' + days + ' days is ' + ((sumSystolic - sumDiastolic) / count).toFixed(0) + ' mmHg.';
    return summary;
  }

  // @ts-ignore
  protected calculateSevenDayAverageTrend(data, key) {
    let insights = '';
    const dateValueMap = new Map();

    // Create a map of dates to values
    data.forEach((d: any) => {
      key === 'pulse pressure' ? dateValueMap.set(d.date, d.avgSystolicBP - d.avgDiastolicBP) : dateValueMap.set(d.date, d[key]);
    });

    const averages = data.map((d: any) => {
      let sum = 0;
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const checkDate = this.getDateNDaysAgo(d.date, i);
        if (dateValueMap.has(checkDate)) {
          sum += dateValueMap.get(checkDate);
          count++;
        }
      }
      return count > 0 ? sum / count : null; // Return null if no data for the past 7 days
    });
    // Perform linear regression on the seven-day averages to find the slope
    const regressionResult = this.linearRegression(averages.filter((a: any) => a !== null));
    const slope = regressionResult.slope;

    // Determine the trend based on the slope
    let trendDescription = slope > 0 ? 'an upward' : slope < 0 ? 'a downward' : 'a stable';
    // Calculate inflection points
    const inflectionPoints = [];
    for (let i = 0; i < data.length; i++) {
      const currentDataPoint = data[i];
      const currentDate = new Date(currentDataPoint.date);

      // Define the time window (e.g., 7 days)
      const timeWindow = 7; // Adjust this as needed

      // Initialize variables for calculating the sum and count
      let sum = 0;
      if (key === 'pulse pressure') {
        sum = data[i].avgSystolicBP - data[i].avgDiastolicBP;
      } else {
        sum = data[i][key];
      }
      let count = 1;

      // Iterate through data points within the time window (previous 7 days)
      for (let j = i - 1; j >= 0; j--) {
        // Change the loop direction to go backward
        const previousDataPoint = data[j];

        // Calculate the difference in days between the current date and previous date
        const previousDate = new Date(previousDataPoint.date + 'T00:00:00'); // Append 'T00:00:00' to represent midnight
        const daysDifference = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24); // Difference in days

        // Check if the previous data point is within the time window
        if (daysDifference > timeWindow) {
          break; // Exit the loop if the time window is exceeded
        }

        // Calculate the sum of values (e.g., avgSystolicBP)
        if (key === 'pulse pressure') {
          sum = data[j].avgSystolicBP - data[j].avgDiastolicBP;
        } else {
          sum += data[j][key]; // Adjust this for the specific value you want
        }

        count++;
      }
      // Calculate the slope using the averageWithinWindow
      if (i >= 2) {
        const prevSlope = averages[i - 1] - averages[i - 2];
        const nextSlope = averages[i] - averages[i - 1];
        if (
          (prevSlope < 0 && nextSlope > 0 && Math.abs(prevSlope - nextSlope) >= 2) ||
          (prevSlope > 0 && nextSlope < 0 && Math.abs(prevSlope - nextSlope) >= 2)
        ) {
          // Inflection point detected
          inflectionPoints.push(data[i - 1]);
        }
      }
    }

    const measurements = {
      avgSystolicBP: 'systolic blood pressure',
      avgDiastolicBP: 'diastolic blood pressure',
      avgPulse: 'pulse',
      'pulse pressure': 'pulse pressure',
    };

    // Generating insights based on the trend
    // @ts-ignore
    insights += ` The seven-day moving averages for ${measurements[key]} indicate ${trendDescription} trend. `;

    if (trendDescription !== 'a stable') {
      let intensity = Math.abs(slope) < 0.1 ? 'slightly' : Math.abs(slope) < 0.5 ? 'moderate' : 'steep';
      insights += `This trend is ${intensity} in its intensity.`;
    }
    if (inflectionPoints.length > 0) {
      insights += ` There are ${inflectionPoints.length} inflection points detected in the trend. Here are their details:<br/>`;
      inflectionPoints.forEach((point, index) => {
        insights += `<li/> Inflection Point ${index + 1}: Date - ${point.date}. <br/>`;
      });
    }
    return insights;
  }

  // Helper function to get date string n days ago
  // @ts-ignore
  protected getDateNDaysAgo(dateStr, n) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() - n);
    return date.toISOString().split('T')[0];
  }

  // Helper function for Linear Regression
  // @ts-ignore
  protected linearRegression(y) {
    let n = y.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += y[i];
      sumXY += i * y[i];
      sumXX += i * i;
    }
    let slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return { slope };
  }

  // What are frequent blood pressure and pluses?
  // @ts-ignore
  protected getAchieveRate(filteredData, category, indicator, frequentValue) {
    let upper = 0;
    let lower = 0;
    if (indicator == 'avgSystolicBP') {
      upper = this.getBPTarget(category)[0][1];
      lower = this.getBPTarget(category)[0][0];
    } else if (indicator == 'avgDiastolicBP') {
      upper = this.getBPTarget(category)[1][1];
      lower = this.getBPTarget(category)[1][0];
    } else {
      upper = 100;
      lower = 50;
    }

    const countAboveUpper = filteredData.filter((d: any) => d[indicator] > upper).length;
    const countBelowLower = filteredData.filter((d: any) => d[indicator] < lower).length;
    const countAchieved = filteredData.length - countAboveUpper - countBelowLower;

    const percentageAboveUpper = ((countAboveUpper / filteredData.length) * 100).toFixed(0);
    const percentageBelowLower = ((countBelowLower / filteredData.length) * 100).toFixed(0);
    const percentageWithinRange = ((countAchieved / filteredData.length) * 100).toFixed(0);
    let rangeStatus;

    if (frequentValue < lower) {
      const difference = lower - frequentValue;
      rangeStatus = ' which is ' + difference.toFixed(0) + ' mmHg below target';
    } else if (frequentValue > upper) {
      const difference = frequentValue - upper;
      rangeStatus = ' which is ' + difference.toFixed(0) + ' mmHg above target';
    } else {
      rangeStatus = ' which is within target';
    }

    return (
      `${rangeStatus}. ${percentageWithinRange}% of the data is within the target range, ` +
      `${percentageBelowLower}% is below the target, and ` +
      `${percentageAboveUpper}% is above the target`
    );
  }
  // @ts-ignore
  protected findMostFrequentValue(data, key) {
    const countMap = {};
    // @ts-ignore
    data.forEach(item => {
      // @ts-ignore
      if (countMap[item[key]] === undefined) {
        // @ts-ignore
        countMap[item[key]] = 1;
      } else {
        // @ts-ignore
        countMap[item[key]]++;
      }
    });

    let mostFrequentValue = null;
    let maxCount = 0;

    for (const [value, count] of Object.entries(countMap)) {
      // @ts-ignore
      if (count > maxCount) {
        // @ts-ignore
        maxCount = count;
        mostFrequentValue = value;
      }
    }
    return mostFrequentValue;
  }

  // @ts-ignore
  protected systolic_frequency_insights(data) {
    const filteredData = this.filterByMonths(data, 3);
    if (filteredData.length === 0) {
      return '';
    }
    const mostFrequentSystolicValue = this.findMostFrequentValue(filteredData, 'avgSystolicBP');
    const summary2 = this.getAchieveRate(filteredData, this.category, 'avgSystolicBP', mostFrequentSystolicValue);
    return 'The most frequent systolic blood pressure value is ' + mostFrequentSystolicValue + ' mmHg,\n' + summary2 + '.';
  }
  // @ts-ignore
  protected diastolic_frequency_insights(data) {
    const filteredData = this.filterByMonths(data, 3);
    if (filteredData.length === 0) {
      return '';
    }
    const mostFrequentDiastolicValue = this.findMostFrequentValue(filteredData, 'avgDiastolicBP');
    const summary2 = this.getAchieveRate(filteredData, this.category, 'avgDiastolicBP', mostFrequentDiastolicValue);
    return 'The most frequent diastolic blood pressure value is ' + mostFrequentDiastolicValue + ' mmHg,\n' + summary2 + '.';
  }
  // @ts-ignore
  protected pulse_frequency_insights(data) {
    const filteredData = this.filterByMonths(data, 3);
    if (filteredData.length === 0) {
      return '';
    }
    const mostFrequentPulseValue = this.findMostFrequentValue(filteredData, 'avgPulse');
    const summary2 = this.getAchieveRate(filteredData, this.category, 'avgPulse', mostFrequentPulseValue);
    return 'The most frequent pulse value is ' + mostFrequentPulseValue + ' bpm,\n' + summary2 + '.';
  }

  // Classification & comparsion target achieved rate in different timeslot
  // @ts-ignore
  protected classifyDataPoints(dataPoint) {
    const ranges = [
      { label: 'High blood pressure', systolic: 190, diastolic: 110, color: 'red', x: 55, y: 145 },
      { label: 'Pre high blood pressure', systolic: 140, diastolic: 90, color: 'yellow', x: 55, y: 125 },
      { label: 'Normal', systolic: 120, diastolic: 80, color: 'lightgreen', x: 55, y: 110 },
      { label: 'Low', systolic: 90, diastolic: 60, color: 'lightblue', x: 55, y: 80 },
    ];
    if (dataPoint.avgSystolicBP >= ranges[1].systolic || dataPoint.avgDiastolicBP >= ranges[1].diastolic) {
      return 'high blood pressure';
    } else if (dataPoint.avgSystolicBP >= ranges[2].systolic || dataPoint.avgDiastolicBP >= ranges[2].diastolic) {
      return 'pre high blood pressure';
    } else if (dataPoint.avgSystolicBP >= ranges[3].systolic || dataPoint.avgDiastolicBP >= ranges[3].diastolic) {
      return 'normal';
    } else {
      return 'low';
    }
  }
  // @ts-ignore
  protected getMostCommonCategory(morningAverages, eveningAverages) {
    let categoryCounts = {
      'high blood pressure': 0,
      'pre high blood pressure': 0,
      normal: 0,
      low: 0,
    };

    // Iterate over the data and count
    // @ts-ignore
    morningAverages.concat(eveningAverages).forEach(dataPoint => {
      const category = this.classifyDataPoints(dataPoint);
      categoryCounts[category]++;
    });

    // Identification of regions with the largest number of data points
    let mostCommonCategory = null;
    let maxCount = 0;
    Object.entries(categoryCounts).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonCategory = category;
      }
    });

    const percentage = (maxCount / (morningAverages.length + eveningAverages.length)) * 100;
    var summary = ` In the past three months, the most common blood pressure category was ${mostCommonCategory}, at approximately ${percentage.toFixed(
      0,
    )}%.`;

    if (mostCommonCategory == 'high blood pressure' && percentage > 50) {
      summary += ' This indicates a risk of high blood pressure.';
    } else if (mostCommonCategory == 'low' && percentage > 50) {
      summary += ' This indicates a risk of low blood pressure.';
    }
    return summary;
  }
  // @ts-ignore
  protected targetPercentage(systolicTarget, diastolicTarget) {
    // combine morning and evening data
    const morningAverages = this.getAveragePerTimeBox(this.mapRecord(this.bloodpressures), 'Morgens');
    const eveningAverages = this.getAveragePerTimeBox(this.mapRecord(this.bloodpressures), 'Abends');

    morningAverages.forEach(d => (d.timeBox = 'morning'));
    eveningAverages.forEach(d => (d.timeBox = 'evening'));
    // Get the current date
    var currentDate = new Date();
    // Get the current month (0-11)
    var currentMonth = currentDate.getMonth();
    // Get the current year
    var currentYear = currentDate.getFullYear();

    // todo: may need to change -> get last three months
    const firstHalfMornings = morningAverages.filter(d => {
      const date = new Date(d.date);
      const monthDifference = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
      return monthDifference < 3 && d.avgSystolicBP >= 70 && d.avgSystolicBP <= 190 && d.avgDiastolicBP >= 40 && d.avgDiastolicBP <= 110;
    });

    const firstHalfEvenings = eveningAverages.filter(d => {
      const date = new Date(d.date);
      const monthDifference = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
      return monthDifference < 3 && d.avgSystolicBP >= 70 && d.avgSystolicBP <= 190 && d.avgDiastolicBP >= 40 && d.avgDiastolicBP <= 110;
    });

    // no data in morning or no data in evening -> cannot compare
    if (firstHalfMornings.length === 0 || firstHalfEvenings.length === 0) {
      return '';
    }

    // Filter out data points that are within both systolic and diastolic targets
    const withinBothTargetsMorning = firstHalfMornings.filter(
      d =>
        d.avgSystolicBP >= systolicTarget[0] &&
        d.avgSystolicBP <= systolicTarget[1] &&
        d.avgDiastolicBP >= diastolicTarget[0] &&
        d.avgDiastolicBP <= diastolicTarget[1],
    );
    const withinBothTargetsEvening = firstHalfEvenings.filter(
      d =>
        d.avgSystolicBP >= systolicTarget[0] &&
        d.avgSystolicBP <= systolicTarget[1] &&
        d.avgDiastolicBP >= diastolicTarget[0] &&
        d.avgDiastolicBP <= diastolicTarget[1],
    );

    // calucate percentage
    const proportionMorning = withinBothTargetsMorning.length / firstHalfMornings.length;
    const proportionEvening = withinBothTargetsEvening.length / firstHalfEvenings.length;
    if (proportionMorning > proportionEvening) {
      return `Morning readings indicate better blood pressure control, achieving the target with ${(proportionMorning * 100).toFixed(
        0,
      )}% of the readings within the desired range.`;
    } else if (proportionMorning == proportionEvening) {
      return `The morning readings are the same as evenings', reaching ${(proportionMorning * 100).toFixed(0)}%`;
    } else {
      return `Evenings readings indicate better blood pressure control, achieving the target with ${(proportionMorning * 100).toFixed(
        0,
      )}% of the readings within the desired range.`;
    }
  }
  // @ts-ignore
  protected getCategory_TargetPercentage_insights(category, data) {
    const systolicTarget = this.getBPTarget(category)[0];
    const diastolicTarget = this.getBPTarget(category)[1];
    const morningAverages = this.getAveragePerTimeBox(data, 'Morgens');
    const eveningAverages = this.getAveragePerTimeBox(data, 'Abends');
    morningAverages.forEach(d => (d.timeBox = 'morning'));
    eveningAverages.forEach(d => (d.timeBox = 'evening'));
    // Get the current date
    var currentDate = new Date();
    // Get the current month (0-11)
    var currentMonth = currentDate.getMonth();
    // Get the current year
    var currentYear = currentDate.getFullYear();

    // todo: may need to change -> get last three months
    const firstHalfMornings = morningAverages.filter(d => {
      const date = new Date(d.date);
      const monthDifference = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
      return monthDifference < 3 && d.avgSystolicBP >= 70 && d.avgSystolicBP <= 190 && d.avgDiastolicBP >= 40 && d.avgDiastolicBP <= 110;
    });
    const firstHalfEvenings = eveningAverages.filter(d => {
      const date = new Date(d.date);
      const monthDifference = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
      return monthDifference < 3 && d.avgSystolicBP >= 70 && d.avgSystolicBP <= 190 && d.avgDiastolicBP >= 40 && d.avgDiastolicBP <= 110;
    });
    if (firstHalfMornings.length === 0 && firstHalfEvenings.length === 0) {
      return '';
    }
    //summary
    const summary = this.getMostCommonCategory(firstHalfMornings, firstHalfEvenings);
    let summary2 = this.targetPercentage(systolicTarget, diastolicTarget);
    return summary + ' \n' + summary2;
  }

  // Table over year
  protected analyseTable(data: any) {
    let systolicAboveTarget = 0;
    let systolicBelowTarget = 0;
    let diastolicAboveTarget = 0;
    let diastolicBelowTarget = 0;
    let pulseAboveTarget = 0;
    let pulseBelowTarget = 0;
    let systolicAverageSum = 0;
    let diastolicAverageSum = 0;
    let pulseAverageSum = 0;
    let totalMonths = data.length;

    let systolicMax = Number.MIN_VALUE;
    let systolicMin = Number.MAX_VALUE;
    let diastolicMax = Number.MIN_VALUE;
    let diastolicMin = Number.MAX_VALUE;
    let pulseMax = Number.MIN_VALUE;
    let pulseMin = Number.MAX_VALUE;

    //@ts-ignore
    data.forEach(item => {
      if (item.SystolicBP.target.aboveTarget > 0) systolicAboveTarget++;
      if (item.SystolicBP.target.belowTarget > 0) systolicBelowTarget++;
      if (item.DiastolicBP.target.aboveTarget > 0) diastolicAboveTarget++;
      if (item.DiastolicBP.target.belowTarget > 0) diastolicBelowTarget++;
      if (item.Pulse.target.aboveTarget > 0) pulseAboveTarget++;
      if (item.Pulse.target.belowTarget > 0) pulseBelowTarget++;
      systolicAverageSum += item.SystolicBP.average;
      diastolicAverageSum += item.DiastolicBP.average;
      pulseAverageSum += item.Pulse.average;

      // Update max and min values
      systolicMax = Math.max(systolicMax, item.SystolicBP.average);
      systolicMin = Math.min(systolicMin, item.SystolicBP.average);
      diastolicMax = Math.max(diastolicMax, item.DiastolicBP.average);
      diastolicMin = Math.min(diastolicMin, item.DiastolicBP.average);
      pulseMax = Math.max(pulseMax, item.Pulse.average);
      pulseMin = Math.min(pulseMin, item.Pulse.average);
    });

    let systolicAverage = systolicAverageSum / totalMonths;
    let diastolicAverage = diastolicAverageSum / totalMonths;
    let pulseAverage = pulseAverageSum / totalMonths;

    // Calculate standard deviation for SBP, DBP, and pulse
    let systolicStdDev = this.calculateStandardDeviation(data.map((item: any) => item.SystolicBP.average));
    let diastolicStdDev = this.calculateStandardDeviation(data.map((item: any) => item.DiastolicBP.average));
    let pulseStdDev = this.calculateStandardDeviation(data.map((item: any) => item.Pulse.average));

    const insights = `During the last 12 months, there were data available for ${totalMonths} months.
    <br/>
    <li/> The average Systolic Blood Pressure was ${systolicAverage.toFixed(0)} mmHg, ranging from ${systolicMin.toFixed(
      0,
    )} to ${systolicMax.toFixed(0)} mmHg with a standard deviation of ${systolicStdDev.toFixed(0)}.
    Within the recorded data, there were ${systolicAboveTarget} month(s) with measurements above the target, and ${systolicBelowTarget} month(s) with measurements were below the target.
    <br/>
    <li/> The average Diastolic Blood Pressure was ${diastolicAverage.toFixed(0)} mmHg, ranging from ${diastolicMin.toFixed(
      0,
    )} to ${diastolicMax.toFixed(0)} mmHg with a standard deviation of ${diastolicStdDev.toFixed(0)}.
    Within the recorded data, there were ${diastolicAboveTarget} month(s) with measurements above the target, and ${diastolicBelowTarget} month(s) with measurements were below.
    <br/>
    <li/> The average Pulse was ${pulseAverage.toFixed(0)} bpm, ranging from ${pulseMin.toFixed(0)} to ${pulseMax.toFixed(
      0,
    )} bpm with a standard deviation of ${pulseStdDev.toFixed(0)}.
    Within the recorded data, there were ${pulseAboveTarget} month(s) with measurements above the target, and ${pulseBelowTarget} month(s) with measurements were below.`;
    return insights;
  }
  // Helper function to calculate standard deviation
  protected calculateStandardDeviation(values: number[]): number {
    let mean = values.reduce((acc, val) => acc + val, 0) / values.length;
    let squareDiffs = values.map(val => {
      let diff = val - mean;
      return diff * diff;
    });
    let avgSquareDiff = squareDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  // Box plot
  // General trend (increasing/ decreasing/ stable) by using simple linear regression (calculate the slope of a trend line)
  // @ts-ignore
  protected generateTrendInsights(data, indicator) {
    // indicator: "pulse", "systolic blood pressure", "diastolic bloodpressure"
    let n = data.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;
    // @ts-ignore
    data.forEach((item, index) => {
      sumX += index + 2; // Assuming months are sequential and start from 2 for the calculation
      sumY += item.mean;
      sumXY += (index + 2) * item.mean;
      sumXX += (index + 2) * (index + 2);
    });
    let slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const trend = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
    const insights = `The trend of the average ${indicator} over the observed months is ${trend}.`;
    return insights;
  }

  // @ts-ignore
  // This function calculates the slope of the trend line for the windowData
  // using the least squares method for linear regression.
  protected calculateSlope(windowData, windowSize) {
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;
    for (let i = 0; i < windowSize; i++) {
      sumX += i;
      sumY += windowData[i].mean;
      sumXY += i * windowData[i].mean;
      sumXX += i * i;
    }

    let slope = (windowSize * sumXY - sumX * sumY) / (windowSize * sumXX - sumX * sumX);
    return slope;
  }
  // @ts-ignore
  protected detectTrendChanges(data, windowSize, slopeThreshold) {
    let trends = [];
    for (let i = windowSize - 1; i < data.length; i++) {
      // Calculate the slope for the current window
      let windowData = data.slice(i - windowSize + 1, i + 1);
      let slope = this.calculateSlope(windowData, windowSize);
      //let rendsMonth=
      trends.push({ month: windowData[(windowSize - 1) / 2].month, slope: slope }); // windowsSize-1这里可能需要调整 The middle point of the window
    }
    let upwardsTrendChangesMonths = [];
    let downwardsTrendChangesMonths = [];
    for (let i = 1; i < trends.length; i++) {
      let slopeChange = Math.abs(trends[i].slope - trends[i - 1].slope);
      if (trends[i].slope * trends[i - 1].slope < 0 && slopeChange > slopeThreshold) {
        if (trends[i].slope > 0) {
          upwardsTrendChangesMonths.push(trends[i].month);
        } else {
          downwardsTrendChangesMonths.push(trends[i].month);
        }
      }
    }
    let trendChanges = '';
    if (upwardsTrendChangesMonths.length !== 0) {
      trendChanges += ` Upward trend changes detected at months: ${upwardsTrendChangesMonths.join(', ')}.`;
    }
    if (downwardsTrendChangesMonths.length !== 0) {
      trendChanges += ` Downward trend changes detected at months: ${downwardsTrendChangesMonths.join(', ')}.`;
    }
    return trendChanges;
  }

  // outliers
  // help function for generate outlier insights:  total number of outliers
  // @ts-ignore
  protected analyzeOutliers(data) {
    const monthsWithOutliers = new Set(data.map((d: any) => d.month));
    const numberOfOutliers = data.length;
    const outlierMonths = Array.from(monthsWithOutliers).join(', ');
    return {
      numberOfOutliers,
      outlierMonths,
    };
  }
  // @ts-ignore
  protected generateOutlierInsights(outliers) {
    const insights = {
      Morgens: this.analyzeOutliers(outliers.Morgens),
      Abends: this.analyzeOutliers(outliers.Abends),
    };
    let mostCommonOutliers = insights.Morgens.numberOfOutliers > insights.Abends.numberOfOutliers ? 'morning' : 'evening';
    let summary =
      insights.Morgens.numberOfOutliers != 0
        ? `Found ${insights.Morgens.numberOfOutliers} morning outliers in months: ${insights.Morgens.outlierMonths}. `
        : 'Found no outlines in the morning. ';
    summary +=
      insights.Abends.numberOfOutliers != 0
        ? `Found ${insights.Abends.numberOfOutliers} evening outliers in months: ${insights.Abends.outlierMonths}. `
        : 'Found no outlines in the evening. ';
    summary += `Outliers were more common in the ${mostCommonOutliers}.`;
    return summary;
  }

  //Subtable
  private updateInsights(grouped: any, category: string, selectedDate: string): void {
    this.subtable_insights = '';
    const treatmentIndex = grouped.findIndex(
      (item: any) => item.year === selectedDate.substring(0, 4) && item.month === selectedDate.substring(5),
    );
    // calculate average
    const calcAverage = (data: any) => {
      if (data.count === 0) return null;
      return {
        SystolicBP: data.SystolicBP / data.count,
        DiastolicBP: data.DiastolicBP / data.count,
        Pulse: data.Pulse / data.count,
      };
    };

    if (treatmentIndex !== -1) {
      this.subtable_insights += `Event happens in ${selectedDate}. `;
      if (category === 'average') {
        const avgSystolicBP = this.calculateAverage(grouped, 'SystolicBP');
        const avgDiastolicBP = this.calculateAverage(grouped, 'DiastolicBP');
        const avgPulse = this.calculateAverage(grouped, 'Pulse');
        // insights about the average value
        this.subtable_insights += `The average systolic BP over the selected period is ${avgSystolicBP.toFixed(0)} mmHg. `;
        this.subtable_insights += `The average diastolic BP over the selected period is ${avgDiastolicBP.toFixed(0)} mmHg. `;
        this.subtable_insights += `The average pulse over the selected period is ${avgPulse.toFixed(0)} bpm.`;
        this.subtable_insights += '<br/>';
        // Get data for the first three months and the last three months
        const getMonthsData = (start: any, end: any) => {
          return grouped.slice(start, end).reduce(
            (acc: any, cur: any) => {
              acc.SystolicBP += cur.SystolicBP.average;
              acc.DiastolicBP += cur.DiastolicBP.average;
              acc.Pulse += cur.Pulse.average;
              acc.count++;
              return acc;
            },
            { SystolicBP: 0, DiastolicBP: 0, Pulse: 0, count: 0 },
          );
        };
        const prev3MonthsData = getMonthsData(Math.max(0, treatmentIndex - 3), treatmentIndex);
        const next3MonthsData = getMonthsData(treatmentIndex + 1, Math.min(grouped.length, treatmentIndex + 4));

        const avgPrev3Months = calcAverage(prev3MonthsData);
        const avgNext3Months = calcAverage(next3MonthsData);

        // Compare averages before and after three months(before treatment vs. after treatment) and generate insights
        if (avgPrev3Months && avgNext3Months) {
          const compare = (prev: any, next: any, key: any, unit: any) => {
            const change = next - prev;
            const trend = change > 0 ? 'increased' : 'decreased';
            return `The average ${key} has ${trend} from ${prev.toFixed(0)} ${unit} before the treatment to ${next.toFixed(
              0,
            )} ${unit} after the treatment, a change of ${Math.abs(change).toFixed(0)} ${unit}. `;
          };

          this.subtable_insights += '<br/>';
          this.subtable_insights += compare(avgPrev3Months.SystolicBP, avgNext3Months.SystolicBP, 'systolic BP', 'mmHg');
          this.subtable_insights += compare(avgPrev3Months.DiastolicBP, avgNext3Months.DiastolicBP, 'diastolic BP', 'mmHg');
          this.subtable_insights += compare(avgPrev3Months.Pulse, avgNext3Months.Pulse, 'pulse', 'bpm');
        } else {
          this.subtable_insights += `<br/>Insufficient data to determine trends before and after the treatment period.`;
        }
      } else {
        // Get data for the first three months and the last three months
        const getTargetData = (start: any, end: any, targetKey: any) => {
          return grouped.slice(start, end).reduce(
            (acc: any, cur: any) => {
              acc.SystolicBP += cur.SystolicBP.target[targetKey];
              acc.DiastolicBP += cur.DiastolicBP.target[targetKey];
              acc.Pulse += cur.Pulse.target[targetKey];
              acc.count++;
              return acc;
            },
            { SystolicBP: 0, DiastolicBP: 0, Pulse: 0, count: 0 },
          );
        };

        // Calculate the average target percentage for the previous and next periods.
        const avgPrev3Months = calcAverage(getTargetData(Math.max(0, treatmentIndex - 3), treatmentIndex, category));
        const avgNext3Months = calcAverage(getTargetData(treatmentIndex + 1, Math.min(grouped.length, treatmentIndex + 4), category));

        // Generate insights by comparing the average target percentage before and after the treatment.
        if (avgPrev3Months && avgNext3Months) {
          const compare = (prev: any, next: any, key: any) => {
            const change = next - prev;
            const trend = change > 0 ? 'increased' : 'decreased';
            if (change.toFixed(0) === '0') {
              return `The ${category} rate of ${key} remained the same before and after the treatment, with a value of ${(
                next * 100
              ).toFixed(0)}%. `;
            } else {
              return `The ${category} rate of ${key} has ${trend} from ${(prev * 100).toFixed(0)}% before the treatment to ${(
                next * 100
              ).toFixed(0)}% after the treatment, a change of ${(Math.abs(change) * 100).toFixed(0)}%. `;
            }
          };
          this.subtable_insights += compare(avgPrev3Months.SystolicBP, avgNext3Months.SystolicBP, 'systolic BP');
          this.subtable_insights += compare(avgPrev3Months.DiastolicBP, avgNext3Months.DiastolicBP, 'diastolic BP');
          this.subtable_insights += compare(avgPrev3Months.Pulse, avgNext3Months.Pulse, 'pulse');
        } else {
          this.subtable_insights += `Insufficient data to determine trends before and after the treatment period.`;
        }
      }
    }
  }

  private calculateAverage(grouped: any, key: string): number {
    const sum = grouped.reduce((accumulator: any, current: any) => accumulator + current[key].average, 0);
    return sum / grouped.length;
  }

  //----------------------- add graph -----------------------
  private svg: any;
  private width = 650;
  private height = 400;
  private marginTop = 40;
  private marginRight = 30;
  private marginBottom = 35;
  private marginLeft = 70;

  protected createSvgThreeIndicators(): void {
    this.svg = d3
      .select('figure#line_bp_pulse')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', [0, 0, this.width + this.marginRight + this.marginLeft, this.height + this.marginTop + this.marginBottom])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');
  }
  protected updateChart(days: number): void {
    this.selectedDays = days;
    if (!this.averageData || this.averageData.length === 0 || this.getRecentData(this.averageData, days).length === 0) {
      this.displayNoDataMessage();
      this.pulse_pressure = '';
      this.bp_pulse = '';
      return;
    }
    d3.select('.no-data-message').remove();
    this.svg = d3.select('figure#line_bp_pulse').select('svg');
    if (this.svg.empty()) {
      this.createSvgThreeIndicators();
    }
    this.drawLinesThreeIndicators(days);
    this.svg = d3.select('figure#line_pulse_pressure').select('svg');
    if (this.svg.empty()) {
      this.createSvgPulsePressure();
    }
    this.drawLinesPulsePressure(days);
  }
  private displayNoDataMessage(): void {
    var container = d3.select('figure#line_pulse_pressure');
    container.selectAll('*').remove();
    container = d3.select('figure#line_bp_pulse');
    container.selectAll('*').remove(); // Clears previous SVG elements if any
    container
      .append('div')
      .attr('class', 'no-data-message')
      .style('padding', '10px')
      .style('background-color', '#ffffe0')
      .style('border', '1px solid #ffebcd')
      .style('color', '#555')
      .style('text-align', 'center')
      .style('margin-top', '20px')
      .text('Keine Blutdruck gefunden');
  }

  protected drawLinesThreeIndicators(days: number) {
    if (!this.averageData || this.averageData.length === 0) return;
    const averagedData = this.getRecentData(this.averageData, days);
    if (averagedData.length === 0) {
      this.displayNoDataMessage();
      this.bp_pulse = '';
      return;
    }
    this.bp_pulse = this.analyzeConsistency(averagedData, 1, 80, days);
    if (days === 90) {
      /*
      this.bp_pulse += this.detectTrendChanges4Overview(averagedData,7,2,'avgSystolicBP');
      this.bp_pulse += this.detectTrendChanges4Overview(averagedData,7,2,'avgDiastolicBP');
      this.bp_pulse += this.detectTrendChanges4Overview(averagedData,7,2,'avgPulse');
      */
      this.bp_pulse += this.calculateSevenDayAverageTrend(averagedData, 'avgSystolicBP');
      this.bp_pulse += this.calculateSevenDayAverageTrend(averagedData, 'avgDiastolicBP');
      this.bp_pulse += this.calculateSevenDayAverageTrend(averagedData, 'avgPulse');
    }
    this.svg.selectAll('*').remove();
    // set up the x and y scales
    const x = d3.scaleTime().range([this.marginLeft, this.width - this.marginRight]);
    const y = d3.scaleLinear().range([this.height - this.marginBottom, this.marginTop]);
    const yPulse = d3.scaleLinear().range([this.height - this.marginBottom, this.marginTop]);
    // calculate the extent of the data
    const dateExtent = d3.extent(averagedData, (d: IAverageData) => new Date(d.date));
    if (!dateExtent[0] || !dateExtent[1]) {
      return;
    }
    x.domain(dateExtent);
    y.domain([40, 190]);
    yPulse.domain([
      d3.min(averagedData, (d: any) => d.avgPulse) >= 50 ? 50 : d3.min(averagedData, d => d.avgPulse),
      d3.max(averagedData, (d: any) => d.avgPulse) >= 240 ? d3.max(averagedData, (d: any) => d.avgPulse) : 240,
    ]);

    // If there is only one data point, set the tick values manually
    if (averagedData.length === 1) {
      // Define a tick format function with the correct signature
      const tickFormat = (date: Date | d3.NumberValue): string => {
        //return d3.timeFormat("%Y-%m-%d")(date as Date);
        return d3.timeFormat('%b %d')(date as Date);
      };
      // Set up the x-axis
      const xAxis = d3.axisBottom(x).tickFormat(tickFormat);
      const singleDate = new Date(averagedData[0].date); // Assuming your date is already in the correct format
      xAxis.ticks(1).tickValues([singleDate]);
      // Draw the x-axis
      this.svg
        .append('g')
        .attr('transform', `translate(0, ${this.height - this.marginBottom})`)
        .call(xAxis);
    } else if (averagedData.length > 1) {
      // add the x-asix
      this.svg
        .append('g')
        .attr('transform', `translate(0, ${this.height - this.marginBottom})`) //make sure it is on the buttom
        .call(d3.axisBottom(x)); // because we declared our range and domain
    }

    // add the y-asix
    this.svg.append('g').attr('transform', `translate(${this.marginLeft}, 0)`).call(d3.axisLeft(y));

    // Add the second y-axis to the right
    this.svg
      .append('g')
      .attr('transform', `translate(${this.width - this.marginRight}, 0)`)
      .call(d3.axisRight(yPulse));

    // add the title of y-axis in the left
    this.svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', this.marginLeft - 40)
      .attr('x', 0 - this.height / 2)
      .attr('dy', '1em')
      .style('font-size', '10px')
      .style('text-anchor', 'middle')
      .text('Blood Pressure (mmHg)')
      .style('fill');

    // add the title of y-axis in the right
    this.svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', this.width - this.marginRight + 40)
      .attr('x', 0 - this.height / 2)
      .attr('dy', '0.5em')
      .style('font-size', '10px')
      .style('text-anchor', 'middle')
      .text('Pulse (bpm)')
      .style('fill');

    // create the line generator
    const systolicLine = d3
      .line()
      .x((d: any) => x(new Date(d.date)))
      .y((d: any) => y(d.avgSystolicBP));

    const diastolicLine = d3
      .line()
      .x((d: any) => x(new Date(d.date)))
      .y((d: any) => y(d.avgDiastolicBP));

    // Add the line path to the SVG element
    this.svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'orange')
      .attr('stroke-width', 1)
      .data([averagedData])
      .attr('d', systolicLine);

    this.svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 1)
      .data([averagedData])
      .attr('d', diastolicLine);

    this.svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'lightgreen')
      .attr('stroke-width', 2)
      .data([averagedData])
      .attr(
        'd',
        d3
          .line()
          .x((d: any) => x(new Date(d.date)))
          .y((d: any) => yPulse(d.avgPulse)), // use yPulse for the Puls scale
      );

    const systolicTarget = this.getBPTarget(this.category)[0];
    const diastolicTarget = this.getBPTarget(this.category)[1];

    const drawSinglePointCorridor = (xScale: any, yScale: any, targetRange: any, color: any) => {
      this.svg
        .append('rect')
        .attr('x', xScale.range()[0]) // start at the beginning of the x axis
        .attr('width', xScale.range()[1] - xScale.range()[0]) // span the entire width
        .attr('y', yScale(targetRange[1])) // y position for the top of the rectangle
        .attr('height', yScale(targetRange[0]) - yScale(targetRange[1])) // height based on target range
        .attr('fill', color)
        .attr('opacity', 0.2);
    };

    if (averagedData.length >= 2) {
      // corridor for Puls area
      const pulseArea = d3
        .area()
        .x((d: any) => x(new Date(d.date)))
        .y0(d => yPulse(50)) // Lower boundary of the corridor
        .y1(d => yPulse(100)); // Upper boundary of the corridor

      // add the pulse area to the SVG
      this.svg
        .append('path')
        .data([averagedData])
        .attr('class', 'area')
        .attr('d', pulseArea)
        .attr('fill', 'lightgreen')
        .attr('opacity', 0.2);

      // corridor for systolic area
      const systolicArea = d3
        .area()
        .x((d: any) => x(new Date(d.date)))
        .y0(d => y(systolicTarget[0])) // Lower boundary of the corridor
        .y1(d => y(systolicTarget[1])); // Upper boundary of the corridor

      // Add the systolic pressure area to the SVG
      this.svg
        .append('path')
        .data([averagedData])
        .attr('class', 'area')
        .attr('d', systolicArea)
        .attr('fill', 'orange')
        .attr('opacity', 0.2);

      // corridor for diastolic area
      const diastolicArea = d3
        .area()
        .x((d: any) => x(new Date(d.date)))
        .y0(d => y(diastolicTarget[0])) // Lower boundary of the corridor
        .y1(d => y(diastolicTarget[1])); // Upper boundary of the corridor
      // Add the diastolic pressure area to the SVG
      this.svg
        .append('path')
        .data([averagedData])
        .attr('class', 'area')
        .attr('d', diastolicArea)
        .attr('fill', 'steelblue')
        .attr('opacity', 0.2);
    } else if (averagedData.length === 1) {
      // There's only one data point, draw a rectangle for each target instead
      drawSinglePointCorridor(x, y, [systolicTarget[0], systolicTarget[1]], 'orange'); // Systolic corridor
      drawSinglePointCorridor(x, y, [diastolicTarget[0], diastolicTarget[1]], 'steelblue'); // Diastolic corridor
      drawSinglePointCorridor(x, yPulse, [50, 100], 'lightgreen'); // Pulse corridor
    }
    // add data point
    this.svg
      .selectAll('.systolic-point')
      .data(averagedData)
      .enter()
      .append('circle')
      .attr('class', 'systolic-point')
      .attr('cx', (d: any) => x(new Date(d.date)))
      .attr('cy', (d: any) => y(d.avgSystolicBP))
      .attr('r', 3) // radius of the points
      .style('fill', 'orange');

    this.svg
      .selectAll('.diastolic-point')
      .data(averagedData)
      .enter()
      .append('circle')
      .attr('class', 'diastolic-point')
      .attr('cx', (d: any) => x(new Date(d.date)))
      .attr('cy', (d: any) => y(d.avgDiastolicBP))
      .attr('r', 3)
      .style('fill', 'steelblue');

    this.svg
      .selectAll('.Pulse-point')
      .data(averagedData)
      .enter()
      .append('circle')
      .attr('class', 'Pulse-point')
      .attr('cx', (d: any) => x(new Date(d.date)))
      .attr('cy', (d: any) => yPulse(d.avgPulse))
      .attr('r', 3)
      .style('fill', 'lightgreen');

    // creating a g element in SVG for tooltips
    const tooltip = this.svg.append('g').style('display', 'none');

    tooltip.append('rect').attr('width', 130).attr('height', 50).attr('fill', 'white').style('opacity', 0.8);

    tooltip.append('text').attr('x', 65).attr('dy', '1.2em').style('text-anchor', 'middle').style('font-size', '10px');

    this.svg
      .selectAll('.systolic-point')
      .on('mouseover', function (event: any, d: any) {
        // remove the displayed text
        tooltip.select('text').selectAll('*').remove();

        tooltip
          .select('rect')
          .attr('x', x(new Date(d.date)) - 65)
          .attr('y', y(d.avgSystolicBP) - 60)
          .attr('stroke', 'black');

        tooltip
          .select('text')
          .attr('x', x(new Date(d.date)))
          .attr('y', y(d.avgSystolicBP) - 50)
          .append('tspan')
          .attr('x', x(new Date(d.date)))
          .attr('y', y(d.avgSystolicBP) - 50)
          .text(`Systolic: ${d.avgSystolicBP.toFixed(0)} mm HG`);

        tooltip
          .select('text')
          .append('tspan')
          .attr('x', x(new Date(d.date)))
          .attr('y', y(d.avgSystolicBP) - 20)
          .text(`Time: ${d3.timeFormat('%Y-%m-%d')(new Date(d.date))} ${d.timeBox}`);
        tooltip.style('display', null);
      })
      .on('mouseout', function () {
        tooltip.style('display', 'none');
      });

    this.svg
      .selectAll('.diastolic-point')
      .on('mouseover', function (event: any, d: any) {
        tooltip.select('text').selectAll('*').remove();
        tooltip
          .select('rect')
          .attr('x', x(new Date(d.date)) - 65)
          .attr('y', y(d.avgDiastolicBP) - 60)
          .attr('stroke', 'black');
        tooltip
          .select('text')
          .attr('x', x(new Date(d.date)))
          .attr('y', y(d.avgDiastolicBP) - 50)
          .append('tspan')
          .attr('x', x(new Date(d.date)))
          .attr('y', y(d.avgDiastolicBP) - 50)
          .text(`Diastolic: ${d.avgDiastolicBP.toFixed(0)} mm HG`);
        tooltip
          .select('text')
          .append('tspan')
          .attr('x', x(new Date(d.date)))
          .attr('y', y(d.avgDiastolicBP) - 20)
          .text(`Time: ${d3.timeFormat('%Y-%m-%d')(new Date(d.date))} ${d.timeBox}`);
        tooltip.style('display', null);
      })
      .on('mouseout', function () {
        tooltip.style('display', 'none');
      });

    this.svg
      .selectAll('.Pulse-point')
      .on('mouseover', function (event: any, d: any) {
        tooltip.select('text').selectAll('*').remove();
        tooltip
          .select('rect')
          .attr('x', x(new Date(d.date)) - 65)
          .attr('y', yPulse(d.avgPulse) - 60)
          .attr('stroke', 'black');
        tooltip
          .select('text')
          .attr('x', x(new Date(d.date)))
          .attr('y', yPulse(d.avgPulse) - 50)
          .append('tspan')
          .attr('x', x(new Date(d.date)))
          .attr('y', yPulse(d.avgPulse) - 50)
          .text(`Pulse: ${d.avgPulse.toFixed(0)} bpm`);
        tooltip
          .select('text')
          .append('tspan')
          .attr('x', x(new Date(d.date)))
          .attr('y', yPulse(d.avgPulse) - 20)
          .text(`Time: ${d3.timeFormat('%Y-%m-%d')(new Date(d.date))} ${d.timeBox}`);
        tooltip.style('display', null);
      })
      .on('mouseout', function () {
        tooltip.style('display', 'none');
      });

    // add a titel
    this.svg
      .append('text')
      .attr('x', (this.width - this.marginRight + this.marginLeft) / 2)
      .attr('y', this.marginTop / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Blood Pressure and Pulse Over Time');

    // legend
    var legendData = [
      { label: 'Systolic pressure', color: 'orange' },
      { label: 'Diastolic pressure', color: 'steelblue' },
      { label: 'Pulse', color: 'lightgreen' },
    ];
    // create a group (`g`) for each legend item
    var legend = this.svg
      .selectAll('.legend')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend')
      .attr('transform', function (d: any, i: any) {
        return 'translate(' + i * 110 + ',0)';
      });
    // append a line markers to each legend group
    legend
      .append('line')
      .attr('x1', this.marginLeft)
      .attr('x2', this.marginLeft + 20) // Width of the legend line
      .attr('y1', this.height + this.marginBottom / 5)
      .attr('y2', this.height + this.marginBottom / 5)
      .style('stroke', function (d: any) {
        return d.color;
      })
      .style('stroke-width', 2);
    // append text to each legend group
    legend
      .append('text')
      .attr('x', this.marginLeft + 22)
      .attr('y', this.height + this.marginBottom / 5)
      .attr('dy', '.18em')
      .style('text-anchor', 'start')
      .style('font-size', '10px') // smaller font size
      .text(function (d: any) {
        return d.label;
      });
  }

  protected createSvgPulsePressure(): void {
    this.svg = d3
      .select('figure#line_pulse_pressure')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', [0, 0, this.width + this.marginRight + this.marginLeft, this.height + this.marginTop + this.marginBottom])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');
  }

  protected drawLinesPulsePressure(days: number): void {
    if (!this.averageData || this.averageData.length === 0) return;
    const averagedData = this.getRecentData(this.averageData, days);
    if (averagedData.length === 0) {
      this.displayNoDataMessage();
      this.pulse_pressure = '';
      return;
    }
    this.pulse_pressure = this.getAvgPulsePressure(averagedData, days) + ' ' + this.aboveCount(averagedData);
    if (days === 90) {
      this.pulse_pressure += ' ' + this.calculateSevenDayAverageTrend(averagedData, 'pulse pressure');
    }
    this.svg.selectAll('*').remove();
    // set up the x and y scales
    const x = d3.scaleTime().range([this.marginLeft, this.width - this.marginRight]);
    const y = d3.scaleLinear().range([this.height - this.marginBottom, this.marginTop]);

    // calculate the extent of the data
    const dateExtent = d3.extent(averagedData, (d: IAverageData) => new Date(d.date));
    if (!dateExtent[0] || !dateExtent[1]) {
      return;
    }
    x.domain(dateExtent);
    const minY = d3.min(averagedData, (d: IAverageData) => d.avgSystolicBP - d.avgDiastolicBP);
    const maxY = d3.max(averagedData, (d: IAverageData) => d.avgSystolicBP - d.avgDiastolicBP);
    y.domain([(minY !== undefined ? minY : 0) - 5, (maxY !== undefined ? maxY : 1) + 5]);

    // If there is only one data point, set the tick values manually
    if (averagedData.length === 1) {
      // Define a tick format function with the correct signature
      const tickFormat = (date: Date | d3.NumberValue): string => {
        return d3.timeFormat('%b %d')(date as Date);
      };
      // Set up the x-axis
      const xAxis = d3.axisBottom(x).tickFormat(tickFormat);
      const singleDate = new Date(averagedData[0].date); // Assuming your date is already in the correct format
      xAxis.ticks(1).tickValues([singleDate]);
      // Draw the x-axis
      this.svg
        .append('g')
        .attr('transform', `translate(0, ${this.height - this.marginBottom})`)
        .call(xAxis);
    } else if (averagedData.length > 1) {
      // add the x-asix
      this.svg
        .append('g')
        .attr('transform', `translate(0, ${this.height - this.marginBottom})`) //make sure it is on the buttom
        .call(d3.axisBottom(x)); // because we declared our range and domain
    }

    // add the y-asix
    this.svg.append('g').attr('transform', `translate(${this.marginLeft}, 0)`).call(d3.axisLeft(y));

    // add the title of y-axis
    this.svg
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', this.marginLeft - 40)
      .attr('x', 0 - this.height / 2)
      .attr('dy', '1em')
      .style('font-size', '10px')
      .style('text-anchor', 'middle')
      .text('Pulse Pressure (mmHg)')
      .style('fill');

    // create the line generator
    const pulseBPLine = d3
      .line<IAverageData>()
      .x(d => x(new Date(d.date)))
      .y(d => y(d.avgSystolicBP - d.avgDiastolicBP));

    // Add the line path to the SVG element
    this.svg
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .data([averagedData])
      .attr('d', pulseBPLine);

    // add data point
    this.svg
      .selectAll('.pulseBP-point')
      .data(averagedData)
      .enter()
      .append('circle')
      .attr('class', 'pulseBP-point')
      .attr('cx', (d: any) => x(new Date(d.date)))
      .attr('cy', (d: any) => y(d.avgSystolicBP - d.avgDiastolicBP))
      .attr('r', 3) // radius of the points
      .style('fill', 'black');

    // creating a g element in SVG for tooltips
    const tooltip = this.svg.append('g').style('display', 'none');

    tooltip.append('rect').attr('width', 130).attr('height', 50).attr('fill', 'white').style('opacity', 0.8);

    tooltip.append('text').attr('x', 65).attr('dy', '1.2em').style('text-anchor', 'middle').style('font-size', '10px');

    this.svg
      .selectAll('.pulseBP-point')
      .on('mouseover', function (event: any, d: any) {
        // remove the displayed text
        tooltip.select('text').selectAll('*').remove();

        tooltip
          .select('rect')
          .attr('x', x(new Date(d.date)) - 65)
          .attr('y', y(d.avgSystolicBP - d.avgDiastolicBP) - 60)
          .attr('stroke', 'black');

        tooltip
          .select('text')
          .attr('x', x(new Date(d.date)))
          .attr('y', y(d.avgSystolicBP - d.avgDiastolicBP) - 50)
          .append('tspan')
          .attr('x', x(new Date(d.date)))
          .attr('y', y(d.avgSystolicBP - d.avgDiastolicBP) - 50)
          .text(`Pulse pressure: ${(d.avgSystolicBP - d.avgDiastolicBP).toFixed(0)} mm HG`);

        tooltip
          .select('text')
          .append('tspan')
          .attr('x', x(new Date(d.date)))
          .attr('y', y(d.avgSystolicBP - d.avgDiastolicBP) - 20)
          .text(`Time: ${d3.timeFormat('%Y-%m-%d')(new Date(d.date))} ${d.timeBox}`);
        tooltip.style('display', null);
      })
      .on('mouseout', function () {
        tooltip.style('display', 'none');
      });

    // add a titel
    this.svg
      .append('text')
      .attr('x', (this.width - this.marginRight + this.marginLeft) / 2)
      .attr('y', this.marginTop / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Pulse Pressure Over Time');
  }

  protected drawScatterPlot(): void {
    const systolicTarget = this.getBPTarget(this.category)[0];
    const diastolicTarget = this.getBPTarget(this.category)[1];
    const morningAverages = this.getAveragePerTimeBox(this.mapRecord(this.bloodpressures), 'Morgens');
    const eveningAverages = this.getAveragePerTimeBox(this.mapRecord(this.bloodpressures), 'Abends');
    morningAverages.forEach(d => (d.timeBox = 'morning'));
    eveningAverages.forEach(d => (d.timeBox = 'evening'));

    const ranges = [
      { label: 'High blood pressure', systolic: 190, diastolic: 110, color: 'red', x: 55, y: 145 },
      { label: 'Pre high blood pressure', systolic: 140, diastolic: 90, color: 'yellow', x: 55, y: 125 },
      { label: 'Normal', systolic: 120, diastolic: 80, color: 'lightgreen', x: 55, y: 110 },
      { label: 'Low', systolic: 90, diastolic: 60, color: 'lightblue', x: 55, y: 80 },
    ];

    // Get the current date
    var currentDate = new Date();
    // Get the current month (0-11)
    var currentMonth = currentDate.getMonth();
    // Get the current year
    var currentYear = currentDate.getFullYear();

    // todo: may need to change -> get last three months
    const firstHalfMornings = morningAverages.filter(d => {
      const date = new Date(d.date);
      const monthDifference = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
      return monthDifference < 3 && d.avgSystolicBP >= 70 && d.avgSystolicBP <= 190 && d.avgDiastolicBP >= 40 && d.avgDiastolicBP <= 110;
    });
    const firstHalfEvenings = eveningAverages.filter(d => {
      const date = new Date(d.date);
      const monthDifference = (currentYear - date.getFullYear()) * 12 + (currentMonth - date.getMonth());
      return monthDifference < 3 && d.avgSystolicBP >= 70 && d.avgSystolicBP <= 190 && d.avgDiastolicBP >= 40 && d.avgDiastolicBP <= 110;
    });

    if (firstHalfEvenings.length === 0 && firstHalfMornings.length === 0) {
      const container = d3.select('figure#scatterPlot');
      container.selectAll('*').remove(); // Clears previous SVG elements if any
      container
        .append('div')
        .attr('class', 'no-data-message')
        .style('padding', '10px')
        .style('background-color', '#ffffe0')
        .style('border', '1px solid #ffebcd')
        .style('color', '#555')
        .style('text-align', 'center')
        .style('margin-top', '20px')
        .text('No record of measurements in the last three months');
      return;
    }
    const plot = Plot.plot({
      width: this.width - 85,
      height: this.height,
      marginTop: 20,
      marginRight: this.marginRight,
      marginBottom: this.marginBottom,
      marginLeft: this.marginLeft,
      x: { label: 'Diastolic mmHg' },
      y: { label: 'Systolic mmHg' },
      color: {
        legend: true,
        domain: ['Morning', 'Evening'],
        range: ['dodgerblue', 'darkblue'],
      },
      marks: [
        Plot.frame(),
        Plot.rect(ranges, { x1: 40, y1: 70, x2: 'diastolic', y2: 'systolic', fill: 'color' }),
        Plot.text(ranges, { x: 'x', y: 'y', text: 'label', fontSize: 14, fontWeight: 'bold' }),
        Plot.rect([{ systolic: systolicTarget[1], diastolic: diastolicTarget[1] }], {
          x1: diastolicTarget[0],
          y1: systolicTarget[0],
          x2: diastolicTarget[1],
          y2: systolicTarget[1],
          fill: 'orange',
          fillOpacity: 0.2,
          stroke: 'orange',
          strokeWidth: 4,
          strokeDasharray: '10,5',
        }),
        Plot.text([{ x: (diastolicTarget[0] + diastolicTarget[1]) / 2, y: (systolicTarget[0] + systolicTarget[1]) / 2, text: 'Target' }], {
          x: 'x',
          y: 'y',
          text: 'text',
          fontSize: 12,
          fontWeight: 'bold',
          fill: 'orange',
        }),
        Plot.dot(firstHalfMornings, { x: 'avgDiastolicBP', y: 'avgSystolicBP', opacity: 0.7, fill: 'dodgerblue', r: 3, symbol: 'circle' }),
        Plot.dot(firstHalfEvenings, { x: 'avgDiastolicBP', y: 'avgSystolicBP', fill: 'darkblue', r: 3, opacity: 0.7, symbol: 'square' }),
      ],
    });
    const container = document.querySelector('figure#scatterPlot');
    // add title
    const title = document.createElement('h2');
    title.textContent = 'Scatter Plot of Diastolic vs. Systolic Blood Pressure over the Past Three Months';
    title.style.textAlign = 'center';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    container?.prepend(title);
    container?.append(plot);
  }

  protected drawTable(): void {
    if (!this.averageData) return;
    // get one year data (12 months)
    const filteredData = this.filterByMonths(this.averageData || [], 12);
    const grouped = this.monthlyAnalysis(filteredData);
    if (!grouped || grouped.length === 0) {
      const container = d3.select('figure#table');
      container.selectAll('*').remove(); // Clears previous SVG elements if any
      container
        .append('div')
        .attr('class', 'no-data-message')
        .style('padding', '10px')
        .style('background-color', '#ffffe0')
        .style('border', '1px solid #ffebcd')
        .style('color', '#555')
        .style('text-align', 'center')
        .style('margin-top', '20px')
        .text('No record of measurements in the last 12 months');
      return;
    }
    const text = this.analyseTable(grouped);
    this.bp_pulse_over_year = text;

    const systolicTargetMax = this.getTargetMaxValue(grouped, 'SystolicBP');
    const diastolicTargetMax = this.getTargetMaxValue(grouped, 'DiastolicBP');
    const pulseTargetMax = this.getTargetMaxValue(grouped, 'Pulse');
    const systolicAverageMinMax = this.getMinMaxAverage(grouped, 'SystolicBP');
    const diastolicAverageMinMax = this.getMinMaxAverage(grouped, 'DiastolicBP');
    const pulseAverageMinMax = this.getMinMaxAverage(grouped, 'Pulse');
    const table = Inputs.table(grouped, {
      rows: 30, // adjusting the number of rows displayed
      width: {
        year: 35,
        month: 70,
        SystolicBP: 320,
        DiastolicBP: 320,
        Pulse: 320,
      },
      align: {
        year: 'center',
        month: 'center',
        SystolicBP: 'center',
        DiastolicBP: 'center',
        Pulse: 'center',
      },
      format: {
        SystolicBP: (systolicBP: any) =>
          this.target_average_vk(
            systolicBP.target,
            systolicBP.average,
            systolicBP.coefficientOfVariance,
            systolicTargetMax,
            systolicAverageMinMax,
            this.getBPTarget(this.category)[0][0],
            this.getBPTarget(this.category)[0][1],
          ),
        DiastolicBP: (diastolicBP: any) =>
          this.target_average_vk(
            diastolicBP.target,
            diastolicBP.average,
            diastolicBP.coefficientOfVariance,
            diastolicTargetMax,
            diastolicAverageMinMax,
            this.getBPTarget(this.category)[1][0],
            this.getBPTarget(this.category)[1][1],
          ),
        Pulse: (pulse: any) =>
          this.target_average_vk(pulse.target, pulse.average, pulse.coefficientOfVariance, pulseTargetMax, pulseAverageMinMax, 50, 100),
      },
    });
    const container = document.querySelector('figure#table');
    container?.append(table);
  }

  protected drawSubTable(): void {
    if (!this.averageData) return;
    const monthMapping = {
      January: 0,
      February: 1,
      March: 2,
      April: 3,
      May: 4,
      June: 5,
      July: 6,
      August: 7,
      September: 8,
      October: 9,
      November: 10,
      December: 11,
    };

    const mappedData = this.monthlyAnalysis(this.averageData);

    const currentDate = new Date();
    const oneYearAgo = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
    const filteredData = mappedData.filter(item => {
      //@ts-ignore
      const monthNumber = monthMapping[item.month];
      const itemDate = new Date(item.year, monthNumber);
      return itemDate >= oneYearAgo && itemDate <= currentDate;
    });

    if (!filteredData || filteredData.length === 0) return;

    filteredData.forEach(item => {
      //@ts-ignore
      item['year-month'] = `${item.year}-${item.month}`;
    });
    //@ts-ignore
    let grouped = this.getSelectedMonths(filteredData, filteredData[0]['year-month']);

    //@ts-ignore
    const dateOptions = filteredData.map(item => `${item.year}-${item.month}`);
    const selectElement = document.createElement('select');
    selectElement.id = 'dateSelect';
    //@ts-ignore
    dateOptions.forEach(date => {
      const option = document.createElement('option');
      option.value = date;
      option.textContent = date;
      selectElement.appendChild(option);
    });
    // add event listener
    selectElement.addEventListener('change', event => {
      const selectedDate = (event.target as HTMLSelectElement).value;
      const selectedCategory = (document.getElementById('secondSelect') as HTMLSelectElement).value;
      filteredData.forEach(item => {
        //@ts-ignore
        item['year-month'] = `${item.year}-${item.month}`;
      });
      grouped = this.getSelectedMonths(filteredData, selectedDate);
      // update table
      if (selectedCategory === 'average') {
        this.updateTable(grouped, 'average', selectedDate);
      } else if (selectedCategory === 'above target') {
        this.updateTable(grouped, 'aboveTarget', selectedDate);
      } else {
        this.updateTable(grouped, 'belowTarget', selectedDate);
      }
    });

    const secondSelectElement = document.createElement('select');
    secondSelectElement.id = 'secondSelect';
    const secondOptions = ['average', 'above target', 'below target'];
    secondOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      secondSelectElement.appendChild(option);
    });

    secondSelectElement.addEventListener('change', event => {
      const selectedCategory = (event.target as HTMLSelectElement).value;
      const selectedDate = (document.getElementById('dateSelect') as HTMLSelectElement).value;
      if (selectedCategory === 'average') {
        this.updateTable(grouped, 'average', selectedDate);
      } else if (selectedCategory === 'above target') {
        this.updateTable(grouped, 'aboveTarget', selectedDate);
      } else {
        this.updateTable(grouped, 'belowTarget', selectedDate);
      }
    });

    // Add a drop-down menu to the page
    let container = document.querySelector('#dropDownMenu');
    container?.prepend(selectElement);
    container = document.querySelector('#secondDropDownMenu');
    container?.appendChild(secondSelectElement);

    // for the first time

    //@ts-ignore
    this.updateTable(grouped, 'average', filteredData[0]['year-month']);
  }

  private updateTable(grouped: any, category: string, selectedDate: string): void {
    let isAverage = true;
    if (category.length > 7) {
      isAverage = false;
    }
    //@ts-ignore
    grouped.forEach(item => {
      delete item['year-month'];
    });
    //@ts-ignore
    function sparkbar(max, color = 'orange', linePosition = null) {
      //@ts-ignore
      return x => {
        const value = isAverage ? x.average : x.target[category];
        const width = value > 0 ? (100 * value) / max : 20;
        const displayValue = isAverage ? value.toFixed(0).toLocaleString('en') : `${(100 * value).toFixed(0)}%`;
        const lineStyle =
          linePosition !== null && value > 0
            ? `border-left: 1px solid red; position: absolute; left: ${(100 * linePosition) / max}%; height: 100%;`
            : '';
        //@ts-ignore
        return htl.html`<div style="
                position: relative;
                background: ${value > 0 ? color : 'transparent'};
                width: ${width}%;
                float: left;
                padding-left: 3px;
                box-sizing: border-box;
                white-space: nowrap;
                color: ${value > 0 ? 'white' : 'black'};">
                <div style="${lineStyle}"></div>${displayValue}`;
      };
    }

    //@ts-ignore
    function createCellContent(year, month, value) {
      if (year === selectedDate.substring(0, 4) && month === selectedDate.substring(5)) {
        //@ts-ignore
        return htl.html`<div style="color: red; text-decoration: underline dotted;">${value}</div>`;
      } else {
        return value;
      }
    }
    // delete current table if exists
    const container = document.querySelector('figure#subtable');
    //@ts-ignore
    container.innerHTML = '';

    // draw table
    //@ts-ignore
    if (!isAverage) {
      //@ts-ignore
      const maxSystolicBP = d3.max(grouped.map(g => g.SystolicBP.target[category]));
      //@ts-ignore
      const maxDiastolicBP = d3.max(grouped.map(g => g.DiastolicBP.target[category]));
      //@ts-ignore
      const maxPulse = d3.max(grouped.map(g => g.Pulse.target[category]));
      const table = Inputs.table(grouped, {
        rows: 20, // adjusting the number of rows displayed
        width: {
          year: 45,
          month: 90,
          SystolicBP: 150,
          DiastolicBP: 150,
          Pulse: 150,
        },
        format: {
          year: (value: any, d: any) => createCellContent(value, grouped[d].month, value),
          month: (value: any, d: any) => createCellContent(grouped[d].year, value, value),
          SystolicBP: sparkbar(maxSystolicBP),
          DiastolicBP: sparkbar(maxDiastolicBP, 'steelblue'),
          Pulse: sparkbar(maxPulse, 'lightgreen'),
        },
      });
      container?.append(table);
      this.updateInsights(grouped, category, selectedDate);
    } else {
      //@ts-ignore
      const maxSystolicBP = d3.max(grouped.map(g => g.SystolicBP.average));
      //@ts-ignore
      const maxDiastolicBP = d3.max(grouped.map(g => g.DiastolicBP.average));
      //@ts-ignore
      const maxPulse = d3.max(grouped.map(g => g.Pulse.average));
      const table = Inputs.table(grouped, {
        rows: 20,
        width: {
          year: 45,
          month: 90,
          SystolicBP: 150,
          DiastolicBP: 150,
          Pulse: 150,
        },
        format: {
          year: (value: any, d: any) => createCellContent(value, grouped[d].month, value),
          month: (value: any, d: any) => createCellContent(grouped[d].year, value, value),
          SystolicBP: sparkbar(maxSystolicBP),
          DiastolicBP: sparkbar(maxDiastolicBP, 'steelblue'),
          Pulse: sparkbar(maxPulse, 'lightgreen'),
        },
      });

      container?.append(table);
      this.updateInsights(grouped, 'average', selectedDate);
    }
  }

  protected drawSystolicFrequencyInLastThreeMonths(): void {
    const filteredData = this.filterByMonths(this.averageData || [], 3);
    if (!filteredData || filteredData.length === 0) {
      let container = d3.select('figure#systolicFrequency');
      container.selectAll('*').remove(); // Clears previous SVG elements if any
      container = d3.select('figure#diastolicFrequency');
      container.selectAll('*').remove(); // Clears previous SVG elements if any
      container = d3.select('figure#pulseFrequency');
      container.selectAll('*').remove(); // Clears previous SVG elements if any
      container
        .append('div')
        .attr('class', 'no-data-message')
        .style('padding', '10px')
        .style('background-color', '#ffffe0')
        .style('border', '1px solid #ffebcd')
        .style('color', '#555')
        .style('text-align', 'center')
        .style('margin-top', '20px')
        .text('No record of measurements in the last three months');
      return;
    }
    const targetValue1 = this.getBPTarget(this.category)[0][1]; // upper
    const targetValue0 = this.getBPTarget(this.category)[0][0]; // lower
    const plot = Plot.plot({
      width: this.width - 85,
      height: this.height - 85,
      marginTop: 20,
      marginRight: this.marginRight,
      marginBottom: this.marginBottom,
      marginLeft: this.marginLeft,
      marks: [
        filteredData.length > 1
          ? Plot.rectY(filteredData, Plot.binX({ y: 'count' }, { x: 'avgSystolicBP' }))
          : Plot.rectY(
              filteredData,
              Plot.binX(
                {
                  y: 'count',
                  // Set a fixed bin width that will include your single data point
                  interval: 5,
                },
                { x: 'avgSystolicBP' },
              ),
            ),
        Plot.ruleY([0]),
        // Target value lines for systolic upper and lower limits
        Plot.ruleX([targetValue1], { stroke: 'red', strokeWidth: 2 }),
        Plot.ruleX([targetValue0], { stroke: 'green', strokeWidth: 2 }),
        Plot.text([{ x: targetValue1 + 2, y: 15, text: 'Target upper limit' }], { x: 'x', y: 'y', text: 'text', dy: -5, fill: 'red' }),
        Plot.text([{ x: targetValue0 - 2, y: 15, text: 'Target lower limit' }], { x: 'x', y: 'y', text: 'text', dy: -5, fill: 'green' }),
      ],
    });
    const container = document.querySelector('figure#systolicFrequency');
    // add title
    const title = document.createElement('h2');
    title.textContent = 'Systolic blood pressure';
    title.style.textAlign = 'center';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    container?.prepend(title);
    container?.append(plot);
  }

  protected drawDiastolicFrequencyInLastThreeMonths(): void {
    const filteredData = this.filterByMonths(this.averageData || [], 3);
    if (!filteredData || filteredData.length === 0) {
      return;
    }
    // target depends on age
    const targetValue1 = this.getBPTarget(this.category)[1][1]; // upper
    const targetValue0 = this.getBPTarget(this.category)[1][0]; // lower

    const plot = Plot.plot({
      width: this.width - 85,
      height: this.height - 85,
      marginTop: 20,
      marginRight: this.marginRight,
      marginBottom: this.marginBottom,
      marginLeft: this.marginLeft,
      marks: [
        filteredData.length > 1
          ? Plot.rectY(filteredData, Plot.binX({ y: 'count' }, { x: 'avgDiastolicBP' }))
          : Plot.rectY(
              filteredData,
              Plot.binX(
                {
                  y: 'count',
                  // Set a fixed bin width that will include your single data point
                  interval: 2,
                },
                { x: 'avgDiastolicBP' },
              ),
            ),
        Plot.ruleY([0]),
        // Target value lines for systolic upper and lower limits
        Plot.ruleX([targetValue1], { stroke: 'red', strokeWidth: 2 }),
        Plot.ruleX([targetValue0], { stroke: 'green', strokeWidth: 2 }),
        Plot.text([{ x: targetValue1 + 2, y: 15, text: 'Target upper limit' }], { x: 'x', y: 'y', text: 'text', dy: -5, fill: 'red' }),
        Plot.text([{ x: targetValue0 - 2, y: 15, text: 'Target lower limit' }], { x: 'x', y: 'y', text: 'text', dy: -5, fill: 'green' }),
      ],
    });
    const container = document.querySelector('figure#diastolicFrequency');
    // add title
    const title = document.createElement('h2');
    title.textContent = 'Diastolic blood pressure';
    title.style.textAlign = 'center';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    container?.prepend(title);
    container?.append(plot);
  }

  protected drawPulseFrequencyInLastThreeMonths(): void {
    const filteredData = this.filterByMonths(this.averageData || [], 3);
    if (!filteredData || filteredData.length === 0) {
      return;
    }
    const targetValue1 = 100;
    const targetValue0 = 50;
    const plot = Plot.plot({
      width: this.width - 85,
      height: this.height - 85,
      marginTop: 20,
      marginRight: this.marginRight,
      marginBottom: this.marginBottom,
      marginLeft: this.marginLeft,
      marks: [
        filteredData.length > 1
          ? Plot.rectY(filteredData, Plot.binX({ y: 'count' }, { x: 'avgPulse' }))
          : Plot.rectY(
              filteredData,
              Plot.binX(
                {
                  y: 'count',
                  // Set a fixed bin width that will include your single data point
                  interval: 10,
                },
                { x: 'avgPulse' },
              ),
            ),
        Plot.ruleY([0]),
        // Target value lines for systolic upper and lower limits
        Plot.ruleX([targetValue1], { stroke: 'red', strokeWidth: 2 }),
        Plot.ruleX([targetValue0], { stroke: 'green', strokeWidth: 2 }),
        Plot.text([{ x: targetValue1 - 2, y: 15, text: 'Target upper limit' }], { x: 'x', y: 'y', text: 'text', dy: -5, fill: 'red' }),
        Plot.text([{ x: targetValue0 - 2, y: 15, text: 'Target lower limit' }], { x: 'x', y: 'y', text: 'text', dy: -5, fill: 'green' }),
      ],
    });
    const container = document.querySelector('figure#pulseFrequency');
    // add title
    const title = document.createElement('h2');
    title.textContent = 'Pulse';
    title.style.textAlign = 'center';
    title.style.fontSize = '18px';
    title.style.fontWeight = 'bold';
    container?.prepend(title);
    container?.append(plot);
  }

  protected createSvgPulseBoxplot(): void {
    this.svg = d3
      .select('figure#pulse_boxplot')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', [0, 0, this.width + this.marginRight + this.marginLeft, this.height + this.marginTop + this.marginBottom])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');
  }

  protected drawPulseBoxplot(): void {
    if (!this.bloodpressures) {
      return;
    }
    const morningAverage = this.getAveragePerTimeBox_boxplot(this.bloodpressures, 'Morgens');
    const EveningAverage = this.getAveragePerTimeBox_boxplot(this.bloodpressures, 'Abends');
    const combinedData = morningAverage.concat(EveningAverage);

    // @ts-ignore
    const monthlySumstat = this.getMonthlySumstat(combinedData ?? [], 'Puls');
    // @ts-ignore
    const monthlyData = this.getMonthlyData(combinedData ?? [], 'Puls');
    let dataArray = Array.from(monthlySumstat.values());

    const x = d3
      .scaleBand()
      .range([0, this.width])
      .domain(dataArray.map(d => d.month))
      .padding(0.2);
    const xOffset = 30; // shift 30 pixels to rights

    let allPulseValues = Array.from(monthlyData.values())
      .flat()
      // @ts-ignore
      .map(d => d.Indicator); //extract all systolische value to get min/max

    const y = d3
      .scaleLinear()
      .domain([d3.min(allPulseValues), d3.max(allPulseValues)])
      .range([this.height, 50]);

    // X axis
    this.svg.append('g').attr('transform', `translate(${xOffset}, ${this.height})`).call(d3.axisBottom(x));

    // Y axis
    this.svg.append('g').attr('transform', `translate(${xOffset}, 0)`).call(d3.axisLeft(y));

    this.svg
      .selectAll('.vertLine')
      .data(dataArray)
      .join('line')
      .attr('class', 'vertLine')
      // @ts-ignore
      .attr('x1', d => x(d.month) + xOffset + x.bandwidth() / 2)
      // @ts-ignore
      .attr('x2', d => x(d.month) + xOffset + x.bandwidth() / 2)
      // @ts-ignore
      .attr('y1', d => y(d.max))
      // @ts-ignore
      .attr('y2', d => y(d.min))

      .attr('stroke', 'black')
      .attr('stroke-width', 1);

    const boxWidth = 30;

    this.svg
      .selectAll('boxes')
      .data(monthlySumstat)
      .join('rect')
      // @ts-ignore
      .attr('x', d => {
        // @ts-ignore
        let xValue = x(d.month) + x.bandwidth() / 2 - boxWidth / 2 + xOffset;
        return xValue;
      }) // @ts-ignore
      .attr('y', d => y(d.Q3))
      // @ts-ignore
      .attr('height', d => y(d.Q1) - y(d.Q3))
      .attr('width', boxWidth)
      .attr('stroke', 'black')
      .style('fill', '#69b3a2');
    // @ts-ignore
    monthlyData.forEach((values, month) => {
      // @ts-ignore
      const systolischValues = values.map(d => d.Indicator).sort(d3.ascending);
      // calculate the mean value of 90% data in middle
      const len = systolischValues.length;
      let trimmedData = [];
      if (len > 1) {
        trimmedData = systolischValues.slice(Math.floor(len * 0.05), Math.ceil(len * 0.95));
      } else {
        trimmedData = systolischValues;
      }
      const median = d3.mean(trimmedData);
      let stats = monthlySumstat.find(d => d.month === month);
      // @ts-ignore
      stats.median = median;
      this.svg
        .append('line')
        // @ts-ignore
        .attr('x1', x(month) + x.bandwidth() / 2 - boxWidth / 2 + xOffset)
        // @ts-ignore
        .attr('x2', x(month) + x.bandwidth() / 2 + boxWidth / 2 + xOffset)
        // @ts-ignore
        .attr('y1', y(median))
        // @ts-ignore
        .attr('y2', y(median))
        .attr('stroke', 'black');
    });
    // Outliers in red and blue
    const outlierColors = {
      Morgens: 'red',
      Abends: 'blue',
    };

    type OutliersType = {
      Morgens: { month: string; value: number }[];
      Abends: { month: string; value: number }[];
    };

    let outliers: OutliersType = {
      Morgens: [],
      Abends: [],
    };

    monthlyData.forEach((values, month) => {
      let stats = monthlySumstat.find(d => d.month === month);
      // @ts-ignore
      values.forEach(d => {
        // @ts-ignore
        if (d.Indicator < stats.min || d.Indicator > stats.max) {
          // @ts-ignore
          outliers[d.Zeitslot].push({ month, value: d.Indicator });
          this.svg
            .append('circle')
            // @ts-ignore
            .attr('cx', x(month) + x.bandwidth() / 2 + xOffset)
            .attr('cy', y(d.Indicator))
            .attr('r', 3) // radius
            // @ts-ignore
            .style('fill', outlierColors[d.Zeitslot]);
        }
      });
    });
    // 1. collect the coordination of median points
    const medianPoints = dataArray.map(d => {
      return {
        //@ts-ignore
        x: x(d.month) + x.bandwidth() / 2 + xOffset,
        //@ts-ignore
        y: y(d.median),
      };
    });

    //2. line generator

    const lineGenerator = d3
      .line()
      //@ts-ignore
      .x(d => d.x)
      //@ts-ignore
      .y(d => d.y);

    // 3. add path to SVG
    this.svg
      .append('path')
      .datum(medianPoints)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'yellow')
      .attr('stroke-width', 1);

    this.svg
      .append('rect')
      .attr('x', this.width - 60)
      .attr('y', 10)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', 'red');

    this.svg
      .append('text')
      .attr('x', this.width - 40)
      .attr('y', 25)
      .text('outliers in mornings')
      .attr('fill', 'black');

    // blue
    this.svg
      .append('rect')
      .attr('x', this.width - 60)
      .attr('y', 30)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', 'blue');

    this.svg
      .append('text')
      .attr('x', this.width - 40)
      .attr('y', 45)
      .text('outliers in evenings')
      .attr('fill', 'black');

    // Add chart title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Pulse');

    // insights part
    this.pulse_box =
      this.generateOutlierInsights(outliers) +
      ' ' +
      this.generateTrendInsights(monthlySumstat, 'pulse') +
      this.detectTrendChanges(monthlySumstat, 3, 2); // windowsize:3 -> Calculates the slope of the trend for each three-month time window;
  }

  protected createSvgSystolicBoxplot(): void {
    this.svg = d3
      .select('figure#systolic_boxplot')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', [0, 0, this.width + this.marginRight + this.marginLeft, this.height + this.marginTop + this.marginBottom])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');
  }

  protected drawSystolicBoxplot(): void {
    if (!this.bloodpressures) {
      return;
    }
    const morningAverage = this.getAveragePerTimeBox_boxplot(this.bloodpressures, 'Morgens');
    const EveningAverage = this.getAveragePerTimeBox_boxplot(this.bloodpressures, 'Abends');
    const combinedData = morningAverage.concat(EveningAverage);
    // @ts-ignore
    const monthlySumstat = this.getMonthlySumstat(combinedData ?? [], 'Systolisch');
    // @ts-ignore
    const monthlyData = this.getMonthlyData(combinedData ?? [], 'Systolisch');
    let dataArray = Array.from(monthlySumstat.values());
    const x = d3
      .scaleBand()
      .range([0, this.width])
      .domain(dataArray.map(d => d.month))
      .padding(0.2);
    const xOffset = 30; // 30 pixels to right

    let allSystolischValues = Array.from(monthlyData.values())
      .flat()
      .map(d => d.Indicator); //extract all systolische value to get min/max

    const y = d3
      .scaleLinear()
      .domain([d3.min(allSystolischValues), d3.max(allSystolischValues)])
      .range([this.height, 50]);

    // X axis
    this.svg.append('g').attr('transform', `translate(${xOffset}, ${this.height})`).call(d3.axisBottom(x));

    // Y axis
    this.svg.append('g').attr('transform', `translate(${xOffset}, 0)`).call(d3.axisLeft(y));

    this.svg
      .selectAll('.vertLine')
      .data(dataArray)
      .join('line')
      .attr('class', 'vertLine')
      // @ts-ignore
      .attr('x1', d => x(d.month) + xOffset + x.bandwidth() / 2)
      // @ts-ignore
      .attr('x2', d => x(d.month) + xOffset + x.bandwidth() / 2)
      // @ts-ignore
      .attr('y1', d => y(d.max))
      // @ts-ignore
      .attr('y2', d => y(d.min))

      .attr('stroke', 'black')
      .attr('stroke-width', 1);

    const boxWidth = 30;

    this.svg
      .selectAll('boxes')
      .data(monthlySumstat)
      .join('rect')
      // @ts-ignore
      .attr('x', d => {
        // @ts-ignore
        let xValue = x(d.month) + x.bandwidth() / 2 - boxWidth / 2 + xOffset;
        return xValue;
      }) // @ts-ignore
      .attr('y', d => y(d.Q3))
      // @ts-ignore
      .attr('height', d => y(d.Q1) - y(d.Q3)) // Interquartile range (IQR)
      .attr('width', boxWidth)
      .attr('stroke', 'black')
      .style('fill', '#69b3a2');

    monthlyData.forEach((values, month) => {
      // @ts-ignore
      const systolischValues = values.map(d => d.Indicator).sort(d3.ascending);

      // Calculate the average of the middle 90% of the data
      const len = systolischValues.length;
      const trimmedData = systolischValues.slice(Math.floor(len * 0.05), Math.ceil(len * 0.95));
      const median = d3.mean(trimmedData);
      let stats = monthlySumstat.find(d => d.month === month);
      // @ts-ignore
      stats.median = median;
      // add middle line
      this.svg
        .append('line')
        // @ts-ignore
        .attr('x1', x(month) + x.bandwidth() / 2 - boxWidth / 2 + xOffset)
        // @ts-ignore
        .attr('x2', x(month) + x.bandwidth() / 2 + boxWidth / 2 + xOffset)
        // @ts-ignore
        .attr('y1', y(median))
        // @ts-ignore
        .attr('y2', y(median))
        .attr('stroke', 'black');
    });
    const outlierColors = {
      Morgens: 'red',
      Abends: 'blue',
    };

    type OutliersType = {
      Morgens: { month: string; value: number }[];
      Abends: { month: string; value: number }[];
    };

    let outliers: OutliersType = {
      Morgens: [],
      Abends: [],
    };

    monthlyData.forEach((values, month) => {
      let stats = monthlySumstat.find(d => d.month === month);
      // @ts-ignore
      values.forEach(d => {
        // @ts-ignore
        if (d.Indicator < stats.min || d.Indicator > stats.max) {
          // @ts-ignore
          outliers[d.Zeitslot].push({ month, value: d.Indicator });

          this.svg
            .append('circle')
            // @ts-ignore
            .attr('cx', x(month) + x.bandwidth() / 2 + xOffset)
            .attr('cy', y(d.Indicator))
            .attr('r', 3) // radius
            // @ts-ignore
            .style('fill', outlierColors[d.Zeitslot]);
        }
      });
    });
    const medianPoints = dataArray.map(d => {
      return {
        //@ts-ignore
        x: x(d.month) + x.bandwidth() / 2 + xOffset,
        //@ts-ignore
        y: y(d.median),
      };
    });

    const lineGenerator = d3
      .line()
      //@ts-ignore
      .x(d => d.x)
      //@ts-ignore
      .y(d => d.y);

    this.svg
      .append('path')
      .datum(medianPoints)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'yellow')
      .attr('stroke-width', 1);

    this.svg
      .append('rect')
      .attr('x', this.width - 60)
      .attr('y', 10)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', 'red');

    this.svg
      .append('text')
      .attr('x', this.width - 40)
      .attr('y', 25)
      .text('outliers in mornings')
      .attr('fill', 'black');

    this.svg
      .append('rect')
      .attr('x', this.width - 60)
      .attr('y', 30)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', 'blue');

    this.svg
      .append('text')
      .attr('x', this.width - 40)
      .attr('y', 45)
      .text('outliers in evenings')
      .attr('fill', 'black');

    // Add chart title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Systolic');

    // insights part
    this.systolic_box =
      this.generateOutlierInsights(outliers) +
      ' ' +
      this.generateTrendInsights(monthlySumstat, 'systolic') +
      this.detectTrendChanges(monthlySumstat, 3, 2); // windowsize:3 -> Calculates the slope of the trend for each three-month time window;
  }

  protected createSvgDiastolicBoxplot(): void {
    this.svg = d3
      .select('figure#diastolic_boxplot')
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('viewBox', [0, 0, this.width + this.marginRight + this.marginLeft, this.height + this.marginTop + this.marginBottom])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');
  }

  protected drawDiastolicBoxplot(): void {
    if (!this.bloodpressures) {
      return;
    }
    const morningAverage = this.getAveragePerTimeBox_boxplot(this.bloodpressures, 'Morgens');
    const EveningAverage = this.getAveragePerTimeBox_boxplot(this.bloodpressures, 'Abends');
    const combinedData = morningAverage.concat(EveningAverage);
    // @ts-ignore
    const monthlySumstat = this.getMonthlySumstat(combinedData ?? [], 'Diastolisch');
    // @ts-ignore
    const monthlyData = this.getMonthlyData(combinedData ?? [], 'Diastolisch');

    let dataArray = Array.from(monthlySumstat.values());
    const x = d3
      .scaleBand()
      .range([0, this.width])
      .domain(dataArray.map(d => d.month))
      .padding(0.2);
    const xOffset = 30;

    let allDiastolischValues = Array.from(monthlyData.values())
      .flat()
      .map(d => d.Indicator); //extract all systolische value to get min/max

    const y = d3
      .scaleLinear()
      .domain([d3.min(allDiastolischValues), d3.max(allDiastolischValues)])
      .range([this.height, 50]);

    // X axis
    this.svg.append('g').attr('transform', `translate(${xOffset}, ${this.height})`).call(d3.axisBottom(x));

    // Y axis
    this.svg.append('g').attr('transform', `translate(${xOffset}, 0)`).call(d3.axisLeft(y));

    this.svg
      .selectAll('.vertLine')
      .data(dataArray)
      .join('line')
      .attr('class', 'vertLine')
      // @ts-ignore
      .attr('x1', d => x(d.month) + xOffset + x.bandwidth() / 2)
      // @ts-ignore
      .attr('x2', d => x(d.month) + xOffset + x.bandwidth() / 2)
      // @ts-ignore
      .attr('y1', d => y(d.max))
      // @ts-ignore
      .attr('y2', d => y(d.min))

      .attr('stroke', 'black')
      .attr('stroke-width', 1);

    const boxWidth = 30;

    this.svg
      .selectAll('boxes')
      .data(monthlySumstat)
      .join('rect')
      // @ts-ignore
      .attr('x', d => {
        // @ts-ignore
        let xValue = x(d.month) + x.bandwidth() / 2 - boxWidth / 2 + xOffset;
        return xValue;
      }) // @ts-ignore
      .attr('y', d => y(d.Q3))
      // @ts-ignore
      .attr('height', d => y(d.Q1) - y(d.Q3))
      .attr('width', boxWidth)
      .attr('stroke', 'black')
      .style('fill', '#69b3a2');
    monthlyData.forEach((values, month) => {
      // @ts-ignore
      const DiastolischValues = values.map(d => d.Indicator).sort(d3.ascending);

      const len = DiastolischValues.length;
      const trimmedData = DiastolischValues.slice(Math.floor(len * 0.05), Math.ceil(len * 0.95));
      const median = d3.mean(trimmedData);
      let stats = monthlySumstat.find(d => d.month === month);
      // @ts-ignore
      stats.median = median;
      this.svg
        .append('line')
        // @ts-ignore
        .attr('x1', x(month) + x.bandwidth() / 2 - boxWidth / 2 + xOffset)
        // @ts-ignore
        .attr('x2', x(month) + x.bandwidth() / 2 + boxWidth / 2 + xOffset)
        // @ts-ignore
        .attr('y1', y(median))
        // @ts-ignore
        .attr('y2', y(median))
        .attr('stroke', 'black');
    });
    const outlierColors = {
      Morgens: 'red',
      Abends: 'blue',
    };

    type OutliersType = {
      Morgens: { month: string; value: number }[];
      Abends: { month: string; value: number }[];
    };

    let outliers: OutliersType = {
      Morgens: [],
      Abends: [],
    };

    monthlyData.forEach((values, month) => {
      let stats = monthlySumstat.find(d => d.month === month);
      // @ts-ignore
      values.forEach(d => {
        // @ts-ignore
        if (d.Indicator < stats.min || d.Indicator > stats.max) {
          // @ts-ignore
          outliers[d.Zeitslot].push({ month, value: d.Indicator });
          this.svg
            .append('circle')
            // @ts-ignore
            .attr('cx', x(month) + x.bandwidth() / 2 + xOffset)
            .attr('cy', y(d.Indicator))
            .attr('r', 3) // radius
            // @ts-ignore
            .style('fill', outlierColors[d.Zeitslot]);
        }
      });
    });

    const medianPoints = dataArray.map(d => {
      return {
        //@ts-ignore
        x: x(d.month) + x.bandwidth() / 2 + xOffset,
        //@ts-ignore
        y: y(d.median),
      };
    });

    const lineGenerator = d3
      .line()
      //@ts-ignore
      .x(d => d.x)
      //@ts-ignore
      .y(d => d.y);

    this.svg
      .append('path')
      .datum(medianPoints)
      .attr('d', lineGenerator)
      .attr('fill', 'none')
      .attr('stroke', 'yellow')
      .attr('stroke-width', 1);

    this.svg
      .append('rect')
      .attr('x', this.width - 60)
      .attr('y', 10)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', 'red');

    this.svg
      .append('text')
      .attr('x', this.width - 40)
      .attr('y', 25)
      .text('outliers in mornings')
      .attr('fill', 'black');

    this.svg
      .append('rect')
      .attr('x', this.width - 60)
      .attr('y', 30)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', 'blue');

    this.svg
      .append('text')
      .attr('x', this.width - 40)
      .attr('y', 45)
      .text('outliers in evenings')
      .attr('fill', 'black');
    // Add chart title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Diastolic');
    // insights part
    this.diastolic_box =
      this.generateOutlierInsights(outliers) +
      ' ' +
      this.generateTrendInsights(monthlySumstat, 'diastolic') +
      this.detectTrendChanges(monthlySumstat, 3, 2); // windowsize:3 -> Calculates the slope of the trend for each three-month time window;
  }
}
