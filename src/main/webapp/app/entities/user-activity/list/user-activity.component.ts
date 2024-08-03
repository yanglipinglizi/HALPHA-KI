import { Component, ElementRef, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { SortByDirective, SortDirective } from 'src/main/webapp/app/shared/sort';
import { DurationPipe, FormatMediumDatePipe, FormatMediumDatetimePipe } from 'src/main/webapp/app/shared/date';
import { ItemCountComponent } from 'src/main/webapp/app/shared/pagination';

import { ITEMS_PER_PAGE } from 'src/main/webapp/app/config/pagination.constants';
import { IUserActivity } from '../user-activity.model';
import { UserActivityService } from '../service/user-activity.service';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { IPatient } from '../../patient/patient.model';
import { SharedService } from '../../../services/shared.service';
import generateSummary from '../../bloodpressure/list/gptSummary';

@Component({
  standalone: true,
  selector: 'jhi-user-activity',
  templateUrl: './user-activity.component.html',
  styleUrls: ['./user-activity.component.css'],
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
export class UserActivityComponent implements OnInit {
  userActivities?: IUserActivity[];
  userActivitiesOfSameAgeGroup?: { ageGroupId: number; dataInLast12MonthOfSameAgeGroup: { date: string; step: number }[] }[] | undefined =
    [];
  userId: string | null = null;
  id: number | null = null;
  userName: string = '';
  sameAgeGroupId: (number | null | undefined)[] = [];
  averageStepDailyOfSameAgeGroup: number[] = [];
  averageStepMonthlyOfSameAgeGroup: number[] = [];
  averageStepWeeklyOfSameAgeGroup: number[] = [];
  latestDate: Date = new Date();

  userActivitiesMax: { date: string; step: number }[] | undefined;
  dataInLastMonth: { date: string; step: number }[] | undefined;
  monthlySum: { month: string; step: number }[] | undefined;
  weekData: { week: string; step: number }[] | undefined;
  averageStepDaily: number | undefined;
  sameAgeAverageStepDaily: number | undefined;
  top10ValueDaily: number | undefined;
  averageStepMonthly: number | undefined;
  sameAgeAverageStepMonthly: number | undefined;
  top10ValueMonthly: number | undefined;
  averageStepWeekly: number | undefined;
  sameAgeAverageStepWeekly: number | undefined;
  top10ValueWeekly: number | undefined;

  dailyStepInsights: string | null = null;
  monthlyStepInsights: string | null = null;
  weeklyStepInsights: string | null = null;

  isLoading = false;

  predicate = 'id';
  ascending = true;

  itemsPerPage = ITEMS_PER_PAGE;
  totalItems = 0;
  page = 1;

  //selector for specific month
  last12Months = this.getlast12Months();
  amongLast12MonthsSelectedDailyData = '';
  amongLast12MonthsSelectedWeeklyData = '';

  //selector appear with svg
  renderSelect = false;
  nameSelect = false;

  //LLM
  overallSummary = '';
  userActivitiesSummary = 'Generating summary...';

  private svg: any;
  private margin = 50;
  private width = 650 - this.margin * 2;
  private height = 400 - this.margin * 2;

  constructor(
    protected userActivityService: UserActivityService,
    protected activatedRoute: ActivatedRoute,
    public router: Router,
    protected modalService: NgbModal,
    private http: HttpClient,
    private route: ActivatedRoute,
    private elRef: ElementRef,
    private sharedService: SharedService,
  ) {}

  trackId = (_index: number, item: IUserActivity): number => this.userActivityService.getUserActivityIdentifier(item);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.userId = params.get('userId');
      console.log('userID' + this.userId);
    });

    if (!this.userId) {
      return;
    }

    this.loadData(Number(this.userId));
  }

  async getPatientData(userId: number): Promise<IPatient[]> {
    const observable = this.http.get<IPatient[]>('/api/patients/userid/' + userId);
    try {
      return await firstValueFrom(observable);
    } catch (error) {
      // Handle errors here
      throw error; // or handle it in a way that makes sense for your application
    }
  }

  async getUserActivities(userId: number): Promise<IPatient[]> {
    const observable = this.http.get<IPatient[]>('/api/user-activities/userid/' + userId);
    try {
      return await firstValueFrom(observable);
    } catch (error) {
      // Handle errors here
      return [];
    }
  }

  async getOtherUserActivities(userId: number): Promise<IPatient[]> {
    const observable = this.http.get<IPatient[]>('/api/user-activities/otheruserid/' + userId);
    try {
      return await firstValueFrom(observable);
    } catch (error) {
      // Handle errors here
      throw error; // or handle it in a way that makes sense for your application
    }
  }

  async getPatientsFromSameAgeGroup(startYear: number, endYear: number): Promise<IPatient[]> {
    const observable = this.http.get<IPatient[]>('/api/patients/age/' + startYear + '-01-01/' + endYear + '-01-01');
    try {
      return await firstValueFrom(observable);
    } catch (error) {
      // Handle errors here
      throw error; // or handle it in a way that makes sense for your application
    }
  }

  async loadData(userId: number) {
    try {
      const patientData = await this.getPatientData(userId);
      const patient = patientData[0];
      this.id = patient.id;
      this.userName = patient.nickname ? patient.nickname + ' ' : '';
      this.nameSelect = true;
      const birthYear = patientData[0].birthday?.split('-')[0];
      const startYear = Math.floor(Number(birthYear) / 10) * 10;
      const endYear = startYear + 9;

      //Daily Steps in last month
      this.userActivities = await this.getUserActivities(userId);
      this.latestDate = this.userActivities.map((item: any) => new Date(item.recordedAt)).sort((a, b) => b.getTime() - a.getTime())[0];
      const latestDateMonth = (this.latestDate.getMonth() + 1).toString().padStart(2, '0');

      // same age group
      const patientsFromSameAgeGroup = await this.getPatientsFromSameAgeGroup(startYear, endYear);
      // ... patientsFromSameAgeGroup  ...
      this.sameAgeGroupId = patientsFromSameAgeGroup.map(patient => patient.user_id);
      console.log(this.sameAgeGroupId);
      for (let i = 0; i < this.sameAgeGroupId.length; i++) {
        const ageGroupId = this.sameAgeGroupId[i]; // Get the value from the array
        if (ageGroupId !== null && ageGroupId !== undefined) {
          const sameAgeGroupData = await this.getOtherUserActivities(ageGroupId);
          console.log(sameAgeGroupData);
          if (sameAgeGroupData !== null && sameAgeGroupData !== undefined && sameAgeGroupData.length != 0) {
            const userActivitiesMaxOfSameAgeGroup = this.getMaxReportedAbsoluteCountByDay(sameAgeGroupData);
            const dataInLastMonthOfSameAgeGroup = this.getLatestMonthDailyData(this.latestDate, userActivitiesMaxOfSameAgeGroup);
            const dataInLast12MonthOfSameAgeGroup = this.getLatest12MonthDailyData(userActivitiesMaxOfSameAgeGroup);
            const monthlySumOfSameAgeGroup = this.calculateMonthlySum(dataInLast12MonthOfSameAgeGroup);
            const weekDataOfSameAgeGroup = this.getWeeklyData(dataInLastMonthOfSameAgeGroup);

            const averageStepDaily = d3.mean(dataInLastMonthOfSameAgeGroup, d => d.step) || 0;
            const averageStepMonthly = d3.mean(monthlySumOfSameAgeGroup, d => d.step) || 0;
            const averageStepWeekly = d3.mean(weekDataOfSameAgeGroup, d => d.step) || 0;

            this.averageStepDailyOfSameAgeGroup.push(averageStepDaily);
            this.averageStepMonthlyOfSameAgeGroup.push(averageStepMonthly);
            this.averageStepWeeklyOfSameAgeGroup.push(averageStepWeekly);

            // @ts-ignore
            const data = [{ ageGroupId, dataInLast12MonthOfSameAgeGroup }];
            // @ts-ignore
            this.userActivitiesOfSameAgeGroup = this.userActivitiesOfSameAgeGroup.concat(data);
          }
        }
      }

      //selector
      this.amongLast12MonthsSelectedDailyData = this.latestDate.getFullYear() + '-' + latestDateMonth;
      this.amongLast12MonthsSelectedWeeklyData = this.latestDate.getFullYear() + '-' + latestDateMonth;

      this.userActivitiesMax = this.getMaxReportedAbsoluteCountByDay(this.userActivities);
      this.dataInLastMonth = this.getLatestMonthDailyData(this.latestDate, this.userActivitiesMax);
      const dataInLast12Month = this.getLatest12MonthDailyData(this.userActivitiesMax);
      this.monthlySum = this.calculateMonthlySum(dataInLast12Month);
      this.weekData = this.getWeeklyData(this.dataInLastMonth);

      //chart 1
      this.averageStepDaily = d3.mean(this.dataInLastMonth, d => d.step) || 0; // Set a default value of 0 if data is empty
      this.sameAgeAverageStepDaily = d3.mean(this.averageStepDailyOfSameAgeGroup) || 0;
      this.top10ValueDaily = this.calculateTop10PercentAverage(this.averageStepDailyOfSameAgeGroup);

      //chart 2
      this.averageStepMonthly = d3.mean(this.monthlySum, d => d.step) || 0; // Set a default value of 0 if data is empty
      this.sameAgeAverageStepMonthly = d3.mean(this.averageStepMonthlyOfSameAgeGroup) || 0;
      this.top10ValueMonthly = this.calculateTop10PercentAverage(this.averageStepMonthlyOfSameAgeGroup);

      //chart 3
      this.averageStepWeekly = d3.mean(this.weekData, d => d.step) || 0; // Set a default value of 0 if data is empty
      this.sameAgeAverageStepWeekly = d3.mean(this.averageStepWeeklyOfSameAgeGroup) || 0;
      this.top10ValueWeekly = this.calculateTop10PercentAverage(this.averageStepWeeklyOfSameAgeGroup);

      if (this.userActivities.length != 0) {
        //draw chart
        if (this.dataInLastMonth.length != 0) {
          this.createSvgDailyStepInLastMonth();
          this.drawBarsDailyStepInLastMonth(
            this.dataInLastMonth,
            this.averageStepDaily,
            this.sameAgeAverageStepDaily,
            this.top10ValueDaily,
          );
        }
        if (this.monthlySum.length != 0) {
          this.createSvgMonthlyStep();
          this.drawBarsMonthlyStep(this.monthlySum, this.averageStepMonthly, this.sameAgeAverageStepMonthly, this.top10ValueMonthly);
        }
        if (this.weekData.length != 0) {
          this.createSvgWeeklyStepInLastMonth();
          this.drawBarsWeeklyStepInLastMonth(
            this.weekData,
            this.amongLast12MonthsSelectedWeeklyData,
            this.averageStepWeekly,
            this.sameAgeAverageStepWeekly,
            this.top10ValueWeekly,
          );
        }
        //get insight
        this.dailyStepInsights = this.createdailyStepInsights(
          this.dataInLastMonth,
          this.amongLast12MonthsSelectedDailyData,
          this.averageStepDaily,
          this.sameAgeAverageStepDaily,
          this.top10ValueDaily,
          this.averageStepDailyOfSameAgeGroup,
        );
        this.monthlyStepInsights = this.createMonthlyStepInsights(
          this.monthlySum,
          this.averageStepMonthly,
          this.sameAgeAverageStepMonthly,
          this.top10ValueMonthly,
          this.averageStepMonthlyOfSameAgeGroup,
        );
        this.weeklyStepInsights = this.createWeeklyStepInsights(
          this.weekData,
          this.amongLast12MonthsSelectedWeeklyData,
          this.averageStepWeekly,
          this.sameAgeAverageStepWeekly,
          this.top10ValueWeekly,
          this.averageStepWeeklyOfSameAgeGroup,
        );

        this.renderSelect = true;

        this.overallSummary += this.monthlyStepInsights + this.dailyStepInsights + this.weeklyStepInsights;

        this.userActivitiesSummary =
          (await generateSummary(
            this.overallSummary +
              '" Please create an HTML-formatted summary suitable for a doctor to review, focusing on four key areas based on the provided data on patient’s user acitvity about step data. Structure the summary with individual subtitles for each section, ensuring subtitles are in a slightly larger font size than the regular text. Avoid using an overall title. Please use the following simplified guidelines:\n' +
              '\n' +
              '<p><b>Summary of User Acticity compare to same age group:</b><br/>Provide a concise summary of the patient’s user acticity, compare to patients from same age group.</p>\n' +
              '<br/>\n' +
              '<p><b>Summary of User Acticity in the past monthes:</b><br/>Provide a concise summary of the patient’s current user acticity, including key statistics for the patient’s data in the last 12 month, and also recent month. </p>\n' +
              '<br/>\n' +
              '<p><b>Possible Reasons for User Acticity:</b><br/>Offer a brief prediction of the reasons for patient’s step data or possible activities based on the data</p>\n' +
              '<br/>\n' +
              '<p><b>Prediction of Future Health Trends:</b><br/>Offer a brief prediction of future user activity trends based on the data trends observed over the past months.</p>\n' +
              '<br/>\n' +
              'Ensure each section is limited to one paragraph of at least 50 words and no more than 100 words. Use <br/> for separation and clarity.\n',
          )) || 'Sorry, no summary available';

        this.http.get<IPatient[]>('/api/patients/userid/' + this.userId).subscribe((data: IPatient[]) => {
          //get id in number
          this.sharedService.updateActivitySummary(data[0].id.toString(), this.userActivitiesSummary ?? '');
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  previousState(): void {
    window.history.back();
  }

  scrollTo(elementId: string): void {
    const element = this.elRef.nativeElement.querySelector(`#${elementId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }
  }

  //-----------when change time period using selector-----------
  //@ts-ignore
  onMonthChangeDailyData(event: Event): void {
    try {
      this.amongLast12MonthsSelectedDailyData = (event.target as HTMLSelectElement).value;

      const titleContainer = d3.select('#bar1');
      titleContainer.selectAll('*').remove();

      //@ts-ignore
      const dataInSpecificMonth = this.getSelectedMonthData(this.userActivitiesMax, this.amongLast12MonthsSelectedDailyData);

      this.averageStepDailyOfSameAgeGroup = [];
      this.averageStepDaily = 0;
      this.sameAgeAverageStepDaily = 0;
      this.top10ValueDaily = 0;

      if (this.userActivitiesOfSameAgeGroup != null && this.userActivitiesOfSameAgeGroup.length != 0) {
        for (let i = 0; i < this.userActivitiesOfSameAgeGroup?.length; i++) {
          const stepData = this.userActivitiesOfSameAgeGroup[i].dataInLast12MonthOfSameAgeGroup;
          const stepDataInSpecificMonth = this.getSelectedMonthData(stepData, this.amongLast12MonthsSelectedDailyData);
          const averageStepDaily = d3.mean(stepDataInSpecificMonth, d => d.step) || 0;
          this.averageStepDailyOfSameAgeGroup.push(averageStepDaily);
        }

        this.averageStepDaily = d3.mean(dataInSpecificMonth, d => d.step) || 0; // Set a default value of 0 if data is empty
        this.sameAgeAverageStepDaily = d3.mean(this.averageStepDailyOfSameAgeGroup) || 0;
        this.top10ValueDaily = this.calculateTop10PercentAverage(this.averageStepDailyOfSameAgeGroup);
      }

      if (dataInSpecificMonth.length != 0) {
        this.createSvgDailyStepInLastMonth();
        //@ts-ignore
        this.drawBarsDailyStepInLastMonth(dataInSpecificMonth, this.averageStepDaily, this.sameAgeAverageStepDaily, this.top10ValueDaily);
      }

      this.dailyStepInsights = this.createdailyStepInsights(
        dataInSpecificMonth,
        this.amongLast12MonthsSelectedDailyData,
        this.averageStepDaily,
        this.sameAgeAverageStepDaily,
        this.top10ValueDaily,
        this.averageStepDailyOfSameAgeGroup,
      );
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  onMonthChangeWeeklyData(event: Event): void {
    try {
      this.amongLast12MonthsSelectedDailyData = (event.target as HTMLSelectElement).value;

      const titleContainer = d3.select('#bar3');
      titleContainer.selectAll('*').remove();

      //@ts-ignore
      const dataInSpecificMonth = this.getSelectedMonthData(this.userActivitiesMax, this.amongLast12MonthsSelectedDailyData);
      const weeklyDataInSpecificMonth = this.getWeeklyData(dataInSpecificMonth);

      this.averageStepWeeklyOfSameAgeGroup = [];
      this.averageStepWeekly = 0;
      this.sameAgeAverageStepWeekly = 0;
      this.top10ValueWeekly = 0;

      if (this.userActivitiesOfSameAgeGroup != null && this.userActivitiesOfSameAgeGroup.length != 0) {
        for (let i = 0; i < this.userActivitiesOfSameAgeGroup?.length; i++) {
          const stepData = this.userActivitiesOfSameAgeGroup[i].dataInLast12MonthOfSameAgeGroup;
          const stepDataInSpecificMonth = this.getSelectedMonthData(stepData, this.amongLast12MonthsSelectedDailyData);
          const weekStepDataInSpecificMonth = this.getWeeklyData(stepDataInSpecificMonth);
          const averageStepWeekly = d3.mean(weekStepDataInSpecificMonth, d => d.step) || 0;
          this.averageStepWeeklyOfSameAgeGroup.push(averageStepWeekly);
        }

        this.averageStepWeekly = d3.mean(weeklyDataInSpecificMonth, d => d.step) || 0; // Set a default value of 0 if data is empty
        this.sameAgeAverageStepWeekly = d3.mean(this.averageStepWeeklyOfSameAgeGroup) || 0;
        this.top10ValueWeekly = this.calculateTop10PercentAverage(this.averageStepWeeklyOfSameAgeGroup);
      }

      let totalstep = 0;

      for (let i = 0; i < weeklyDataInSpecificMonth.length; i++) {
        totalstep += weeklyDataInSpecificMonth[i].step;
      }

      if (totalstep != 0) {
        this.createSvgWeeklyStepInLastMonth();

        //@ts-ignore
        this.drawBarsWeeklyStepInLastMonth(
          weeklyDataInSpecificMonth,
          this.amongLast12MonthsSelectedWeeklyData,
          this.averageStepWeekly,
          this.sameAgeAverageStepWeekly,
          this.top10ValueWeekly,
        );
      }
      this.weeklyStepInsights = this.createWeeklyStepInsights(
        //@ts-ignore
        weeklyDataInSpecificMonth,
        this.amongLast12MonthsSelectedWeeklyData,
        this.averageStepWeekly,
        this.sameAgeAverageStepWeekly,
        this.top10ValueWeekly,
        this.averageStepWeeklyOfSameAgeGroup,
      );
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  //-----------data Preprocessing-----------
  /**
   * Filters and retrieves data entries corresponding to a specific month and year.
   * @param stepsData An array of data entries with date and step count.
   * @param monthYear A string representing the month and year in the format 'YYYY-MM'.
   * @returns An array of data entries for the specified month and year.
   */
  protected getSelectedMonthData(stepsData: { date: string; step: number }[], monthYear: string): { date: string; step: number }[] {
    const dataInSpecificMonth: { date: string; step: number }[] = [];

    for (const date of stepsData) {
      const dateString = date.date;
      const d = new Date(dateString);
      const monthOfDate = d.getMonth() + 1;
      const yearOfDate = d.getFullYear();
      const step = date.step;

      if (monthOfDate === Number(monthYear.substring(5, 7)) && yearOfDate.toString() === monthYear.substring(0, 4)) {
        dataInSpecificMonth.push({ date: dateString, step: step });
      }

      console.log('monthOfDate.toString()');

      console.log(monthOfDate.toString());
      console.log(monthYear.substring(0, 4));
      console.log(yearOfDate.toString());
      console.log(monthYear.substring(5, 7));
    }

    return dataInSpecificMonth;
  }

  /**
   * Retrieves the maximum reported absolute count by day from the provided user activity data.
   * @param data An array of user activity data.
   * @returns An array of objects containing the date and maximum reported absolute count for each day.
   */
  protected getMaxReportedAbsoluteCountByDay(data: IUserActivity[] | undefined): { date: string; step: number }[] {
    const maxCountByDay: { [date: string]: number } = {};
    if (data) {
      // Iterate through data
      data.forEach(row => {
        if (row.reportedFor) {
          const dateStr = row.reportedFor.trim();
          const count = row.reportedAbsoluteCount;
          if (count) {
            if (!maxCountByDay[dateStr] || count > maxCountByDay[dateStr]) {
              maxCountByDay[dateStr] = count;
            }
          }
        }
      });
    }
    const formattedData = Object.entries(maxCountByDay).map(([date, step]) => ({
      date,
      step,
    }));
    return formattedData;
  }

  /**
   * Retrieves the last 12 months in 'YYYY-MM' format.
   * @returns An array containing the last 12 months in 'YYYY-MM' format.
   */
  protected getlast12Months() {
    const months: string[] = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      let year = currentDate.getFullYear();
      let month = currentDate.getMonth() - i;

      if (month < 0) {
        month += 12;
        year--;
      }

      const formattedMonth = month < 9 ? `0${month + 1}` : `${month + 1}`;
      const formattedDate = `${year}-${formattedMonth}`;
      months.push(formattedDate);
    }

    return months;
  }

  /**
   * Retrieves the daily data for the latest 12 months based on the provided steps data.
   * @param stepsData An array of data entries with date and step count.
   * @returns An array of daily data for the latest 12 months.
   */
  protected getLatest12MonthDailyData(stepsData: { date: string; step: number }[]): { date: string; step: number }[] {
    const startDate = new Date();
    startDate.setMonth(new Date().getMonth() - 11);
    const startDateYear = startDate.getFullYear();
    const startDateMonth = startDate.getMonth() + 1;

    const result = stepsData.filter(item => {
      const itemDate = item.date.split('-');
      return (Number(itemDate[0]) === startDateYear && Number(itemDate[1]) >= startDateMonth) || Number(itemDate[0]) > startDateYear;
    });

    return result;
  }

  /**
   * Calculates the monthly sum of step counts based on the provided steps data.
   * @param stepsData An array of data entries with date and step count.
   * @returns An array of objects containing the month and total step count for each month.
   */
  protected calculateMonthlySum(stepsData: { date: string; step: number }[]): { month: string; step: number }[] {
    const monthlyStepsMap: { [key: string]: number } = {};
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);

      const formattedMonth = month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0');
      monthlyStepsMap[formattedMonth] = 0;
    }

    stepsData.forEach(data => {
      const d = new Date(data.date);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // 格式为 'YYYY-MM'
      monthlyStepsMap[yearMonth] += data.step;
    });

    const monthlySum = Object.keys(monthlyStepsMap).map(month => {
      return { month: month, step: monthlyStepsMap[month] };
    });

    return monthlySum;
  }

  /**
   * Retrieves the daily data for the latest month based on the provided steps data and the latest date.
   * @param latestDate The latest date.
   * @param stepsData An array of data entries with date and step count.
   * @returns An array of daily data for the latest month.
   */
  protected getLatestMonthDailyData(latestDate: Date, stepsData: { date: string; step: number }[]): { date: string; step: number }[] {
    const dailyDataLastMonth: { date: string; step: number }[] = [];
    const year = latestDate.getFullYear();
    const month = latestDate.getMonth() + 1;
    for (const date of stepsData) {
      const dateString = date.date;
      const d = new Date(dateString);
      const monthOfDate = d.getMonth() + 1;
      const yearOfDate = d.getFullYear();
      const step = date.step;

      if (monthOfDate == month && yearOfDate == year) {
        dailyDataLastMonth.push({ date: dateString, step: step });
      }
    }

    return dailyDataLastMonth;
  }

  /**
   * Retrieves the weekly step count data based on the provided daily step count data.
   * @param data An array of daily step count data.
   * @returns An array of weekly step count data.
   */
  protected getWeeklyData(data: { date: string; step: number }[]): { week: string; step: number }[] {
    const weeklySum: { week: string; step: number }[] = [
      { week: 'week 1', step: 0 },
      { week: 'week 2', step: 0 },
      { week: 'week 3', step: 0 },
      { week: 'week 4', step: 0 },
    ];

    for (const date of data) {
      const dateString = date.date;
      const d = new Date(dateString);

      var firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);

      var dayOfMonth = d.getDate();

      var dayOfWeek = firstDayOfMonth.getDay();

      var firstWeekStart = 1 - dayOfWeek;

      var weekNumber = Math.ceil((dayOfMonth + firstWeekStart) / 7);

      const step = date.step;

      if (weekNumber >= 1 && weekNumber < 5) {
        weeklySum[weekNumber - 1].step += step;
      } else if (weekNumber == 0) {
        weeklySum[weekNumber].step += step;
      } else if (weekNumber == 5) {
        weeklySum[weekNumber - 2].step += step;
      }
    }
    return weeklySum;
  }

  /**
   * Calculates the average step count for the top 10 percent of the provided array.
   * @param array An array of step counts.
   * @returns The average step count for the top 10 percent.
   */
  protected calculateTop10PercentAverage(array: number[]) {
    if (array.length === 0) return 0;

    const sortedArray = array.sort((a, b) => b - a);
    const top10PercentLength = Math.max(1, Math.ceil(sortedArray.length * 0.1));
    const top10PercentData = sortedArray.slice(0, top10PercentLength);

    return top10PercentData.reduce((sum, value) => sum + value, 0) / top10PercentLength;
  }

  //-----------create chart----------------
  protected createSvgDailyStepInLastMonth(): void {
    this.svg = d3
      .select('figure#bar1')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  protected createSvgWeeklyStepInLastMonth(): void {
    this.svg = d3
      .select('figure#bar3')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  protected createSvgMonthlyStep(): void {
    this.svg = d3
      .select('figure#bar2')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  //-----------draw chart----------------
  protected drawBarsDailyStepInLastMonth(
    data: { date: string; step: number }[],
    averageStep: number,
    sameAgeAverageStep: number,
    top10Value: number,
  ): void {
    // Create the X-axis band scale
    const x = d3
      .scaleBand()
      .range([0, this.width])
      .domain(data.map(d => d.date.substring(5, 10)))
      .padding(0.2);

    // Draw the X-axis on the DOM
    this.svg
      .append('g')
      .attr('transform', 'translate(0,' + this.height + ')')
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end');

    // Create the Y-axis band scale
    const maxStepValue = d3.max(data, d => d.step);

    let y = d3.scaleLinear().domain([0, 1000]).range([this.height, 0]);

    if (typeof maxStepValue === 'number') {
      if (typeof this.sameAgeAverageStepDaily === 'number' && typeof this.top10ValueDaily === 'number') {
        const yRange = Math.max(maxStepValue, this.sameAgeAverageStepDaily, this.top10ValueDaily);
        y = d3.scaleLinear().domain([0, yRange]).range([this.height, 0]);
      } else {
        y = d3.scaleLinear().domain([0, maxStepValue]).range([this.height, 0]);
      }
    }

    // Draw the Y-axis on the DOM
    this.svg.append('g').call(d3.axisLeft(y));

    // Create and fill the bars
    this.svg
      .selectAll('bars')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d: any) => x(d.date.substring(5, 10)))
      .attr('y', (d: any) => y(d.step))
      .attr('width', x.bandwidth())
      .attr('height', (d: any) => this.height - y(d.step))
      .attr('fill', '#8d9be0');
    // Add step values on top of each bar
    this.svg
      .selectAll('stepValues')
      .data(data)
      .enter()
      .append('text')
      .attr('x', (d: any) => Number(x(d.date.substring(5, 10))) + x.bandwidth() / 2)
      .attr('y', (d: any) => y(d.step) - 5) // Adjust the position as needed
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'black') // Set the color of the text
      .text((d: any) => d.step);

    // Add a centered title
    const monthYear = 'Year ' + data[0].date.substring(0, 4) + ', Month ' + data[0].date.substring(5, 7);

    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Daily Steps in ' + monthYear);

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 20)
      .attr('y', this.height + 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Date');

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Steps');

    // Add the average line
    this.svg
      .append('line')
      .attr('x1', 0)
      .attr('y1', y(averageStep))
      .attr('x2', this.width)
      .attr('y2', y(averageStep))
      .attr('stroke', 'blue')
      .attr('stroke-dasharray', '5,5'); // Optional: Set a dashed line style

    // Display the average value near the line
    this.svg
      .append('text')
      .attr('x', this.width - 95) // Adjust the position as needed
      .attr('y', y(averageStep) - 10)
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'blue') // Set the color of the text
      .text(averageStep.toFixed(0)); // Display average value with two decimal places

    // Add the overall average line
    this.svg
      .append('line')
      .attr('x1', 0)
      .attr('y1', y(sameAgeAverageStep))
      .attr('x2', this.width)
      .attr('y2', y(sameAgeAverageStep))
      .attr('stroke', 'red')
      .attr('stroke-dasharray', '5,5'); // Optional: Set a dashed line style

    // Display the average value near the line
    this.svg
      .append('text')
      .attr('x', this.width - 180) // Adjust the position as needed
      .attr('y', y(sameAgeAverageStep) + 10)
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'red') // Set the color of the text
      .text(sameAgeAverageStep.toFixed(0));

    // Add the overall average line
    this.svg
      .append('line')
      .attr('x1', 0)
      .attr('y1', y(top10Value))
      .attr('x2', this.width)
      .attr('y2', y(top10Value))
      .attr('stroke', 'green')
      .attr('stroke-dasharray', '5,5'); // Optional: Set a dashed line style

    // Display the average value near the line
    this.svg
      .append('text')
      .attr('x', this.width - 180) // Adjust the position as needed
      .attr('y', y(top10Value) + 10)
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'green') // Set the color of the text
      .text(top10Value.toFixed(0));

    const legendData = [
      { color: 'blue', label: 'Your average' },
      { color: 'red', label: 'Average of same age group' },
      { color: 'green', label: 'Top 10% of same age group' },
    ];

    const legend = this.svg.append('g').attr('transform', 'translate(' + (this.width - 150) + ', -10)');

    legend
      .selectAll('line')
      .data(legendData)
      .join('line')
      .attr('x1', 0)
      .attr('x2', 20) // 设置线的长度
      .attr('y1', (_: any, i: any) => i * 20)
      .attr('y2', (_: any, i: any) => i * 20)
      .attr('stroke', (d: any) => d.color)
      .attr('stroke-dasharray', '5,5');

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 25)
      .attr('y', (_: any, i: any) => i * 20 + 4)
      .attr('fill', (d: any) => d.color)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected drawBarsMonthlyStep(
    data: { month: string; step: number }[],
    averageStep: number,
    sameAgeAverageStep: number,
    top10Value: number,
  ): void {
    // Create the Y-axis band scale
    const y = d3
      .scaleBand()
      .range([0, this.height])
      .domain(data.map(d => d.month))
      .padding(0.2);

    // Draw the Y-axis on the DOM
    this.svg
      .append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end');

    // Create the X-axis linear scale
    const maxStepValue = d3.max(data, d => d.step);

    let x = d3.scaleLinear().domain([0, 1000]).range([0, this.width]);

    if (typeof maxStepValue === 'number') {
      if (typeof this.sameAgeAverageStepMonthly === 'number' && typeof this.top10ValueMonthly === 'number') {
        const xRange = Math.max(maxStepValue, this.sameAgeAverageStepMonthly, this.top10ValueMonthly);
        x = d3.scaleLinear().domain([0, xRange]).range([0, this.width]);
      } else {
        x = d3.scaleLinear().domain([0, maxStepValue]).range([0, this.width]);
      }
    }

    // Draw the X-axis on the DOM
    this.svg
      .append('g')
      .attr('transform', 'translate(0,' + this.height + ')')
      .call(d3.axisBottom(x));

    // Create and fill the bars
    this.svg
      .selectAll('bars')
      .data(data)
      .enter()
      .append('rect')
      .attr('y', (d: any) => y(d.month))
      .attr('x', 0)
      .attr('height', y.bandwidth())
      .attr('width', (d: any) => x(d.step))
      .attr('fill', '#8d9be0');

    // Add step values on top of each bar
    this.svg
      .selectAll('stepValues')
      .data(data)
      .enter()
      .append('text')
      .attr('y', (d: any) => Number(y(d.month)) + y.bandwidth() / 2)
      .attr('x', (d: any) => x(d.step) + 5) // Adjust the position as needed
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('fill', 'black') // Set the color of the text
      .text((d: any) => d.step);

    // Add a centered title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Monthly Steps in last 12 months');

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Month');

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 30)
      .attr('y', this.height + 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Steps');

    // Add the average line
    this.svg
      .append('line')
      .attr('y1', 10)
      .attr('x1', x(averageStep))
      .attr('y2', this.height)
      .attr('x2', x(averageStep))
      .attr('stroke', 'blue')
      .attr('stroke-dasharray', '5,5'); // Optional: Set a dashed line style

    this.svg
      .append('text')
      .attr('y', -10) // Adjust the position as needed
      .attr('x', x(averageStep) - 15)
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'blue') // Set the color of the text
      // .text('Your Average')
      // .append('tspan')
      // .attr('x', x(averageStep) - 20)
      // .attr('dy', '1.2em') // Adjust the vertical spacing between lines
      .text(averageStep.toFixed(0)); // Display average value with two decimal places

    // Add the overall average line of same age group
    this.svg
      .append('line')
      .attr('y1', 20)
      .attr('x1', x(sameAgeAverageStep))
      .attr('y2', this.height)
      .attr('x2', x(sameAgeAverageStep))
      .attr('stroke', 'red')
      .attr('stroke-dasharray', '5,5'); // Optional: Set a dashed line style

    this.svg
      .append('text')
      .attr('y', 0) // Adjust the position as needed
      .attr('x', x(sameAgeAverageStep) - 15)
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'red') // Set the color of the text
      .text(sameAgeAverageStep.toFixed(0)); // Display average value with two decimal places

    // Add the top 10 line of same age group
    this.svg
      .append('line')
      .attr('y1', 20)
      .attr('x1', x(top10Value))
      .attr('y2', this.height)
      .attr('x2', x(top10Value))
      .attr('stroke', 'green')
      .attr('stroke-dasharray', '5,5'); // Optional: Set a dashed line style

    // Display the average value near the line
    this.svg
      .append('text')
      .attr('y', 0) // Adjust the position as needed
      .attr('x', x(top10Value) - 15)
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'green') // Set the color of the text
      .text(top10Value.toFixed(0)); // Display average value with two decimal places

    const legendData = [
      { color: 'blue', label: 'Your average' },
      { color: 'red', label: 'Average of same age group' },
      { color: 'green', label: 'Top 10% of same age group' },
    ];

    const legend = this.svg.append('g').attr('transform', 'translate(' + (this.width - 150) + ', -10)');

    legend
      .selectAll('line')
      .data(legendData)
      .join('line')
      .attr('x1', 0)
      .attr('x2', 20)
      .attr('y1', (_: any, i: any) => i * 20)
      .attr('y2', (_: any, i: any) => i * 20)
      .attr('stroke', (d: any) => d.color)
      .attr('stroke-dasharray', '5,5');

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 25)
      .attr('y', (_: any, i: any) => i * 20 + 4)
      .attr('fill', (d: any) => d.color)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected drawBarsWeeklyStepInLastMonth(
    data: { week: string; step: number }[],
    monthYear: string,
    averageStep: number,
    sameAgeAverageStep: number,
    top10Value: number,
  ): void {
    // Create the X-axis band scale
    const x = d3
      .scaleBand()
      .range([0, this.width])
      .domain(data.map(d => d.week))
      .padding(0.2);

    // Draw the X-axis on the DOM
    this.svg
      .append('g')
      .attr('transform', 'translate(0,' + this.height + ')')
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end');

    // Create the Y-axis band scale
    const maxStepValue = d3.max(data, d => d.step);

    let y = d3.scaleLinear().domain([0, 1000]).range([this.height, 0]);

    if (typeof maxStepValue === 'number') {
      if (typeof this.sameAgeAverageStepWeekly === 'number' && typeof this.top10ValueWeekly === 'number') {
        const yRange = Math.max(maxStepValue, this.sameAgeAverageStepWeekly, this.top10ValueWeekly);
        y = d3.scaleLinear().domain([0, yRange]).range([this.height, 0]);
      } else {
        y = d3.scaleLinear().domain([0, maxStepValue]).range([this.height, 0]);
      }
    }

    // Draw the Y-axis on the DOM
    this.svg.append('g').call(d3.axisLeft(y));

    // Create and fill the bars
    this.svg
      .selectAll('bars')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d: any) => x(d.week))
      .attr('y', (d: any) => y(d.step))
      .attr('width', x.bandwidth())
      .attr('height', (d: any) => this.height - y(d.step))
      .attr('fill', '#8d9be0');

    // Add step values on top of each bar
    this.svg
      .selectAll('stepValues')
      .data(data)
      .enter()
      .append('text')
      .attr('x', (d: any) => Number(x(d.week)) + x.bandwidth() / 2)
      .attr('y', (d: any) => y(d.step) - 5) // Adjust the position as needed
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', 'black') // Set the color of the text
      .text((d: any) => d.step);

    // Add a centered title
    const month = 'Year ' + monthYear.substring(0, 4) + ', Month ' + monthYear.substring(5, 7);

    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Weekly Steps in ' + month);

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 20)
      .attr('y', this.height + 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Week');

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Steps');

    // Add the average line
    this.svg
      .append('line')
      .attr('x1', 0)
      .attr('y1', y(averageStep))
      .attr('x2', this.width)
      .attr('y2', y(averageStep))
      .attr('stroke', 'blue')
      .attr('stroke-dasharray', '5,5'); // Optional: Set a dashed line style

    // Display the average value near the line
    this.svg
      .append('text')
      .attr('x', this.width - 95) // Adjust the position as needed
      .attr('y', y(averageStep) - 10)
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'blue') // Set the color of the text
      .text(averageStep.toFixed(0)); // Display average value with two decimal places

    // Add the overall average line
    this.svg
      .append('line')
      .attr('x1', 0)
      .attr('y1', y(sameAgeAverageStep))
      .attr('x2', this.width)
      .attr('y2', y(sameAgeAverageStep))
      .attr('stroke', 'red')
      .attr('stroke-dasharray', '5,5'); // Optional: Set a dashed line style

    // Display the average value near the line
    this.svg
      .append('text')
      .attr('x', this.width - 180) // Adjust the position as needed
      .attr('y', y(sameAgeAverageStep) + 10)
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'red') // Set the color of the text
      .text(sameAgeAverageStep.toFixed(0));

    // Add the overall average line
    this.svg
      .append('line')
      .attr('x1', 0)
      .attr('y1', y(top10Value))
      .attr('x2', this.width)
      .attr('y2', y(top10Value))
      .attr('stroke', 'green')
      .attr('stroke-dasharray', '5,5'); // Optional: Set a dashed line style

    // Display the average value near the line
    this.svg
      .append('text')
      .attr('x', this.width - 180) // Adjust the position as needed
      .attr('y', y(top10Value) + 10)
      .attr('dy', '0.35em') // Adjust vertical alignment
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', 'green') // Set the color of the text
      .text(top10Value.toFixed(0));

    const legendData = [
      { color: 'blue', label: 'Your average' },
      { color: 'red', label: 'Average of same age group' },
      { color: 'green', label: 'Top 10% of same age group' },
    ];

    const legend = this.svg.append('g').attr('transform', 'translate(' + (this.width - 150) + ', -10)');

    legend
      .selectAll('line')
      .data(legendData)
      .join('line')
      .attr('x1', 0)
      .attr('x2', 20) // 设置线的长度
      .attr('y1', (_: any, i: any) => i * 20)
      .attr('y2', (_: any, i: any) => i * 20)
      .attr('stroke', (d: any) => d.color)
      .attr('stroke-dasharray', '5,5');

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 25)
      .attr('y', (_: any, i: any) => i * 20 + 4)
      .attr('fill', (d: any) => d.color)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  //-----------create insights----------------
  protected createdailyStepInsights(
    data: { date: string; step: number }[],
    monthYear: string,
    averageStep: number,
    sameAgeAverageStep: number,
    top10Value: number,
    averageSameAgeGroup: number[],
  ) {
    console.log(data.length);
    console.log(data.length === 0);
    if (data.length == 0) {
      return 'Sorry. There are no data in ' + monthYear + '.';
    }
    var result = 'The average daily step of this user in ' + monthYear + ' is ' + averageStep.toFixed(0) + ' steps. ';

    if (averageSameAgeGroup.length === 0) {
      result += "The birthday of this user is not set. So there is no average & top 10% data of this user's same age group. ";
    }

    if (averageSameAgeGroup.length === 1) {
      result +=
        "There is no other user in the same age group. So It is the same as the average & top 10% daily step of this user's same age group. ";
    }

    if (averageSameAgeGroup.length > 1) {
      result += 'There are ' + averageSameAgeGroup.length + ' users in the same age group. ';
      if (averageStep > sameAgeAverageStep) {
        result +=
          'It is ' +
          ((averageStep / sameAgeAverageStep - 1) * 100).toFixed(2) +
          '% higher than the average daily step (' +
          sameAgeAverageStep.toFixed(0) +
          " steps) of this user's same age group. ";
      } else if (averageStep < sameAgeAverageStep) {
        result +=
          'It is ' +
          (Math.abs(averageStep / sameAgeAverageStep - 1) * 100).toFixed(2) +
          '% lower than the average daily step (' +
          sameAgeAverageStep.toFixed(0) +
          " steps) of this user's same age group. ";
      } else {
        result += 'It is the same as the average daily step (' + sameAgeAverageStep + " steps) of this user's same age group. ";
      }

      if (averageSameAgeGroup.length < 10) {
        result +=
          'There are less than 10 users in the same age group. Here, the steps of top 1 user are seen as the top 10% average step. ';
      }

      if (averageStep > top10Value) {
        result +=
          'It is ' +
          ((averageStep / top10Value - 1) * 100).toFixed(2) +
          '% higher than the top 10% (' +
          top10Value.toFixed(0) +
          " steps) of this user's same age group. ";
      } else if (averageStep < top10Value) {
        result +=
          'It is ' +
          (Math.abs(averageStep / top10Value - 1) * 100).toFixed(2) +
          '% lower than the top 10% (' +
          top10Value.toFixed(0) +
          " steps) of this user's same age group. ";
      } else {
        result += 'It is the same as the top 10% (' + top10Value.toFixed(0) + " steps) of this user's same age group. ";
      }
    }
    let maxStepValue = 0;
    let maxStepDate = '';
    let minStepValue = 1000000;
    let minStepDate = '';
    let stepDate = [];

    for (let i = 0; i < data.length; i++) {
      stepDate.push(data[i].date);

      if (data[i].step > maxStepValue) {
        maxStepValue = data[i].step;
        maxStepDate = data[i].date;
      }
      if (data[i].step < minStepValue) {
        minStepValue = data[i].step;
        minStepDate = data[i].date;
      }
    }

    if (stepDate.length === 1) {
      result += 'There is only one day with step data this month. ';
      result += 'It is ' + maxStepValue + ' steps on ' + maxStepDate + '. ';
    } else {
      result += 'The highest daily step is ' + maxStepValue + ' steps on ' + maxStepDate + '. ';
      result += 'The lowest daily step with data available is ' + minStepValue + ' steps on ' + minStepDate + '. ';
    }

    return result;
  }

  protected createMonthlyStepInsights(
    data: { month: string; step: number }[],
    averageStep: number,
    sameAgeAverageStep: number,
    top10Value: number,
    averageSameAgeGroup: number[],
  ) {
    var result = 'The average monthly step of this user in the last 12 months is ' + averageStep.toFixed(0) + ' steps. ';

    if (averageSameAgeGroup.length === 0) {
      result += "The birthday of this user is not set. So there is no average & top 10% data of this user's same age group. ";
    }

    if (averageSameAgeGroup.length === 1) {
      result +=
        "There is no other user in the same age group. So It is the same as the average & top 10% daily step of this user's same age group. ";
    }

    if (averageSameAgeGroup.length > 1) {
      result += 'There are ' + averageSameAgeGroup.length + ' users in the same age group. ';
      if (averageStep > sameAgeAverageStep) {
        result +=
          'It is ' +
          ((averageStep / sameAgeAverageStep - 1) * 100).toFixed(2) +
          '% higher than the average monthly step (' +
          sameAgeAverageStep.toFixed(0) +
          " steps) of this user's same age group. ";
      } else if (averageStep < sameAgeAverageStep) {
        result +=
          'It is ' +
          (Math.abs(averageStep / sameAgeAverageStep - 1) * 100).toFixed(2) +
          '% lower than the average monthly step (' +
          sameAgeAverageStep.toFixed(0) +
          " steps) of this user's same age group. ";
      } else {
        result += 'It is the same as the average monthly step (' + sameAgeAverageStep + " steps) of this user's same age group. ";
      }

      if (averageSameAgeGroup.length < 10) {
        result +=
          'There are less than 10 users in the same age group. Here, the steps of top 1 user are seen as the top 10% average step. ';
      }

      if (averageStep > top10Value) {
        result +=
          'It is ' +
          ((averageStep / top10Value - 1) * 100).toFixed(2) +
          '% higher than the top 10% (' +
          top10Value.toFixed(0) +
          " steps) of this user's same age group. ";
      } else if (averageStep < top10Value) {
        result +=
          'It is ' +
          (Math.abs(averageStep / top10Value - 1) * 100).toFixed(2) +
          '% lower than the top 10% (' +
          top10Value.toFixed(0) +
          " steps) of this user's same age group. ";
      } else {
        result += 'It is the same as the top 10% (' + top10Value.toFixed(0) + " steps) of this user's same age group. ";
      }
    }
    let maxStepValue = 0;
    let maxStepMonth = '';
    let minStepValue = 1000000;
    let minStepMonth = '';
    let noStepMonth = [];

    for (let i = 0; i < data.length; i++) {
      if (data[i].step === 0) {
        noStepMonth.push(data[i].month);
      } else {
        if (data[i].step > maxStepValue) {
          maxStepValue = data[i].step;
          maxStepMonth = data[i].month;
        }
        if (data[i].step < minStepValue) {
          minStepValue = data[i].step;
          minStepMonth = data[i].month;
        }
      }
    }

    if (noStepMonth.length > 0) {
      result += '<br/><br/>';
      result += 'There are ' + noStepMonth.length + ' months with no step data. ';
      result += 'They are ' + noStepMonth.join(', ') + '. ';
    }
    result += 'The highest monthly step is ' + maxStepValue + ' steps on ' + maxStepMonth + '. ';
    result += 'The lowest monthly step with data available is ' + minStepValue + ' steps on ' + minStepMonth + '. ';

    return result;
  }

  protected createWeeklyStepInsights(
    data: { week: string; step: number }[],
    monthYear: string,
    averageStep: number,
    sameAgeAverageStep: number,
    top10Value: number,
    averageSameAgeGroup: number[],
  ) {
    let totalstep = 0;

    for (let i = 0; i < data.length; i++) {
      totalstep += data[i].step;
    }

    if (totalstep === 0) {
      return 'Sorry. There are no data in ' + monthYear + '.';
    }

    var result = 'The average weekly step of this user in ' + monthYear + ' is ' + averageStep.toFixed(0) + ' steps. ';

    if (averageSameAgeGroup.length === 0) {
      result += "The birthday of this user is not set. So there is no average & top 10% data of this user's same age group. ";
    }

    if (averageSameAgeGroup.length === 1) {
      result +=
        "There is no other user in the same age group. So It is the same as the average & top 10% daily step of this user's same age group. ";
    }

    if (averageSameAgeGroup.length > 1) {
      result += 'There are ' + averageSameAgeGroup.length + ' users in the same age group. ';
      if (averageStep > sameAgeAverageStep) {
        result +=
          'It is ' +
          ((averageStep / sameAgeAverageStep - 1) * 100).toFixed(2) +
          '% higher than the average weekly step (' +
          sameAgeAverageStep.toFixed(0) +
          " steps) of this user's same age group. ";
      } else if (averageStep < sameAgeAverageStep) {
        result +=
          'It is ' +
          (Math.abs(averageStep / sameAgeAverageStep - 1) * 100).toFixed(2) +
          '% lower than the average weekly step (' +
          sameAgeAverageStep.toFixed(0) +
          " steps) of this user's same age group. ";
      } else {
        result += 'It is the same as the average weekly step (' + sameAgeAverageStep + " steps) of this user's same age group. ";
      }

      if (averageSameAgeGroup.length < 10) {
        result +=
          'There are less than 10 users in the same age group. Here, the steps of top 1 user are seen as the top 10% average steps. ';
      }

      if (averageStep > top10Value) {
        result +=
          'It is ' +
          ((averageStep / top10Value - 1) * 100).toFixed(2) +
          '% higher than the top 10% (' +
          top10Value.toFixed(0) +
          " steps) of this user's same age group. ";
      } else if (averageStep < top10Value) {
        result +=
          'It is ' +
          (Math.abs(averageStep / top10Value - 1) * 100).toFixed(2) +
          '% lower than the top 10% (' +
          top10Value.toFixed(0) +
          " steps) of this user's same age group. ";
      } else {
        result += 'It is the same as the top 10% (' + top10Value.toFixed(0) + " steps) of this user's same age group. ";
      }
    }
    let maxStepValue = 0;
    let maxStepWeek = '';
    let minStepValue = 1000000;
    let minStepWeek = '';
    let noStepWeek = [];

    for (let i = 0; i < data.length; i++) {
      if (data[i].step === 0) {
        noStepWeek.push(data[i].week);
      } else {
        if (data[i].step > maxStepValue) {
          maxStepValue = data[i].step;
          maxStepWeek = data[i].week;
        }
        if (data[i].step < minStepValue) {
          minStepValue = data[i].step;
          minStepWeek = data[i].week;
        }
      }
    }

    if (noStepWeek.length === 3) {
      result += 'There is only one week of step data, which is ' + maxStepValue + ' steps on ' + maxStepWeek + '. ';
    } else {
      if (noStepWeek.length > 0) {
        result += 'There are ' + noStepWeek.length + ' weeks with no step data. ';
        result += 'They are ' + noStepWeek.join(', ') + '. ';
      }
      result += 'The highest weekly step is ' + maxStepValue + ' steps on ' + maxStepWeek + '. ';
      result += 'The lowest weekly step with data available is ' + minStepValue + ' steps on ' + minStepWeek + '. ';
    }
    return result;
  }
}
