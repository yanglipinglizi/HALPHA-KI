import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Data, ParamMap, Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'src/main/webapp/app/shared/shared.module';
import { SortDirective, SortByDirective } from 'src/main/webapp/app/shared/sort';
import { DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe } from 'src/main/webapp/app/shared/date';
import { ItemCountComponent } from 'src/main/webapp/app/shared/pagination';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { ITEMS_PER_PAGE } from 'src/main/webapp/app/config/pagination.constants';
import { IGeoLocation } from '../geo-location.model';
import { GeoLocationService } from '../service/geo-location.service';
import { IPatient } from '../../patient/patient.model';

// @ts-ignore
import * as Inputs from '@observablehq/inputs';
import * as Plot from '@observablehq/plot';
import * as d3 from 'd3';

import { SharedService } from '../../../services/shared.service';
import generateSummary from '../../bloodpressure/list/gptSummary';

import { Loader } from '@googlemaps/js-api-loader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

@Component({
  standalone: true,
  selector: 'jhi-geo-location',
  templateUrl: './geo-location.component.html',
  styleUrls: ['./geo-location.component.css'],
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
export class GeoLocationComponent implements OnInit {
  geoLocations?: IGeoLocation[];
  patient?: IPatient;
  userId: string | null = null;
  id: number | null = null;
  userName: string = '';
  homeLocation: (number | null | undefined)[] = [];
  isHomeLocationDefined = false;

  //The average value of this user
  userAverageValue = {
    durationAtHome: 0,
    durationOutOfHome: 0,
    frequencyOutOfHome: 0,
    maxDistance: 0,
  };

  //The array of locations without duplicated detailed location
  mergedLocationsArray: (number | null | undefined)[] = [];

  dailyFluctuationsInsights: string | null = null;
  dailyDurationOverviewInsights: string | null = null;
  dailyDurationInsights: string | null = null;
  monthlyDurationInsights: string | null = null;
  monthlyFrequencyInsights: string | null = null;
  monthlyLocationNumberInsights: string | null = null;
  specificMonthlyDurationInsights: string | null = null;
  specificMonthlyFrequencyInsights: string | null = null;
  specificMonthlyLocationNumberInsights: string | null = null;
  mapInsights: string | null = null;
  comparisonInsights: string | null = null;

  isLoading = false;
  predicate = 'id';
  ascending = true;
  itemsPerPage = ITEMS_PER_PAGE;
  totalItems = 0;
  page = 1;

  // Get the current month (0-indexed, so add 1)
  selectedMonth = 10;
  selectedYear = 2023;

  newMonth = this.selectedMonth;
  newYear = this.selectedYear;
  oldMonth = this.selectedMonth;
  oldYear = this.selectedYear;

  amongMonthMapSelection = this.newYear + '-' + this.newMonth;

  //selector for specific month
  last12Months = this.getlast12Months();
  amongLast12MonthsSelectedDuration = '2023-12';
  amongLast12MonthsSelectedFrequency = '2023-12';
  amongLast12MonthsSelectedLocationNumber = '2023-12';

  //LLM
  overallSummary = '';
  geoSummary = 'Generating summary...';

  private svg: any;
  private margin = 50;
  private width = 730 - this.margin * 2;
  private height = 500 - this.margin * 2;

  //navbar appear with svg
  renderSelect = false;
  nameSelect = false;
  dataSelect = false;

  constructor(
    protected geoLocationService: GeoLocationService,
    protected activatedRoute: ActivatedRoute,
    public router: Router,
    protected modalService: NgbModal,
    private http: HttpClient,
    private route: ActivatedRoute,
    private elRef: ElementRef,
    private sharedService: SharedService,
  ) {}

  trackId = (_index: number, item: IGeoLocation): number => this.geoLocationService.getGeoLocationIdentifier(item);

  //Google API Key
  apiKey = 'AIzaSyCMnAV-EV9EBBKMdBQY3z-D6tpZRURWxeA';
  loader = new Loader({
    apiKey: this.apiKey,
    version: 'weekly',
    language: 'en',
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(async params => {
      this.userId = params.get('userId');
      if (this.userId) {
        await this.generateGraphs(this.userId);
      }
    });
  }

  async generateGraphs(userId: string) {
    this.http.get<IPatient[]>('/api/patients/userid/' + this.userId).subscribe((patientData: IPatient[]) => {
      this.patient = patientData[0];
      this.id = this.patient.id;
      this.userName = this.patient.nickname ? this.patient.nickname + ' ' : '';
      this.nameSelect = true;

      if (this.patient.home_latitude == null || undefined || NaN || this.patient.home_longitude == null || undefined || NaN) {
        this.homeLocation = [0, 0, 0];
        return;
      }

      //@ts-ignore
      this.homeLocation = [this.patient.home_latitude?.toFixed(5), this.patient.home_longitude?.toFixed(5), 50];
      this.isHomeLocationDefined = true;
    });

    this.http.get<IGeoLocation[]>('/api/geo-locations/userid/' + this.userId).subscribe(
      async (data: IGeoLocation[]) => {
        this.dataSelect = true;
        this.geoLocations = data;
        this.geoLocations
          .sort((a, b) => a.id - b.id)
          .map(item => {
            if (item.accuracy != null || item.accuracy != undefined) {
              if (item.accuracy >= 1000) {
                item.accuracy = 1000;
              } //@ts-ignore
              item.accuracy = parseFloat(item.accuracy).toFixed(5);
            }

            //@ts-ignore
            item.longitude = parseFloat(item.longitude).toFixed(5);
            //@ts-ignore
            item.latitude = parseFloat(item.latitude).toFixed(5);
            //@ts-ignore
            item.accuracy = parseFloat(item.accuracy).toFixed(0);
            return item;
          });

        const newDate = this.getNewDate();
        this.selectedMonth = newDate.month;
        this.selectedYear = newDate.year;
        this.newMonth = newDate.month;
        this.newYear = newDate.year;
        const mostRecentData = this.findMostRecentData(this.geoLocations);
        const mostRecentMonth = (mostRecentData.getMonth() + 1).toString().padStart(2, '0');
        this.amongLast12MonthsSelectedDuration = mostRecentData.getFullYear() + '-' + mostRecentMonth;
        this.amongLast12MonthsSelectedFrequency = mostRecentData.getFullYear() + '-' + mostRecentMonth;
        this.amongLast12MonthsSelectedLocationNumber = mostRecentData.getFullYear() + '-' + mostRecentMonth;
        this.amongMonthMapSelection = mostRecentData.getFullYear() + '-' + mostRecentMonth;

        const oldDate = this.getOldDate();
        this.oldMonth = oldDate.month;
        this.oldYear = oldDate.year;

        const cluster = this.dbscan(
          this.rankLocationsByOccurrence(
            this.convertData(this.filterDataByMonth(this.geoLocations, this.selectedYear, [this.selectedMonth])),
          ),
        );

        //@ts-ignore
        if (this.homeLocation.every((value, index) => value === [0, 0, 0][index])) {
          //Make sure that the Date is available and new at beginning
          this.homeLocation = [cluster[0].leader[0].location[0].toFixed(5), cluster[0].leader[0].location[1].toFixed(5), 50];
        }
        //Overview of user activities on map && 7 most frequent visited places
        const dataWithAttributes = this.addLocationAttributesToData(
          this.filterDataByMonth(this.geoLocations, this.selectedYear, [this.selectedMonth]),
          cluster,
          this.homeLocation,
        );
        const locationInfos = this.findLocationInfos(
          this.extractStayDetails(dataWithAttributes),
          this.homeLocation[0],
          this.homeLocation[1],
          this.homeLocation[2],
        );

        const Geo_Fence_data = this.getOutOfGeoFenceData(dataWithAttributes);

        await this.preprocessData(locationInfos);
        this.drawTable(locationInfos);
        this.drawMapVisualisation();

        //Daily fluctuations in the percentage of time spent at home
        const weekData = this.findWeekData(this.geoLocations);
        const weekCluster = this.dbscan(this.rankLocationsByOccurrence(this.convertData(weekData)));
        const weekGenerateList = this.getDateList(weekData)
          .map((i: any) => this.getDateFirstAndLastData(weekData, i))
          .flat(Infinity);
        const finalWeekData = weekData.concat(weekGenerateList);
        const weekDataInfo = this.addLocationAttributesToData(finalWeekData, weekCluster, this.homeLocation);
        const weekDateList = this.dataPerDate(weekDataInfo);

        //option 1
        const weekStayAtHomeList = this.getStayAtHomeHourList(weekDateList);
        const dailyFluctuationsData = this.getChartData(weekStayAtHomeList);

        //option 2
        const dailyDurationData = this.getDailyDurationByDistanceRangePerDate(weekDateList);
        const dailyFluctuationsData2 = dailyDurationData.map(item => ({
          date: item.day,
          hours: item.atHome * 24,
          hourPercentage: item.atHome,
        }));
        this.drawDailyFluctuation(dailyFluctuationsData2);
        this.dailyFluctuationsInsights = this.getDailyFluctuationsInsights(dailyFluctuationsData2);

        //Overview of Time Spent in Different Ranges (Last 7 Days)
        const weeklocationInfos = this.findLocationInfos(
          this.extractStayDetails(weekDataInfo),
          this.homeLocation[0],
          this.homeLocation[1],
          this.homeLocation[2],
        );

        const dailyDurationDataInWeek = this.getDailyDurationByDistanceRange(weeklocationInfos);

        const totalDuration = dailyDurationDataInWeek.reduce((sum, current) => sum + current.duration, 0);
        const dailyDurationOverviewData = dailyDurationDataInWeek.map(item => ({
          Range: item.range,
          Value: item.duration / totalDuration,
        }));

        this.createSvgDailyDurationByDistanceRangeOverview();
        this.drawBarsDailyDurationByDistanceRangeOverview(dailyDurationOverviewData);
        this.dailyDurationOverviewInsights = this.getDailyDurationOverviewInsights(dailyDurationOverviewData);

        //Time Spent in Different Ranges per Date (Last 7 Days)
        this.createSvgDailyDurationByDistanceRange();
        this.drawBarsDailyDurationByDistanceRange(dailyDurationData);
        this.dailyDurationInsights = this.getDailyDurationInsights(dailyDurationData);

        //Total Duration of visits by different distance range from home per Month
        const dataInLast12Months = this.findDataInLast12Months(this.geoLocations);
        const dataPerMonth = this.dataPerMonth(dataInLast12Months);
        const monthlyDurationData = this.getmonthlyDurationData(dataPerMonth);
        this.createSvgMonthlyDurationByDistanceRange();
        this.drawBarsMonthlyDurationByDistanceRange(monthlyDurationData);
        this.monthlyDurationInsights = this.getMonthlyDurationInsights(monthlyDurationData);

        //Frequency of visits by different distance range from home per Month
        const monthlyFrequencyData = this.getmonthlyFrequencyData(dataPerMonth);
        this.createSvgMonthlyFrequencyByDistanceRange();
        this.drawBarsMonthlyFrequencyByDistanceRange(monthlyFrequencyData);
        this.monthlyFrequencyInsights = this.getMonthlyFrequencyInsights(monthlyFrequencyData);

        //Location Number of visits by different distance range from home per Month
        const monthlyLocationNumberData = this.getmonthlyLocationNumberData(dataPerMonth);
        this.createSvgMonthlyLocationNumberByDistanceRange();
        this.drawBarsMonthlyLocationNumberByDistanceRange(monthlyLocationNumberData);
        this.monthlyLocationNumberInsights = this.getMonthlyLocationNumberInsights(monthlyLocationNumberData);

        //Frequency/duration/number of locations out of home comparison table
        const monthlyComparisonData = this.getMonthlyComparisonData(dataPerMonth);
        this.drawComparisonTable(monthlyComparisonData);
        this.getComparisonInsight(monthlyComparisonData);

        //Total Duration of visits by different distance range from home in specific month
        const dataWithAttributesPerDate = this.dataPerDate(dataWithAttributes);
        const dailyDurationDataInMonth = this.getDailyDurationDataInMonth(dataWithAttributesPerDate);
        this.createSvgSpecificMonthlyDurationByDistanceRange();
        this.drawBarsSpecificMonthlyDurationByDistanceRange(dailyDurationDataInMonth);
        this.specificMonthlyDurationInsights = this.getSpecificMonthlyDurationInsights(dailyDurationDataInMonth);

        //Frequency of visits by different distance range from home in specific month
        const dailyFrequencyDataInMonth = this.getDailyFrequencyDataInMonth(dataWithAttributesPerDate);
        this.createSvgSpecificMonthlyFrequencyByDistanceRange();
        this.drawBarsSpecificMonthlyFrequencyByDistanceRange(dailyFrequencyDataInMonth);
        this.specificMonthlyFrequencyInsights = this.getSpecificMonthlyFrequencyInsights(dailyFrequencyDataInMonth);

        //Location Number of visits by different distance range from home in specific month
        const dailyLocationNumberDataInMonth = this.getDailyLocationNumberDataInMonth(dataWithAttributesPerDate);
        this.createSvgSpecificMonthlyLocationNumberByDistanceRange();
        this.drawBarsSpecificMonthlyLocationNumberByDistanceRange(dailyLocationNumberDataInMonth);
        this.specificMonthlyLocationNumberInsights = this.getSpecificMonthlyLocationNumberInsights(dailyLocationNumberDataInMonth);

        const predefinedInsight = this.isHomeLocationDefined
          ? ``
          : `<p style="font-weight: bold; color: red;">Because user ${this.userId} doesn't have the home location information, we use the place that the user stayed for the most amount of time as the "home location".</p>
          <br>`;

        this.mapInsights = await this.getMapInsight(locationInfos);

        this.overallSummary +=
          '" ' +
          this.comparisonInsights +
          this.dailyDurationOverviewInsights +
          this.monthlyDurationInsights +
          this.monthlyFrequencyInsights +
          this.monthlyLocationNumberInsights +
          this.mapInsights +
          this.dailyFluctuationsInsights +
          this.dailyDurationInsights;

        //add info whether the home location is predefined or not
        const chatSummary = await generateSummary(
          '"' +
            this.overallSummary +
            '" Please create an HTML-formatted summary suitable for a doctor to review, focusing on four key areas based on the provided data on patient’s geographical acitvity. Structure the summary with individual subtitles for each section, ensuring subtitles are in a slightly larger font size than the regular text. Avoid using an overall title. Adhere to the following simplified guidelines:\n' +
            '\n' +
            '<p><b>Summary of Geographical Acticity within 7 days:</b><br/>Provide a concise summary of the patient’s current geographical acticity, including key statistics for the patient’s duration at home, duration out of home, frequency out of home by distances.</p>\n' +
            '<br/>\n' +
            '<p><b>Summary of Geographical Acticity in the past monthes:</b><br/>Provide a concise summary of the patient’s current geographical acticity, including key statistics for the patient’s duration at home, duration out of home, frequency out of home by distances, distance from home. Mention any significant deviations other month. </p>\n' +
            '<br/>\n' +
            '<p><b>Possible Reasons for Geographical Acticity:</b><br/>Offer a brief prediction of the reasons for patient’s moving pattern or possible activities based on the data</p>\n' +
            '<br/>\n' +
            '<p><b>Prediction of Future Health Trends:</b><br/>Offer a brief prediction of future moving trends based on the data trends observed over the past months.</p>\n' +
            '<br/>\n' +
            'Ensure each section is limited to one paragraph of at least 50 words and no more than 100 words. Use <br/> for separation and clarity.\n',
        );

        //add info whether the home location is predefined or not
        this.geoSummary = chatSummary == null ? predefinedInsight + 'Sorry, no summary available' : predefinedInsight + chatSummary;

        this.http.get<IPatient[]>('/api/patients/userid/' + this.userId).subscribe((data: IPatient[]) => {
          //get id in number
          this.sharedService.updateGeoSummary(data[0].id.toString(), this.geoSummary ?? '');
        });
      },
      error => {
        this.dataSelect = true;
        console.error('Error fetching geo location:', error);
      },
    );
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

  scrollToTop() {
    window.scrollTo(0, 0);
  }

  onMonthChangeDuration(event: Event): void {
    this.amongLast12MonthsSelectedDuration = (event.target as HTMLSelectElement).value;
    const selectedYear = parseInt(this.amongLast12MonthsSelectedDuration.split('-')[0], 10);
    const selectedMonth = parseInt(this.amongLast12MonthsSelectedDuration.split('-')[1], 10);

    const titleContainer = d3.select('#specificMonthlyDurationInsights');
    titleContainer.selectAll('*').remove();

    const specificMonthlyDurationData = this.filterDataByMonth(this.geoLocations, selectedYear, [selectedMonth]);
    if (specificMonthlyDurationData.length == 0) {
      this.specificMonthlyDurationInsights = 'Sorry. No data in ' + selectedYear + '-' + selectedMonth + '.';
      return;
    }

    const cluster = this.dbscan(this.rankLocationsByOccurrence(this.convertData(specificMonthlyDurationData)));

    const dataWithAttributes = this.addLocationAttributesToData(
      this.filterDataByMonth(this.geoLocations, selectedYear, [selectedMonth]),
      cluster,
      this.homeLocation,
    );

    const dataWithAttributesPerDate = this.dataPerDate(dataWithAttributes);
    const dailyDurationDataInMonth = this.getDailyDurationDataInMonth(dataWithAttributesPerDate);

    this.createSvgSpecificMonthlyDurationByDistanceRange();
    this.drawBarsSpecificMonthlyDurationByDistanceRange(dailyDurationDataInMonth);
    this.specificMonthlyDurationInsights = this.getSpecificMonthlyDurationInsights(dailyDurationDataInMonth);
  }

  onMonthChangeFrequency(event: Event): void {
    this.amongLast12MonthsSelectedFrequency = (event.target as HTMLSelectElement).value;
    const selectedYear = parseInt(this.amongLast12MonthsSelectedFrequency.split('-')[0], 10);
    const selectedMonth = parseInt(this.amongLast12MonthsSelectedFrequency.split('-')[1], 10);

    const titleContainer = d3.select('#specificMonthlyFrequencyInsights');
    titleContainer.selectAll('*').remove();

    const specificMonthlyFrequencyData = this.filterDataByMonth(this.geoLocations, selectedYear, [selectedMonth]);
    if (specificMonthlyFrequencyData.length == 0) {
      this.specificMonthlyFrequencyInsights = 'Sorry. No data in ' + selectedYear + '-' + selectedMonth + '.';
      return;
    }

    const cluster = this.dbscan(this.rankLocationsByOccurrence(this.convertData(specificMonthlyFrequencyData)));
    const dataWithAttributes = this.addLocationAttributesToData(
      this.filterDataByMonth(this.geoLocations, selectedYear, [selectedMonth]),
      cluster,
      this.homeLocation,
    );

    const dataWithAttributesPerDate = this.dataPerDate(dataWithAttributes);
    const dailyFrequencyDataInMonth = this.getDailyFrequencyDataInMonth(dataWithAttributesPerDate);
    this.createSvgSpecificMonthlyFrequencyByDistanceRange();
    this.drawBarsSpecificMonthlyFrequencyByDistanceRange(dailyFrequencyDataInMonth);
    this.specificMonthlyFrequencyInsights = this.getSpecificMonthlyFrequencyInsights(dailyFrequencyDataInMonth);
  }

  onMonthChangeLocationNumber(event: Event): void {
    this.amongLast12MonthsSelectedLocationNumber = (event.target as HTMLSelectElement).value;
    const selectedYear = parseInt(this.amongLast12MonthsSelectedLocationNumber.split('-')[0], 10);
    const selectedMonth = parseInt(this.amongLast12MonthsSelectedLocationNumber.split('-')[1], 10);

    const titleContainer = d3.select('#specificmonthlyLocationNumberInsights');
    titleContainer.selectAll('*').remove();

    const specificMonthlyLocationNumberData = this.filterDataByMonth(this.geoLocations, selectedYear, [selectedMonth]);
    if (specificMonthlyLocationNumberData.length == 0) {
      this.specificMonthlyLocationNumberInsights = 'Sorry. No data in ' + selectedYear + '-' + selectedMonth + '.';
      return;
    }
    const cluster = this.dbscan(this.rankLocationsByOccurrence(this.convertData(specificMonthlyLocationNumberData)));
    const dataWithAttributes = this.addLocationAttributesToData(
      this.filterDataByMonth(this.geoLocations, selectedYear, [selectedMonth]),
      cluster,
      this.homeLocation,
    );

    const dataWithAttributesPerDate = this.dataPerDate(dataWithAttributes);
    const dailyLocationNumberDataInMonth = this.getDailyLocationNumberDataInMonth(dataWithAttributesPerDate);
    this.createSvgSpecificMonthlyLocationNumberByDistanceRange();
    this.drawBarsSpecificMonthlyLocationNumberByDistanceRange(dailyLocationNumberDataInMonth);
    this.specificMonthlyLocationNumberInsights = this.getSpecificMonthlyLocationNumberInsights(dailyLocationNumberDataInMonth);
  }

  async onMonthMapNumber(event: Event) {
    this.amongMonthMapSelection = (event.target as HTMLSelectElement).value;
    const selectedYear = parseInt(this.amongMonthMapSelection.split('-')[0], 10);
    const selectedMonth = parseInt(this.amongMonthMapSelection.split('-')[1], 10);

    const titleContainer = d3.select('#mapContainer');
    titleContainer.selectAll('*').remove();

    const tableContainer = d3.select('#tableContainer');
    tableContainer.selectAll('*').remove();

    this.mapInsights = 'Generating insight...';

    const specificMonthMapData = this.filterDataByMonth(this.geoLocations, selectedYear, [selectedMonth]);
    if (specificMonthMapData.length == 0) {
      this.mapInsights = 'Sorry. No data in ' + selectedYear + '-' + selectedMonth + '.';
      return;
    }
    const cluster = this.dbscan(
      this.rankLocationsByOccurrence(this.convertData(this.filterDataByMonth(this.geoLocations, selectedYear, [selectedMonth]))),
    );
    const dataWithAttributes = this.addLocationAttributesToData(
      this.filterDataByMonth(this.geoLocations, selectedYear, [selectedMonth]),
      cluster,
      this.homeLocation,
    );
    const locationInfos = this.findLocationInfos(
      this.extractStayDetails(dataWithAttributes),
      this.homeLocation[0],
      this.homeLocation[1],
      this.homeLocation[2],
    );
    const Geo_Fence_data = this.getOutOfGeoFenceData(dataWithAttributes);
    await this.preprocessData(locationInfos);
    this.drawTable(locationInfos);
    this.drawMapVisualisation();
    this.mapInsights = await this.getMapInsight(locationInfos);
  }

  // -----------------------Find the new && old month && year, used for loading the page, need an available month-----------------------
  protected getNewDate() {
    //@ts-ignore
    const dateObjects = this.geoLocations.map(item => new Date(item.recorded_at));
    const mostRecentDate = new Date(Math.max(...dateObjects.map(date => date.getTime())));

    // Extract month and year from the most recent Date
    const mostRecentMonth = mostRecentDate.getMonth() + 1; // Months are 0-indexed, so add 1
    const mostRecentYear = mostRecentDate.getFullYear();

    return {
      month: mostRecentMonth,
      year: mostRecentYear,
    };
  }

  protected getOldDate() {
    //@ts-ignore
    const dateObjects = this.geoLocations.map(item => new Date(item.recorded_at));
    const oldDate = new Date(Math.min(...dateObjects.map(date => date.getTime())));

    // Extract month and year from the most recent Date
    const oldMonth = oldDate.getMonth() + 1; // Months are 0-indexed, so add 1
    const oldYear = oldDate.getFullYear();

    return {
      month: oldMonth,
      year: oldYear,
    };
  }

  // ---------------------------------------------------------------------Comparison Tabel---------------------------------------------------------------------
  /**
   * Draws a comparison table based on monthly comparison data.
   * @param monthlyComparisonData The monthly comparison data to be displayed.
   */
  protected drawComparisonTable(monthlyComparisonData: any): void {
    const table = Inputs.table(monthlyComparisonData, {
      rows: 10, // adjusting the number of rows displayed
      width: {
        month: 150,
        durationAtHome: 300,
        durationOutOfHome: 300,
        frequencyOutOfHome: 300,
        maxDistance: 300,
      },
      align: {
        month: 'center',
        durationAtHome: 'center',
        durationOutOfHome: 'center',
        frequencyOutOfHome: 'center',
        maxDistance: 'center',
      },
      format: {
        durationAtHome: (durationAtHome: any) => this.targetAverageVk(durationAtHome),
        durationOutOfHome: (durationOutOfHome: any) => this.targetAverageVk(durationOutOfHome),
        frequencyOutOfHome: (frequencyOutOfHome: any) => this.targetAverageVk(frequencyOutOfHome),
        maxDistance: (maxDistance: any) => this.targetAverageVk(maxDistance),
      },
    });

    const tableHeaders = table.querySelectorAll('th');
    tableHeaders[1].textContent = 'Month';
    tableHeaders[2].textContent = 'Duration at Home';
    tableHeaders[3].textContent = 'Duration out of Home';
    tableHeaders[4].textContent = 'Frequency out of Home';
    tableHeaders[5].textContent = 'Max Distance from Home';

    const container = document.querySelector('figure#comparisonTable');
    const title = document.createElement('h1');
    title.textContent = `Comparison of monthly value with the average value of user's available data`;
    title.style.textAlign = 'center';
    title.style.fontSize = '20px';
    title.style.fontWeight = 'bold';
    container?.prepend(title);
    container?.append(table);
  }

  /**
   * Converts a value to a target average visual representation.
   * @param value The value to be converted.
   * @returns The visual representation of the value.
   */
  //@ts-ignore
  protected targetAverageVk(value) {
    const width = 600;
    const height = 100;
    const marginTop = 5;
    const marginRight = 5;
    const marginBottom = 5;
    const marginLeft = 5;

    const svg = d3
      .create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width + marginRight + marginLeft, height + marginTop + marginBottom])
      .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // Right side scales
    const xScale_right = d3
      .scaleLinear()
      .range([0, width - marginLeft - marginRight])
      .domain([-100, 100]); // Adjust the domain range for percentage values (-100 to 100)

    // Add vertical line at 0%
    svg
      .append('line')
      .attr('class', 'line-zero')
      .attr('x1', marginLeft + xScale_right(0))
      .attr('x2', marginLeft + xScale_right(0))
      .attr('y1', marginTop)
      .attr('y2', height - marginBottom)
      .attr('stroke', 'gray')
      .attr('stroke-width', '2')
      .attr('stroke-dasharray', '4');

    // Calculate the percentage value
    const percentageValue = value * 100;

    // Add horizontal bar chart (value)
    svg
      .append('rect')
      .attr('class', 'bar-value')
      .attr('y', (height - marginTop - marginBottom) / 2 - (height - marginTop - marginBottom) / 4)
      .attr('x', percentageValue >= 0 ? marginLeft + xScale_right(0) : marginLeft + xScale_right(percentageValue))
      .attr('height', (height - marginTop - marginBottom) / 2)
      .attr('width', Math.abs(xScale_right(percentageValue) - xScale_right(0)))
      .style('fill', percentageValue >= 0 ? '#9c7aac' : '#ff5733');

    // Add text labels for value
    svg
      .append('text')
      .attr('class', 'label-value')
      .attr('y', (height - marginTop - marginBottom) / 2)
      .attr('x', percentageValue >= 0 ? marginLeft + xScale_right(0) + 5 : marginLeft + xScale_right(0) - 5) // Adjusted x-coordinate calculation
      .attr('dy', '0.35em')
      .attr('text-anchor', percentageValue >= 0 ? 'start' : 'end') // Adjusted text-anchor
      .style('fill', 'black') // Changed text color for negative values
      .style('font-size', '24px') // Increased font size for negative values
      .style('font-weight', 'bold') // Set font weight to bold
      .text(`${percentageValue.toFixed(0)}%`);

    return svg.node();
  }

  /**
   * Generates comparison insights based on monthly comparison data.
   * @param monthlyComparisonData The monthly comparison data.
   */
  protected getComparisonInsight(monthlyComparisonData: any[]) {
    let sentence = ``;

    monthlyComparisonData.forEach(data => {
      let summary = '';
      let isActive = 0;

      let duration = (data.durationAtHome * 100).toFixed(0);
      // Duration at home comparison
      //@ts-ignore
      if (duration > 0) {
        summary += `spent every day ${duration}% more time at home; `;
      } //@ts-ignore
      else if (duration < 0) {
        summary += `spent every day ${-duration}% less time at home; `;
      } else {
        summary += `spent approximately the same amount of time at home as usual; `;
      }

      let frequency = (data.frequencyOutOfHome * 100).toFixed(0);
      // Frequency out of home comparison
      //@ts-ignore
      if (frequency > 0) {
        summary += `went out every day ${frequency}% more frequently than usual; `;
      } //@ts-ignore
      else if (frequency < 0) {
        summary += `went out every day ${-frequency}% less frequently than usual; `;
      } else {
        summary += `went out as frequently as usual; `;
      }

      let distance = (data.maxDistance * 100).toFixed(0);
      // Max distance comparison
      //@ts-ignore
      if (distance > 0) {
        summary += `went ${distance}% farther away than usual. `;
      } //@ts-ignore
      else if (distance < 0) {
        summary += `went ${-distance}% closer than usual. `;
      } else {
        summary += `went to locations the same distance away as usual. `;
      }

      isActive = parseInt(distance) / 2 - parseInt(duration) + parseInt(frequency) + parseInt((data.durationOutOfHome * 100).toFixed(0));

      let activitySummary = '';
      if (isActive <= 100 && isActive >= -100) {
        activitySummary = `the user's activity level was normal for this month.`;
      }
      if (isActive > 100 && isActive <= 300) {
        activitySummary = `the user was fairly active this month, suggesting they may have been on a trip, visiting friends, or engaging in recreational activities.`;
      }
      if (isActive < -100 && isActive >= -300) {
        activitySummary = `the user was less active this month, suggesting they may have been mentally or physically unwell, experiencing stress, or facing personal challenges.`;
      }
      if (isActive < -300) {
        activitySummary = `the user was extremely inactive this month, except for possible technical issues with the activity tracking devices, indicating they may have been seriously ill, experiencing depression, or facing significant life difficulties.`;
      }
      if (isActive > 300) {
        activitySummary = `the user was quite active this month, except for possible technical issues with the activity tracking devices, suggesting they may have been on a trip, engaging in regular exercise, or participating in social events.`;
      }

      sentence += `<li>In <strong>${data.month}</strong>, <strong>${activitySummary}</strong> The user ${summary}</li><br>`;
    });

    this.comparisonInsights = sentence;
  }

  /**
   * Retrieves monthly comparison data.
   * @param dataPerMonth Data per month.
   * @returns Formatted monthly comparison data.
   */
  protected getMonthlyComparisonData(dataPerMonth: any[]) {
    const categories: {
      month: string;
      durationAtHome: number;
      durationOutOfHome: number;
      frequencyOutOfHome: number;
      maxDistance: number;
    }[] = [];
    let count = 0;

    Object.keys(dataPerMonth).forEach(yearMonth => {
      count++;
      categories.push({
        month: yearMonth,
        durationAtHome: 0,
        durationOutOfHome: 0,
        frequencyOutOfHome: 0,
        maxDistance: 0,
      });

      //@ts-ignore
      const eachMonth = dataPerMonth[yearMonth];

      const cluster = this.dbscan(this.rankLocationsByOccurrence(this.convertData(eachMonth)));
      const dataWithAttributes = this.addLocationAttributesToData(eachMonth, cluster, this.homeLocation);
      const locationInfos = this.findLocationInfos(
        this.extractStayDetails(dataWithAttributes),
        this.homeLocation[0],
        this.homeLocation[1],
        this.homeLocation[2],
      );
      const dailyDurationData = this.getDailyDurationByDistanceRange(locationInfos);
      const maxDistanceFromHome = this.getMaxDistanceFromHome(locationInfos);

      const durationAtHome = dailyDurationData[0].duration;
      const durationOutOfHome = dailyDurationData[1].duration + dailyDurationData[2].duration + dailyDurationData[3].duration;
      const hoursInMonth = 24 * this.getDaysInMonth(parseInt(yearMonth.split('-')[1], 10), parseInt(yearMonth.split('-')[0], 10));
      categories[categories.length - 1].durationAtHome = hoursInMonth * (durationAtHome / (durationOutOfHome + durationAtHome));
      this.userAverageValue.durationAtHome += categories[categories.length - 1].durationAtHome;

      categories[categories.length - 1].durationOutOfHome = hoursInMonth * (durationOutOfHome / (durationOutOfHome + durationAtHome));
      this.userAverageValue.durationOutOfHome += categories[categories.length - 1].durationOutOfHome;
      categories[categories.length - 1].frequencyOutOfHome =
        dailyDurationData[1].visits + dailyDurationData[2].visits + dailyDurationData[3].visits;
      this.userAverageValue.frequencyOutOfHome += categories[categories.length - 1].frequencyOutOfHome;

      categories[categories.length - 1].maxDistance = maxDistanceFromHome;
      this.userAverageValue.maxDistance += categories[categories.length - 1].maxDistance;
    });

    this.userAverageValue.durationAtHome /= count;
    this.userAverageValue.durationOutOfHome /= count;
    this.userAverageValue.frequencyOutOfHome /= count;
    this.userAverageValue.maxDistance /= count;

    const formattedCategories = categories.map(item => {
      const year = parseInt(item.month.split('-')[0], 10);
      const month = parseInt(item.month.split('-')[1], 10) - 1; // Months are 0-indexed

      return {
        month: item.month,
        durationAtHome: (-this.userAverageValue.durationAtHome + item.durationAtHome) / this.userAverageValue.durationAtHome,
        durationOutOfHome: (-this.userAverageValue.durationOutOfHome + item.durationOutOfHome) / this.userAverageValue.durationOutOfHome,
        frequencyOutOfHome:
          (-this.userAverageValue.frequencyOutOfHome + item.frequencyOutOfHome) / this.userAverageValue.frequencyOutOfHome,
        maxDistance: (-this.userAverageValue.maxDistance + item.maxDistance) / this.userAverageValue.maxDistance,
      };
    });

    return formattedCategories;
  }

  /**
   * Retrieves the maximum distance from home.
   * @param array Array of location data.
   * @returns The maximum distance from home.
   */
  //@ts-ignore
  protected getMaxDistanceFromHome(array) {
    if (array.length === 0) {
      return 0;
    }

    let max = array[0].home_distance;

    for (let i = 1; i < array.length; i++) {
      if (array[i].home_distance > max) {
        max = array[i].home_distance;
      }
    }

    return max;
  }

  /**
   * Retrieves the number of days in a given month and year.
   * @param month The month (0-indexed).
   * @param year The year.
   * @returns The number of days in the specified month.
   */
  //@ts-ignore
  protected getDaysInMonth(month, year) {
    // Months are 0-indexed in JavaScript, so subtract 1 from the provided month
    const lastDay = new Date(year, month, 0).getDate();
    return lastDay;
  }

  // ---------------------------------------------------------------------Map overview && Top 5 table---------------------------------------------------------------------

  /**
   * Performs reverse geocoding to retrieve address and character information based on latitude and longitude.
   * @param {number} lat - Latitude.
   * @param {number} lon - Longitude.
   * @returns {Promise<{ address: string; character: string }>} - Object containing address and character information.
   */
  protected async reverseGeocode(lat: number, lon: number): Promise<{ address: string; character: string }> {
    const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1&namedetails=1&zoom=18&layer=address`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'YourAppName', // Add a valid User-Agent header
          'Accept-Language': 'en-US', // Set the desired language to English
        },
      });
      const data = await response.json();

      if (data && data.address) {
        let result: {
          address: string;
          character: string;
        } = {
          address: '',
          character: '',
        };

        // Construct address string
        if (data.address.house_number) {
          result.address += data.address.house_number + ', ';
        }
        if (data.address.road) {
          result.address += data.address.road + ', ';
        }
        if (data.address.city) {
          result.address += data.address.city + ', ';
        }
        if (data.address.postcode) {
          result.address += data.address.postcode + ', ';
        }
        if (data.address.country) {
          result.address += data.address.country;
        }

        // Assign character based on data type
        if (data.type === 'hospital') {
          result.character += 'hospital';
        } else if (data.type === 'hotel') {
          result.character += 'hotel';
        } else if (['house', 'apartment', 'residential', 'apartments'].includes(data.type)) {
          result.character += 'residential';
        } else if (['office', 'company'].includes(data.type)) {
          result.character += 'office, company';
        } else if (data.type === 'restaurant') {
          result.character += 'restaurant';
        } else {
          result.character += 'undefined';
        }

        // Check if address and character information are valid
        if (result.character.trim() !== '' && result.address.trim() !== '') {
          return result;
        } else {
          return {
            address: 'Incomplete address information',
            character: 'Incomplete address information',
          };
        }
      } else {
        return {
          address: 'Address not available',
          character: 'unavailable',
        };
      }
    } catch (error) {
      console.error('Error during reverse geocoding:', error);
      return {
        address: 'Reverse geocoding failed',
        character: 'unavailable',
      };
    }
  }

  //@ts-ignore
  /**
   * Preprocesses location data by reverse geocoding and merging locations with the same address.
   * @param {Array} locationInfos - Array of location information.
   */
  protected async preprocessData(locationInfos: any): Promise<void> {
    //@ts-ignore
    const rankedLocations = locationInfos.sort((a, b) => b.duration - a.duration);

    // Reverse geocode all the locations
    const geocodedLocations = await Promise.all(
      //@ts-ignore
      rankedLocations.map(async location => {
        const addressAndCharacter = await this.reverseGeocode(location.latitude, location.longitude);
        return { ...location, ...addressAndCharacter };
      }),
    );

    // Merge locations with the same address
    const mergedLocations = {};
    geocodedLocations.forEach(location => {
      const address = location.address;
      //@ts-ignore
      if (!mergedLocations[address]) {
        //@ts-ignore
        mergedLocations[address] = { ...location, frequency: 0, duration: 0 };
      }
      //@ts-ignore
      mergedLocations[address].frequency += location.frequency;
      //@ts-ignore
      mergedLocations[address].duration += location.duration;
    });

    // Convert merged locations object to array
    this.mergedLocationsArray = Object.values(mergedLocations);
  }

  //@ts-ignore
  /**
   * Draws a table to display top 5 locations by user staying duration.
   * @param {Array} locationInfos - Array of location information.
   */
  protected async drawTable(locationInfos: any): Promise<void> {
    const top5Locations = this.mergedLocationsArray.slice(0, 5);

    // Select the container where you want to append the table
    const tableContainer = d3.select('#tableContainer');

    tableContainer
      .append('h2')
      .text('Top 5 Locations by user staying duration')
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .style('text-align', 'center');

    // Create the table structure
    const table = tableContainer.append('table').attr('class', 'table');

    // Create the table header
    const thead = table.append('thead');
    thead
      .append('tr')
      .selectAll('th')
      .data(['Location ID', 'Address', 'Character', 'Inside of GeoFence', 'Duration  (hours/day)'])
      .enter()
      .append('th')
      .text(column => column);

    // Create the table rows
    const tbody = table.append('tbody');

    // Append rows to the table
    top5Locations.forEach((location, i) => {
      const row = tbody.append('tr');
      row
        .selectAll('td')
        .data([
          //@ts-ignore
          this.convertToAlphabet(i + 1), // A, B, C ....
          //@ts-ignore
          location.address,
          //@ts-ignore
          location.character,
          //@ts-ignore
          location.home_distance <= 100, // Assuming home_distance represents distance
          //@ts-ignore
          (location.duration / this.getDaysInMonth(this.selectedYear, this.selectedMonth - 1)).toFixed(1),
        ])
        .enter()
        .append('td')
        .text(column => column);
    });
  }

  //@ts-ignore
  /**
   * Converts numerical index to alphabet.
   * @param {number} index - Index to be converted.
   * @returns {string} - Alphabet corresponding to the index.
   */
  protected convertToAlphabet(index: number): string {
    const alphabetIndex = index - 1;
    const alphabet = String.fromCharCode('A'.charCodeAt(0) + alphabetIndex);
    return alphabet;
  }

  /**
   * Retrieves insights about user locations and activities.
   * @param {Array} locationInfos - Array of location information.
   * @returns {Promise<string>} - Final insight about user activities.
   */
  protected async getMapInsight(locationInfos: any): Promise<string> {
    // Initialize variables
    const characterDurationMap = {}; // Map to store the duration of places with the same character
    let insideOfGeo = 0;
    let third = '';

    // Count the number of locations within 100 meters of home
    for (const d of this.mergedLocationsArray) {
      // @ts-ignore
      if (d.home_distance <= 100) {
        insideOfGeo++;
      }
      // Update characterDurationMap
      // @ts-ignore
      if (d.character !== 'undefined' && d.character !== 'residential') {
        // @ts-ignore
        characterDurationMap[d.character] = (characterDurationMap[d.character] || 0) + d.duration;
      }
    }

    // Calculate average daily time spent at each character place
    const days = this.getDaysInMonth(this.selectedYear, this.selectedMonth - 1);
    for (const character in characterDurationMap) {
      // @ts-ignore
      third += `<br> <li> The user spent everyday ${((characterDurationMap[character] / days) * 60).toFixed(0)} minute(s) at ${character}.`;
    }

    // Check if any location is far away
    // @ts-ignore
    const isFarAway = locationInfos.some(locations => locations.home_distance > 100000000);

    // Generate first insight based on user's primary location
    const first =
      // @ts-ignore
      this.mergedLocationsArray[0].home_distance === 0 && this.mergedLocationsArray[0] != null && this.mergedLocationsArray[0] != undefined
        ? `In this month (${this.amongMonthMapSelection}): <br> <li> The user ${
            this.userId
            // @ts-ignore
          } spent the most time at home, totaling everyday ${(this.mergedLocationsArray[0].duration / days).toFixed(0)} hour(s).`
        : `In this month (${this.amongMonthMapSelection}): <br> <li> The user ${
            this.userId
            // @ts-ignore
          } spent the most time elsewhere. The user spent ${(this.mergedLocationsArray[0].duration / days).toFixed(0)} hour(s) at ${
            // @ts-ignore
            this.mergedLocationsArray[0].address
            // @ts-ignore
          }, which is characterized as ${this.mergedLocationsArray[0].character}.`;

    // Generate second insight based on the number of visited places
    const length = this.mergedLocationsArray.length;
    const second =
      length <= 4
        ? `<br> <li> The user didn't visit many places, only ${length} in total.`
        : `<br> <li> The user visited ${length} different places.`;

    // Generate fourth insight about locations outside the geofence
    const fourth = `<br> <li> The user went ${insideOfGeo} location(s) out of the geo fence this month.`;

    // Find the farthest location from home
    // @ts-ignore
    const farestPlace = locationInfos.sort((a, b) => b.home_distance - a.home_distance)[0];
    const reverseGeocodeResult = await this.reverseGeocode(farestPlace.latitude, farestPlace.longitude);

    const fifth = isFarAway
      ? `<br> <li> The user ventured far from home, with the farthest distance being ${(farestPlace.home_distance / 1000).toFixed(
          0,
        )} km, which is characterized as ${reverseGeocodeResult.character} in ${reverseGeocodeResult.address}.`
      : `<br> <li> The user did not venture far from home, with the farthest distance being ${(farestPlace.home_distance / 1000).toFixed(
          0,
        )} km, which is characterized as ${reverseGeocodeResult.character} in ${reverseGeocodeResult.address}.`;

    // Generate final insight based on whether user ventured far from home
    const finalInsight = `${first} ${second} ${third} ${fourth} ${fifth}`;

    return finalInsight;
  }

  //@ts-ignore
  /**
   * Draws a map visualization showing all locations.
   */
  protected async drawMapVisualisation(): Promise<void> {
    const tableContainer = d3.select('#mapContainer');

    tableContainer
      .append('h2')
      .text('Overview of all locations on the map')
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .style('text-align', 'center');

    this.loader
      .load()
      .then(async () => {
        // Import the required components from the Google Maps library
        const { Map, InfoWindow } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary;

        const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
        //@ts-ignore
        const coordinates = new google.maps.LatLng(this.homeLocation[0], this.homeLocation[1]);
        try {
          // Create a new Google Map instance
          const map = new Map(document.getElementById('map') as HTMLElement, {
            center: coordinates,
            zoom: 8,
            mapId: 'c84fa443e5f4b8cf',
          });

          new google.maps.Marker({
            //@ts-ignore
            position: new google.maps.LatLng(this.homeLocation[0], this.homeLocation[1]),
            map: map,
          });

          const labels = 'ABCDEFG';

          const infoWindow = new google.maps.InfoWindow({
            content: '',
            disableAutoPan: true,
          });

          //@ts-ignore
          const markers = this.mergedLocationsArray.map((position, i) => {
            let label: any;
            if (i > 7) {
              label = ' ';
            } else {
              label = labels[i];
            }
            const pinGlyph = new google.maps.marker.PinElement({
              glyph: label,
              glyphColor: 'white',
            });
            const marker = new google.maps.marker.AdvancedMarkerElement({
              //@ts-ignore
              position: new google.maps.LatLng(position.latitude, position.longitude),
              content: pinGlyph.element,
            });

            // markers can only be keyboard focusable when they have click listeners
            // open info window when marker is clicked
            marker.addListener('click', () => {
              //@ts-ignore
              infoWindow.setContent(position.latitude + ', ' + position.latitude);
              infoWindow.open(map, marker);
            });
            return marker;
          });
          const clusterMarker = new MarkerClusterer({ map, markers });
          const cityCircle = new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.9,
            strokeWeight: 1,
            fillColor: '#FF0000',
            fillOpacity: 0.9,
            map,
            //@ts-ignore
            center: new google.maps.LatLng(this.homeLocation[0], this.homeLocation[1]),
            radius: 100,
          });

          // Your existing code for creating markers, polyline, circle, etc.
        } catch (error) {
          console.error('Error creating Google Map:', error);
        }
      })
      //@ts-ignore
      .catch(error => {
        console.error('Error loading Google Maps library:', error);
      });
  }

  // ---------------------------------------------------------------------
  /**
   * Find location information based on user history.
   * @param history The user's location history.
   * @param homeLat The latitude of the home location.
   * @param homeLong The longitude of the home location.
   * @param homeRadius The radius of the home location.
   * @returns An array of filtered and modified location objects.
   */
  //@ts-ignore
  protected findLocationInfos(history, homeLat, homeLong, homeRadius) {
    const locationStats = {};
    //@ts-ignore
    history.forEach(item => {
      const key = `${item.latitude},${item.longitude}`;
      //@ts-ignore
      if (!locationStats[key]) {
        //@ts-ignore
        locationStats[key] = {
          user_id: item.user_id,
          latitude: item.latitude,
          longitude: item.longitude,
          radius: item.radius,
          frequency: 0,
          duration: 0,
        };
      }
      //@ts-ignore
      locationStats[key].frequency += 1;
      //@ts-ignore
      locationStats[key].duration += item.duration;
    });

    //@ts-ignore
    const sortedLocations = Object.values(locationStats).sort((a, b) => b.frequency - a.frequency);

    const filteredAndModifiedLocations = sortedLocations
      .map((location, index) => {
        // @ts-ignore
        const homeDistance = this.haversine(location.latitude, location.longitude, homeLat, homeLong);

        return {
          // @ts-ignore
          ...location,
          location: (index + 1).toString(),
          home_distance: homeDistance,
        };
      })
      .filter(location => location.duration >= 0.5);

    return filteredAndModifiedLocations;
  }

  /**
   * Get the data points outside and inside the geofence.
   * @param data The data points with geofence status.
   * @returns An object containing arrays of outside and inside data points.
   */
  //@ts-ignore
  protected getOutOfGeoFenceData(data) {
    let outside = [];
    let inside = [];

    for (const item of data) {
      const status = item.geo_fence_status ? item.geo_fence_status.trim() : '';

      if (status === 'IN') {
        inside.push([item.longitude, item.latitude]);
      } else if (status === 'OUT') {
        outside.push([item.longitude, item.latitude]);
      } else if (status === 'GEOFENCE_DISABLED') {
        continue;
      }
    }

    return {
      outside: outside,
      inside: inside,
    };
  }

  //@ts-ignore
  /**
   * Extract leader locations from clusters.
   * @param clusters The clusters containing leader information.
   * @returns An array of leader locations.
   */
  //@ts-ignore
  protected extract(clusters) {
    //@ts-ignore
    const leaderLocations = [];
    //@ts-ignore
    clusters.forEach(cluster => {
      // Check if there is a leader in the cluster

      const leader = cluster.leader[0]; // Assuming there is only one leader

      // Extract latitude and longitude
      const latitude = leader.location[0];
      const longitude = leader.location[1];

      // Push the pair to the leaderLocations array
      leaderLocations.push({ latitude, longitude });
    });
    //@ts-ignore
    return leaderLocations;
  }

  //@ts-ignore
  /**
   * Calculate the duration between two timestamps.
   * @param start The start timestamp.
   * @param end The end timestamp.
   * @returns The duration in hours.
   */
  //@ts-ignore
  protected calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    //@ts-ignore
    return (endDate - startDate) / 1000 / 60 / 60; // Duration in hours
  }

  /**
   * Extract stay details from user location data.
   * @param data The user location data.
   * @returns An array of objects representing user stays.
   */
  //@ts-ignore
  protected extractStayDetails(data) {
    const userLocations = [];
    let currentLocation = null;
    let currentStart = null;

    //@ts-ignore
    data.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));

    for (const item of data) {
      if (
        !currentLocation ||
        currentLocation.latitude !== item.belong_to_location_lat ||
        currentLocation.longitude !== item.belong_to_location_long ||
        currentLocation.radius !== item.belong_to_location_radius
      ) {
        if (currentLocation && currentStart) {
          currentLocation.endTime = item.recorded_at;
          currentLocation.duration = this.calculateDuration(currentStart, item.recorded_at);
          userLocations.push(currentLocation);
        }

        currentLocation = {
          user_id: item.user_id,
          latitude: item.belong_to_location_lat,
          longitude: item.belong_to_location_long,
          radius: item.belong_to_location_radius,
          startTime: item.recorded_at,
          endTime: '',
          duration: 0,
        };
        currentStart = item.recorded_at;
      }
    }

    // Add the last location if exists
    if (currentLocation && currentStart) {
      currentLocation.endTime = data[data.length - 1].recorded_at;
      currentLocation.duration = this.calculateDuration(currentStart, data[data.length - 1].recorded_at);
      userLocations.push(currentLocation);
    }

    return userLocations;
  }

  //---------Daily fluctuations in the percentage of time spent at home---------
  protected drawDailyFluctuation(data: { date: string; hours: unknown; hourPercentage: number }[]) {
    const plot = Plot.plot({
      width: 760,
      height: 500,
      marginTop: 30,
      marginRight: 30,
      marginBottom: 50,
      marginLeft: 50,

      y: {
        label: 'Home Percentage (%)',
        domain: [0.4, 1],
        tickFormat: d3.format('.0%'),
      },
      x: {
        label: 'Date',
      },

      marks: [
        Plot.lineY(data, {
          x: 'date',
          y: 'hourPercentage',
          stroke: '#65a7ff',
          tip: true,
        }),
        Plot.text(data, { x: 'date', y: 'hourPercentage', text: d => `${(d.hourPercentage * 100).toFixed(0)}%`, dy: -8, fill: 'black' }),
        Plot.ruleY([data.reduce((acc: any, d: any) => acc + d.hourPercentage, 0) / data.length], {
          stroke: 'red',
          strokeDasharray: '4,4',
        }),
      ],
    });
    const container = document.querySelector('figure#dailyFluctuation');
    // add title
    const title = document.createElement('h1');
    title.textContent = 'Time Spent at Home (Last 7 Days)';
    title.style.textAlign = 'center';
    title.style.fontSize = '20px';
    title.style.fontWeight = 'bold';
    container?.prepend(title);
    container?.append(plot);
  }

  protected getDailyFluctuationsInsights(data: { date: string; hours: unknown; hourPercentage: number }[]) {
    const average = data.reduce((acc: any, d: any) => acc + d.hourPercentage, 0) / data.length;
    let result = [`The average percentage of time spent at home is ${(average * 100).toFixed(0)}%.<br>`];
    let totalAtHomeDate = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i].hourPercentage.toFixed(2) < average.toFixed(2)) {
        result.push(
          `<li>The percentage of time spent at home on ${data[i].date} is ${(data[i].hourPercentage * 100).toFixed(
            0,
          )}%, which is below average. `,
        );
      }
      if (data[i].hourPercentage == 1) {
        totalAtHomeDate.push(data[i].date);
      }
    }
    result.push(`<li>The user spent the whole day at home on ${totalAtHomeDate.join(', ')}. `);
    return result.join('\n');
  }

  //---------Overview of Time Spent in Different Ranges (Last 7 Days)---------
  protected createSvgDailyDurationByDistanceRangeOverview(): void {
    this.svg = d3
      .select('figure#pieChart')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2 - 100)
      .append('g')
      // .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
      .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

    this.renderSelect = true;
  }

  protected drawBarsDailyDurationByDistanceRangeOverview(data: { Range: string; Value: number }[]): void {
    const colors = d3
      .scaleOrdinal()
      .domain(data.map(d => d.Value.toString()))
      .range(['#bde1b4', '#f5ed5e', '#f3b563', '#f39595']);

    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    // Compute the position of each group on the pie:
    const pie = d3.pie<any>().value((d: any) => Number(d.Value));

    // Build the pie chart
    this.svg
      .selectAll('pieces')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', d3.arc().innerRadius(0).outerRadius(radius))
      //@ts-ignore
      // .attr('fill', (d, i) => colors(i))
      .attr('fill', d => colors(d.data.Value.toString()))
      .attr('stroke', '#121926')
      .style('stroke-width', '1px');

    // Add labels
    const labelLocation = d3.arc().innerRadius(100).outerRadius(radius);

    this.svg
      .selectAll('pieces')
      .data(pie(data))
      .enter()
      .append('text')
      .text((d: any) => {
        if ((d.data.Value * 100).toFixed(0) === '0') {
          return '';
        } else {
          return (d.data.Value * 100).toFixed(0) + '%';
        }
      })
      .attr('transform', (d: any) => 'translate(' + labelLocation.centroid(d) + ')')
      .style('text-anchor', 'middle')
      .style('font-weight', '14')
      .style('font-size', 15);

    // Add a centered title
    this.svg
      .append('text')
      .attr('x', 0)
      .attr('y', -183)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Overview of Time Spent in Different Ranges (Last 7 Days)');

    const legend = this.svg.append('g').attr('transform', 'translate(' + (width - 100) + ', -50)');

    const legendData = [
      { color: '#bde1b4', label: 'At Home' },
      { color: '#f5ed5e', label: '<1km' },
      { color: '#f3b563', label: '<5km' },
      { color: '#f39595', label: '>5km' },
    ];

    legend
      .selectAll('rect')
      .data(legendData)
      .join('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', (_: any, i: any) => i * 20)
      .attr('fill', (d: any) => d.color);

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 15)
      .attr('y', (_: any, i: any) => i * 20 + 8)
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected getDailyDurationOverviewInsights(data: { Range: string; Value: number }[]) {
    const atHome = data.find(item => item.Range === 'At Home')?.Value ?? 0;
    return `The user ${this.userId} spent ${(atHome * 100).toFixed(0)}% of the time at home, and ${(100 - atHome * 100).toFixed(
      2,
    )}% outside in the last 7 days.`;
  }

  //---------Time Spent in Different Ranges per Date (Last 7 Days)---------
  protected createSvgDailyDurationByDistanceRange(): void {
    this.svg = d3
      .select('figure#barOfDurationByDistanceRangeIn7Days')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  protected drawBarsDailyDurationByDistanceRange(
    data: { atHome: number; less1km: number; less5km: number; above5km: number; day: string }[],
  ): void {
    const stackBarDataNumeric = data.map(item => ({
      day: +item.day,
      atHome: item.atHome,
      less1km: item.less1km,
      less5km: item.less5km,
      above5km: item.above5km,
    }));

    // D3.js code
    const stack = d3.stack().keys(['atHome', 'less1km', 'less5km', 'above5km']);
    const stackedData = stack(stackBarDataNumeric);
    const width = 600;
    const height = 400;

    const xScale = d3
      .scaleBand()
      .domain(data.map(d => d.day.toString()))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    const colorMapping = {
      atHome: '#bde1b4',
      less1km: '#f5ed5e',
      less5km: '#f3b563',
      above5km: '#f39595',
    };

    const colorScale = d3.scaleOrdinal().domain(Object.keys(colorMapping)).range(Object.values(colorMapping));

    this.svg
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('class', 'dataGroup')

      .attr('fill', (d: any) => colorScale(d.key))
      .attr('opacity', 0.8)
      .selectAll('rect')
      .data((d: any) => d)
      .join('rect')
      .attr('x', (d: any) => xScale(d.data.day.toString()))
      .attr('y', (d: any) => yScale(d[1]))
      .attr('height', (d: any) => yScale(d[0]) - yScale(d[1]))
      .attr('width', xScale.bandwidth());

    // Add text above each bar
    const bars = this.svg.selectAll('g').data(stackedData).join('g');

    bars
      .selectAll('text')
      .data((d: any) => d)
      .join('text')
      .attr('x', (d: any) => (xScale(d?.data?.day?.toString()) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', (d: any) => (yScale(d[0]) + yScale(d[1])) / 2 + 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', 'black')
      .style('font-weight', 'bold')
      .text((d: any) => {
        const value = (d[1] - d[0]) * 100;
        if (value.toFixed(0) === '0') {
          return '';
        } else {
          return value.toFixed(0) + '%';
        }
      });

    const xAxis = d3.axisBottom(xScale);

    this.svg
      .append('g')
      .call(xAxis)
      .attr('transform', 'translate(0,' + height + ')');

    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format('.0%'));

    this.svg.append('g').call(yAxis);

    // Add a centered title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Time Spent in Different Ranges per Date (Last 7 Days)');

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Duration');

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 0)
      .attr('y', this.height + 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Date');

    const legend = this.svg.append('g').attr('transform', 'translate(' + (width + 10) + ', 10)');

    const legendData = [
      { color: '#bde1b4', label: 'At Home' },
      { color: '#f5ed5e', label: '<1km' },
      { color: '#f3b563', label: '<5km' },
      { color: '#f39595', label: '>5km' },
    ];

    legend
      .selectAll('rect')
      .data(legendData)
      .join('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', (_: any, i: any) => i * 20)
      .attr('fill', (d: any) => d.color);

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 15)
      .attr('y', (_: any, i: any) => i * 20 + 8)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected getDailyDurationInsights(data: { atHome: number; less1km: number; less5km: number; above5km: number; day: string }[]) {
    let maxatHome = 0;
    let maxatHomeDay = '';
    let maxabove5km = 0;
    let maxabove5kmDay = '';
    let maxless1km = 0;
    let maxless1kmDay = '';
    let maxless5km = 0;
    let maxless5kmDay = '';

    let datatHome = [];
    let result = '';
    //let away = [];

    for (let i = 0; i < data.length; i++) {
      if (data[i].atHome > maxatHome) {
        maxatHome = data[i].atHome;
        maxatHomeDay = data[i].day;
      }
      if (data[i].above5km > maxabove5km) {
        maxabove5km = data[i].above5km;
        maxabove5kmDay = data[i].day;
      }
      if (data[i].less1km > maxless1km) {
        maxless1km = data[i].less1km;
        maxless1kmDay = data[i].day;
      }
      if (data[i].less5km > maxless5km) {
        maxless5km = data[i].less5km;
        maxless5kmDay = data[i].day;
      }
      if (data[i].atHome === 1) {
        datatHome.push(data[i].day);
      }
    }
    if (maxatHome === 0) {
      result += `The user ${this.userId} didn't spend time at home in the last 7 days.<br/>`;
    } else if (datatHome.length > 0) {
      result += `In last 7 days, the user ${this.userId} is at home the whole day on ${datatHome.join(', ')}.<br/>`;
    } else {
      result += `The user${this.userId} spent the most time at home on ${maxatHomeDay}, which is ${(maxatHome * 100).toFixed(0)}%.<br/>`;
    }

    if (maxabove5km === 0) {
      result += "<li/>The user didn't spend time above 5km away from home in the last 7 days.";
    } else {
      result += `<li/>The user spent the most time above 5km away from home on ${maxabove5kmDay}, which is ${(maxabove5km * 100).toFixed(
        0,
      )}%. `;
    }

    if (maxless5km === 0) {
      result += "<li/>The user didn't spend time between 1km and 5km away from home in the last 7 days.";
    } else {
      result += `<li/>The user spent the most time between 1km and 5km away from home on ${maxless5kmDay}, which is ${(
        maxless5km * 100
      ).toFixed(0)}%. `;
    }
    if (maxless1km === 0) {
      result += "<li/>The user didn't spend time less than 1km away from home in the last 7 days.";
    } else {
      result += `<li/>The user spent the most time less than 1km away from home on ${maxless1kmDay}, which is ${(maxless1km * 100).toFixed(
        0,
      )}%. `;
    }
    return result;
  }

  //---------Total Duration of visits by different distance range from home per Month---------
  protected createSvgMonthlyDurationByDistanceRange(): void {
    this.svg = d3
      .select('figure#barOfDurationByDistanceRangePerMonth')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  protected drawBarsMonthlyDurationByDistanceRange(
    data: { atHome: number; less1km: number; less5km: number; above5km: number; month: string }[],
  ): void {
    const stackBarDataNumeric = data.map(item => ({
      month: +item.month,
      atHome: item.atHome,
      less1km: item.less1km,
      less5km: item.less5km,
      above5km: item.above5km,
    }));

    // D3.js code
    const stack = d3.stack().keys(['atHome', 'less1km', 'less5km', 'above5km']);
    const stackedData = stack(stackBarDataNumeric);
    const width = 600;
    const height = 400;

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(data.map(d => d.month.toString()))
      .range([height, 0])
      .padding(0.1);

    const colorMapping = {
      atHome: '#bde1b4',
      less1km: '#f5ed5e',
      less5km: '#f3b563',
      above5km: '#f39595',
    };

    const colorScale = d3.scaleOrdinal().domain(Object.keys(colorMapping)).range(Object.values(colorMapping));

    this.svg
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('class', 'dataGroup')
      .attr('fill', (d: any) => colorScale(d.key))
      .attr('opacity', 0.8)
      .selectAll('rect')
      .data((d: any) => d)
      .join('rect')
      .attr('x', (d: any) => xScale(d[0]))
      .attr('y', (d: any) => yScale(d.data.month.toString()))
      .attr('width', (d: any) => xScale(d[1]) - xScale(d[0]))
      .attr('height', yScale.bandwidth());

    // Add text above each bar
    const bars = this.svg.selectAll('g').data(stackedData).join('g');

    bars
      .selectAll('text')
      .data((d: any) => d)
      .join('text')
      .attr('transform', 'rotate(90)')
      .attr('x', (d: any) => (yScale(d?.data?.month?.toString()) ?? 0) + yScale.bandwidth() / 2)
      .attr('y', (d: any) => -(xScale(d[0]) + xScale(d[1])) / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', 'black')
      .style('font-weight', 'bold')
      .text((d: any) => {
        const value = (d[1] - d[0]) * 100;
        if (value.toFixed(0) === '0') {
          return '';
        } else {
          return value.toFixed(0) + '%';
        }
      });

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format('.0%'));

    this.svg
      .append('g')
      .call(xAxis)
      .attr('transform', 'translate(0,' + height + ')');

    // Draw Y-axis
    this.svg.append('g').call(d3.axisLeft(yScale));

    // Add a centered title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Total Duration of visits by different distance range from home per Month');

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Month');

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 20)
      .attr('y', this.height + 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Duration');

    const legend = this.svg.append('g').attr('transform', 'translate(' + (width + 10) + ', 10)');

    const legendData = [
      { color: '#bde1b4', label: 'At Home' },
      { color: '#f5ed5e', label: '<1km' },
      { color: '#f3b563', label: '<5km' },
      { color: '#f39595', label: '>5km' },
    ];

    legend
      .selectAll('rect')
      .data(legendData)
      .join('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', (_: any, i: any) => i * 20)
      .attr('fill', (d: any) => d.color);

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 15)
      .attr('y', (_: any, i: any) => i * 20 + 8)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected getMonthlyDurationInsights(data: { atHome: number; less1km: number; less5km: number; above5km: number; month: string }[]) {
    let result = '';
    let maxOutside = 0;
    let maxOutsideMonth = '';
    let maxabove5km = 0;
    let maxabove5kmMonth = '';
    let maxless5km = 0;
    let maxless5kmMonth = '';
    let maxless1km = 0;
    let maxless1kmMonth = '';
    for (let i = 0; i < data.length; i++) {
      if (data[i].less1km + data[i].less5km + data[i].above5km > maxOutside) {
        maxOutside = data[i].less1km + data[i].less5km + data[i].above5km;
        maxOutsideMonth = data[i].month;
      }
      if (data[i].above5km > maxabove5km) {
        maxabove5km = data[i].above5km;
        maxabove5kmMonth = data[i].month;
      }
      if (data[i].less5km > maxless5km) {
        maxless5km = data[i].less5km;
        maxless5kmMonth = data[i].month;
      }
      if (data[i].less1km > maxless1km) {
        maxless1km = data[i].less1km;
        maxless1kmMonth = data[i].month;
      }
    }
    result +=
      `In last 12 months, the user ${this.userId} spent the most time outside in ` +
      maxOutsideMonth +
      ', which is ' +
      (maxOutside * 100).toFixed(0) +
      '%.<br>';
    result += `<li>The user spent the most time above 5km away from home in ${maxabove5kmMonth}, which is ${(maxabove5km * 100).toFixed(
      0,
    )}%.`;
    result += `<li>The user spent the most time between 1km and 5km away from home in ${maxless5kmMonth}, which is ${(
      maxless5km * 100
    ).toFixed(0)}%.`;
    result += `<li>The user spent the most time less than 1km away from home in ${maxless1kmMonth}, which is ${(maxless1km * 100).toFixed(
      0,
    )}%.`;
    return result;
  }

  //---------Frequency of visits by different distance range from home per Month---------
  protected createSvgMonthlyFrequencyByDistanceRange(): void {
    this.svg = d3
      .select('figure#barOfFrequencyByDistanceRangePerMonth')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  protected drawBarsMonthlyFrequencyByDistanceRange(
    data: { atHome: number; less1km: number; less5km: number; above5km: number; month: string }[],
  ): void {
    const stackBarDataNumeric = data.map(item => ({
      month: +item.month,
      atHome: item.atHome,
      less1km: item.less1km,
      less5km: item.less5km,
      above5km: item.above5km,
    }));

    // D3.js code
    const stack = d3.stack().keys(['atHome', 'less1km', 'less5km', 'above5km']);
    const stackedData = stack(stackBarDataNumeric);
    const width = 600;
    const height = 400;

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(data.map(d => d.month.toString()))
      .range([height, 0])
      .padding(0.1);

    const colorMapping = {
      atHome: '#bde1b4',
      less1km: '#f5ed5e',
      less5km: '#f3b563',
      above5km: '#f39595',
    };

    const colorScale = d3.scaleOrdinal().domain(Object.keys(colorMapping)).range(Object.values(colorMapping));

    this.svg
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('class', 'dataGroup')
      .attr('fill', (d: any) => colorScale(d.key))
      .attr('opacity', 0.8)
      .selectAll('rect')
      .data((d: any) => d)
      .join('rect')
      .attr('x', (d: any) => xScale(d[0]))
      .attr('y', (d: any) => yScale(d.data.month.toString()))
      .attr('width', (d: any) => xScale(d[1]) - xScale(d[0]))
      .attr('height', yScale.bandwidth());

    // Add text above each bar
    const bars = this.svg.selectAll('g').data(stackedData).join('g');

    bars
      .selectAll('text')
      .data((d: any) => d)
      .join('text')
      .attr('transform', 'rotate(90)')
      .attr('x', (d: any) => (yScale(d?.data?.month?.toString()) ?? 0) + yScale.bandwidth() / 2)
      .attr('y', (d: any) => -(xScale(d[0]) + xScale(d[1])) / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', 'black')
      .style('font-weight', 'bold')
      .text((d: any) => {
        const value = (d[1] - d[0]) * 100;
        if (value.toFixed(0) === '0') {
          return '';
        } else {
          return value.toFixed(0) + '%';
        }
      });

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format('.0%'));

    this.svg
      .append('g')
      .call(xAxis)
      .attr('transform', 'translate(0,' + height + ')');

    // Draw Y-axis
    this.svg.append('g').call(d3.axisLeft(yScale));

    // Add a centered title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Frequency of visits by different distance range from home per Month');

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Month');

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 12)
      .attr('y', this.height + 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Frequency');

    const legend = this.svg.append('g').attr('transform', 'translate(' + (width + 10) + ', 10)');

    const legendData = [
      { color: '#bde1b4', label: 'At Home' },
      { color: '#f5ed5e', label: '<1km' },
      { color: '#f3b563', label: '<5km' },
      { color: '#f39595', label: '>5km' },
    ];

    legend
      .selectAll('rect')
      .data(legendData)
      .join('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', (_: any, i: any) => i * 20)
      .attr('fill', (d: any) => d.color);

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 15)
      .attr('y', (_: any, i: any) => i * 20 + 8)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected getMonthlyFrequencyInsights(data: { atHome: number; less1km: number; less5km: number; above5km: number; month: string }[]) {
    let result = '';
    let maxOutside = 0;
    let maxOutsideMonth = '';
    let maxabove5km = 0;
    let maxabove5kmMonth = '';
    let maxless5km = 0;
    let maxless5kmMonth = '';
    let maxless1km = 0;
    let maxless1kmMonth = '';

    for (let i = 0; i < data.length; i++) {
      if (data[i].less1km + data[i].less5km + data[i].above5km > maxOutside) {
        maxOutside = data[i].less1km + data[i].less5km + data[i].above5km;
        maxOutsideMonth = data[i].month;
      }
      if (data[i].above5km > maxabove5km) {
        maxabove5km = data[i].above5km;
        maxabove5kmMonth = data[i].month;
      }
      if (data[i].less5km > maxless5km) {
        maxless5km = data[i].less5km;
        maxless5kmMonth = data[i].month;
      }
      if (data[i].less1km > maxless1km) {
        maxless1km = data[i].less1km;
        maxless1kmMonth = data[i].month;
      }
    }
    result += `In last 12 months, the user ${this.userId} visited outside most frequently in ${maxOutsideMonth}, which is ${(
      maxOutside * 100
    ).toFixed(0)}%.<br>`;
    result += `<li>The user visited location above 5km away from home most frequently in ${maxabove5kmMonth}, which is ${(
      maxabove5km * 100
    ).toFixed(0)}%`;
    result += `<li>The user visited location between 1km and 5km away from home most frequently in ${maxless5kmMonth}, which is ${(
      maxless5km * 100
    ).toFixed(0)}%`;
    result += `<li>The user visited location less than 1km away from home most frequently in ${maxless1kmMonth}, which is ${(
      maxless1km * 100
    ).toFixed(0)}%`;

    return result;
  }

  //---------Location Number of visits by different distance range from home per Month---------
  protected createSvgMonthlyLocationNumberByDistanceRange(): void {
    this.svg = d3
      .select('figure#barOfLocationNumberByDistanceRangePerMonth')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  protected drawBarsMonthlyLocationNumberByDistanceRange(
    data: { less1km: number; less5km: number; above5km: number; month: string }[],
  ): void {
    const stackBarDataNumeric = data.map(item => ({
      month: +item.month,
      less1km: item.less1km,
      less5km: item.less5km,
      above5km: item.above5km,
    }));

    // D3.js code
    const stack = d3.stack().keys(['less1km', 'less5km', 'above5km']);
    const stackedData = stack(stackBarDataNumeric);
    const width = 600;
    const height = 400;

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    const yScale = d3
      .scaleBand()
      .domain(data.map(d => d.month.toString()))
      .range([height, 0])
      .padding(0.1);

    const colorMapping = {
      less1km: '#f5ed5e',
      less5km: '#f3b563',
      above5km: '#f39595',
    };

    const colorScale = d3.scaleOrdinal().domain(Object.keys(colorMapping)).range(Object.values(colorMapping));

    this.svg
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('class', 'dataGroup')
      .attr('fill', (d: any) => colorScale(d.key))
      .attr('opacity', 0.8)
      .selectAll('rect')
      .data((d: any) => d)
      .join('rect')
      .attr('x', (d: any) => xScale(d[0]))
      .attr('y', (d: any) => yScale(d.data.month.toString()))
      .attr('width', (d: any) => xScale(d[1]) - xScale(d[0]))
      .attr('height', yScale.bandwidth());

    // Add text above each bar
    const bars = this.svg.selectAll('g').data(stackedData).join('g');

    bars
      .selectAll('text')
      .data((d: any) => d)
      .join('text')
      .attr('transform', 'rotate(90)')
      .attr('x', (d: any) => (yScale(d?.data?.month?.toString()) ?? 0) + yScale.bandwidth() / 2)
      .attr('y', (d: any) => -(xScale(d[0]) + xScale(d[1])) / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', 'black')
      .style('font-weight', 'bold')
      .text((d: any) => {
        const value = (d[1] - d[0]) * 100;
        if (value.toFixed(0) === '0') {
          return '';
        } else {
          return value.toFixed(0) + '%';
        }
      });

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format('.0%'));

    this.svg
      .append('g')
      .call(xAxis)
      .attr('transform', 'translate(0,' + height + ')');

    // Draw Y-axis
    this.svg.append('g').call(d3.axisLeft(yScale));

    // Add a centered title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Location Number of visits by different distance range from home per Month');

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Month');

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 20)
      .attr('y', this.height)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Location')
      .append('tspan')
      .attr('x', this.width + 20)
      .attr('dy', '1.2em') // Adjust the vertical spacing between lines
      .text('Number');

    const legend = this.svg.append('g').attr('transform', 'translate(' + (width + 10) + ', 10)');

    const legendData = [
      { color: '#f5ed5e', label: '<1km' },
      { color: '#f3b563', label: '<5km' },
      { color: '#f39595', label: '>5km' },
    ];

    legend
      .selectAll('rect')
      .data(legendData)
      .join('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', (_: any, i: any) => i * 20)
      .attr('fill', (d: any) => d.color);

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 15)
      .attr('y', (_: any, i: any) => i * 20 + 8)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected getMonthlyLocationNumberInsights(data: { less1km: number; less5km: number; above5km: number; month: string }[]) {
    let result = '';
    let maxabove5km = 0;
    let maxabove5kmMonth = '';
    let maxless5km = 0;
    let maxless5kmMonth = '';
    let maxless1km = 0;
    let maxless1kmMonth = '';
    let maxOutside = 0;
    let maxOutsideMonth = '';
    for (let i = 0; i < data.length; i++) {
      if (data[i].above5km > maxabove5km) {
        maxabove5km = data[i].above5km;
        maxabove5kmMonth = data[i].month;
      }
      if (data[i].less5km > maxless5km) {
        maxless5km = data[i].less5km;
        maxless5kmMonth = data[i].month;
      }
      if (data[i].less1km > maxless1km) {
        maxless1km = data[i].less1km;
        maxless1kmMonth = data[i].month;
      }
      if (data[i].less1km + data[i].less5km + data[i].above5km > maxOutside) {
        maxOutside = data[i].less1km + data[i].less5km + data[i].above5km;
        maxOutsideMonth = data[i].month;
      }
    }
    result += `<li>The user ${this.userId} visited the most locations above 5km away from home in ${maxabove5kmMonth}, which is ${(
      maxabove5km * 100
    ).toFixed(0)}%.`;
    result += `<li>The user ${this.userId} visited the most locations between 1km and 5km away from home in ${maxless5kmMonth}, which is ${(
      maxless5km * 100
    ).toFixed(0)}%.`;
    result += `<li>The user ${this.userId} visited the most locations less than 1km away from home in ${maxless1kmMonth}, which is ${(
      maxless1km * 100
    ).toFixed(0)}%.`;
    return result;
  }

  //---------Total Duration of visits by different distance range from home in specific month---------
  protected createSvgSpecificMonthlyDurationByDistanceRange(): void {
    this.svg = d3
      .select('figure#specificMonthlyDurationInsights')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  protected drawBarsSpecificMonthlyDurationByDistanceRange(
    data: { atHome: number; less1km: number; less5km: number; above5km: number; day: string }[],
  ): void {
    const stackBarDataNumeric = data.map(item => ({
      day: +item.day,
      atHome: item.atHome,
      less1km: item.less1km,
      less5km: item.less5km,
      above5km: item.above5km,
    }));

    // D3.js code
    const stack = d3.stack().keys(['atHome', 'less1km', 'less5km', 'above5km']);
    const stackedData = stack(stackBarDataNumeric);
    const width = 600;
    const height = 400;
    const monthYear = data[0].day.substring(0, 4) + '-' + data[0].day.substring(4, 6);

    const xScale = d3
      .scaleBand()
      .domain(data.map(d => d.day.toString().substring(6, 8)))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    const colorMapping = {
      atHome: '#bde1b4',
      less1km: '#f5ed5e',
      less5km: '#f3b563',
      above5km: '#f39595',
    };

    const colorScale = d3.scaleOrdinal().domain(Object.keys(colorMapping)).range(Object.values(colorMapping));

    this.svg
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('class', 'dataGroup')

      .attr('fill', (d: any) => colorScale(d.key))
      .attr('opacity', 0.8)
      .selectAll('rect')
      .data((d: any) => d)
      .join('rect')
      .attr('x', (d: any) => xScale(d.data.day.toString().substring(6, 8)))
      .attr('y', (d: any) => yScale(d[1]))
      .attr('height', (d: any) => yScale(d[0]) - yScale(d[1]))
      .attr('width', xScale.bandwidth());

    // Add text above each bar
    const bars = this.svg.selectAll('g').data(stackedData).join('g');

    bars
      .selectAll('text')
      .data((d: any) => d)
      .join('text')
      .attr('x', (d: any) => (xScale(d?.data?.day?.toString().substring(6, 8)) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', (d: any) => (yScale(d[0]) + yScale(d[1])) / 2 + 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '7px')
      .style('fill', 'black')
      .style('font-weight', 'bold')
      .text((d: any) => {
        const value = (d[1] - d[0]) * 100;
        if (value.toFixed(0) === '0') {
          return '';
        } else {
          return value.toFixed(0) + '%';
        }
      });

    const xAxis = d3.axisBottom(xScale);

    this.svg
      .append('g')
      .call(xAxis)
      .attr('transform', 'translate(0,' + height + ')');

    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format('.0%'));

    this.svg.append('g').call(yAxis);

    // Add a centered title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Total Duration of visits by different distance range from home in ' + monthYear);

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Duration');

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 0)
      .attr('y', this.height + 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Date');

    const legend = this.svg.append('g').attr('transform', 'translate(' + (width + 10) + ', 10)');

    const legendData = [
      { color: '#bde1b4', label: 'At Home' },
      { color: '#f5ed5e', label: '<1km' },
      { color: '#f3b563', label: '<5km' },
      { color: '#f39595', label: '>5km' },
    ];

    legend
      .selectAll('rect')
      .data(legendData)
      .join('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', (_: any, i: any) => i * 20)
      .attr('fill', (d: any) => d.color);

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 15)
      .attr('y', (_: any, i: any) => i * 20 + 8)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected getSpecificMonthlyDurationInsights(
    data: { atHome: number; less1km: number; less5km: number; above5km: number; day: string }[],
  ) {
    let maxatHome = 0;
    let maxatHomeDay = '';
    let maxabove5km = 0;
    let maxabove5kmDay = '';
    let maxnotatHome = 0;
    let maxnotatHomeDay = '';
    let datatHome = [];
    let dataOutside = [];
    let result = '';
    const month = data[0].day.substring(0, 4) + '-' + data[0].day.substring(4, 6);

    for (let i = 0; i < data.length; i++) {
      if (data[i].atHome > maxatHome) {
        maxatHome = data[i].atHome;
        maxatHomeDay = data[i].day;
      }
      if (data[i].above5km > maxabove5km) {
        maxabove5km = data[i].above5km;
        maxabove5kmDay = data[i].day;
      }
      if (1 - data[i].atHome > maxnotatHome) {
        maxnotatHome = 1 - data[i].atHome;
        maxnotatHomeDay = data[i].day;
      }
      if (data[i].atHome === 1) {
        datatHome.push(data[i].day.substring(4, 6) + '-' + data[i].day.substring(6, 8));
      }
      if (data[i].atHome < 1 && data[i].atHome + data[i].less1km + data[i].less5km + data[i].above5km > 0) {
        dataOutside.push(data[i].day.substring(4, 6) + '-' + data[i].day.substring(6, 8));
      }
    }
    if (datatHome.length === 0) {
      result += `In ${month}, the user ${this.userId} spent the most time at home on ${maxatHomeDay}, which is ${(maxatHome * 100).toFixed(
        0,
      )}. `;
    } else {
      result += `In ${month}, the user ${this.userId} spent ${datatHome.length} whole days at home and other ${dataOutside.length} days outside. `;
    }
    if (maxnotatHome === 0) {
      result += `The user has not visited a place away from home. `;
    } else {
      result += `The user spent the most time away from home on ${maxnotatHomeDay}, which is ${(maxnotatHome * 100).toFixed(0)}%. `;
    }

    if (maxabove5km === 0) {
      result += `The user has not visited a place more than 5km away from home. `;
    } else {
      result += `The user spent the most time above 5km away from home on ${maxabove5kmDay}, which is ${(maxabove5km * 100).toFixed(0)}%.`;
    }
    return result;
  }

  //---------Frequency of visits by different distance range from home in specific month---------
  protected createSvgSpecificMonthlyFrequencyByDistanceRange(): void {
    this.svg = d3
      .select('figure#specificMonthlyFrequencyInsights')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  protected drawBarsSpecificMonthlyFrequencyByDistanceRange(
    data: { atHome: number; less1km: number; less5km: number; above5km: number; day: string }[],
  ): void {
    const stackBarDataNumeric = data.map(item => ({
      day: +item.day,
      atHome: item.atHome,
      less1km: item.less1km,
      less5km: item.less5km,
      above5km: item.above5km,
    }));

    // D3.js code
    const stack = d3.stack().keys(['atHome', 'less1km', 'less5km', 'above5km']);
    const stackedData = stack(stackBarDataNumeric);
    const width = 600;
    const height = 400;
    const monthYear = data[0].day.substring(0, 4) + '-' + data[0].day.substring(4, 6);

    const xScale = d3
      .scaleBand()
      .domain(data.map(d => d.day.toString().substring(6, 8)))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    const colorMapping = {
      atHome: '#bde1b4',
      less1km: '#f5ed5e',
      less5km: '#f3b563',
      above5km: '#f39595',
    };

    const colorScale = d3.scaleOrdinal().domain(Object.keys(colorMapping)).range(Object.values(colorMapping));

    this.svg
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('class', 'dataGroup')

      .attr('fill', (d: any) => colorScale(d.key))
      .attr('opacity', 0.8)
      .selectAll('rect')
      .data((d: any) => d)
      .join('rect')
      .attr('x', (d: any) => xScale(d.data.day.toString().substring(6, 8)))
      .attr('y', (d: any) => yScale(d[1]))
      .attr('height', (d: any) => yScale(d[0]) - yScale(d[1]))
      .attr('width', xScale.bandwidth());

    // Add text above each bar
    const bars = this.svg.selectAll('g').data(stackedData).join('g');

    bars
      .selectAll('text')
      .data((d: any) => d)
      .join('text')
      .attr('x', (d: any) => (xScale(d?.data?.day?.toString().substring(6, 8)) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', (d: any) => (yScale(d[0]) + yScale(d[1])) / 2 + 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '7px')
      .style('fill', 'black')
      .style('font-weight', 'bold')
      .text((d: any) => {
        const value = (d[1] - d[0]) * 100;
        if (value.toFixed(0) === '0') {
          return '';
        } else {
          return value.toFixed(0) + '%';
        }
      });

    const xAxis = d3.axisBottom(xScale);

    this.svg
      .append('g')
      .call(xAxis)
      .attr('transform', 'translate(0,' + height + ')');

    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format('.0%'));

    this.svg.append('g').call(yAxis);

    // Add a centered title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Frequency of visits by different distance range from home in ' + monthYear);

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Frequency');

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 0)
      .attr('y', this.height + 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Date');

    const legend = this.svg.append('g').attr('transform', 'translate(' + (width + 10) + ', 10)');

    const legendData = [
      { color: '#bde1b4', label: 'At Home' },
      { color: '#f5ed5e', label: '<1km' },
      { color: '#f3b563', label: '<5km' },
      { color: '#f39595', label: '>5km' },
    ];

    legend
      .selectAll('rect')
      .data(legendData)
      .join('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', (_: any, i: any) => i * 20)
      .attr('fill', (d: any) => d.color);

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 15)
      .attr('y', (_: any, i: any) => i * 20 + 8)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected getSpecificMonthlyFrequencyInsights(
    data: { atHome: number; less1km: number; less5km: number; above5km: number; day: string }[],
  ) {
    let maxatHome = 0;
    let maxatHomeDay = '';
    let maxabove5km = 0;
    let maxabove5kmDay = '';
    let maxnotatHome = 0;
    let maxnotatHomeDay = '';
    let datatHome = [];
    let result = '';
    const month = data[0].day.substring(0, 4) + '-' + data[0].day.substring(4, 6);

    for (let i = 0; i < data.length; i++) {
      if (data[i].atHome > maxatHome) {
        maxatHome = data[i].atHome;
        maxatHomeDay = data[i].day;
      }
      if (data[i].above5km > maxabove5km) {
        maxabove5km = data[i].above5km;
        maxabove5kmDay = data[i].day;
      }
      if (1 - data[i].atHome > maxnotatHome) {
        if (data[i].less1km + data[i].less5km + data[i].above5km > 0) {
          maxnotatHome = 1 - data[i].atHome;
          maxnotatHomeDay = data[i].day;
        }
      }
      if (data[i].atHome === 1) {
        datatHome.push(data[i].day.substring(4, 6) + '-' + data[i].day.substring(6, 8));
      }
    }
    if (maxnotatHome === 0) {
      result += `The user ${this.userId} has not visited a place away from home. `;
    } else {
      result += `The user ${this.userId} visited places outside most frequently on ${maxnotatHomeDay}, which is ${(
        maxnotatHome * 100
      ).toFixed(0)}%. `;
    }

    if (maxabove5km === 0) {
      result += `The user has not visited a place more than 5km away from home. `;
    } else {
      result += `The user visited places above 5km away from home most frequently on ${maxabove5kmDay}, which is ${(
        maxabove5km * 100
      ).toFixed(0)}%.`;
    }
    return result;
  }

  //---------Location Number of visits by different distance range from home in specific month---------
  protected createSvgSpecificMonthlyLocationNumberByDistanceRange(): void {
    this.svg = d3
      .select('figure#specificmonthlyLocationNumberInsights')
      .append('svg')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  protected drawBarsSpecificMonthlyLocationNumberByDistanceRange(
    data: { less1km: number; less5km: number; above5km: number; day: string }[],
  ): void {
    const stackBarDataNumeric = data.map(item => ({
      day: +item.day,
      less1km: item.less1km,
      less5km: item.less5km,
      above5km: item.above5km,
    }));

    // D3.js code
    const stack = d3.stack().keys(['less1km', 'less5km', 'above5km']);
    const stackedData = stack(stackBarDataNumeric);
    const width = 600;
    const height = 400;
    const monthYear = data[0].day.substring(0, 4) + '-' + data[0].day.substring(4, 6);

    const xScale = d3
      .scaleBand()
      .domain(data.map(d => d.day.toString().substring(6, 8)))
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    const colorMapping = {
      less1km: '#f5ed5e',
      less5km: '#f3b563',
      above5km: '#f39595',
    };

    const colorScale = d3.scaleOrdinal().domain(Object.keys(colorMapping)).range(Object.values(colorMapping));

    this.svg
      .selectAll('g')
      .data(stackedData)
      .join('g')
      .attr('class', 'dataGroup')

      .attr('fill', (d: any) => colorScale(d.key))
      .attr('opacity', 0.8)
      .selectAll('rect')
      .data((d: any) => d)
      .join('rect')
      .attr('x', (d: any) => xScale(d.data.day.toString().substring(6, 8)))
      .attr('y', (d: any) => yScale(d[1]))
      .attr('height', (d: any) => yScale(d[0]) - yScale(d[1]))
      .attr('width', xScale.bandwidth());

    // Add text above each bar
    const bars = this.svg.selectAll('g').data(stackedData).join('g');

    bars
      .selectAll('text')
      .data((d: any) => d)
      .join('text')
      .attr('x', (d: any) => (xScale(d?.data?.day?.toString().substring(6, 8)) ?? 0) + xScale.bandwidth() / 2)
      .attr('y', (d: any) => (yScale(d[0]) + yScale(d[1])) / 2 + 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '7px')
      .style('fill', 'black')
      .style('font-weight', 'bold')
      .text((d: any) => {
        const value = (d[1] - d[0]) * 100;
        if (value.toFixed(0) === '0') {
          return '';
        } else {
          return value.toFixed(0) + '%';
        }
      });

    const xAxis = d3.axisBottom(xScale);

    this.svg
      .append('g')
      .call(xAxis)
      .attr('transform', 'translate(0,' + height + ')');

    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format('.0%'));

    this.svg.append('g').call(yAxis);

    // Add a centered title
    this.svg
      .append('text')
      .attr('x', this.width / 2)
      .attr('y', -30)
      .attr('text-anchor', 'middle')
      .style('font-size', '20px')
      .style('font-weight', 'bold')
      .text('Location Number of visits by different distance range from home in ' + monthYear);

    // Add Y-axis label
    this.svg.append('text').attr('x', 0).attr('y', -10).attr('text-anchor', 'middle').style('font-size', '14px').text('Location Number');

    // Add X-axis label
    this.svg
      .append('text')
      .attr('x', this.width + 0)
      .attr('y', this.height + 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Date');

    const legend = this.svg.append('g').attr('transform', 'translate(' + (width + 10) + ', 10)');

    const legendData = [
      { color: '#f5ed5e', label: '<1km' },
      { color: '#f3b563', label: '<5km' },
      { color: '#f39595', label: '>5km' },
    ];

    legend
      .selectAll('rect')
      .data(legendData)
      .join('rect')
      .attr('width', 10)
      .attr('height', 10)
      .attr('y', (_: any, i: any) => i * 20)
      .attr('fill', (d: any) => d.color);

    legend
      .selectAll('text')
      .data(legendData)
      .join('text')
      .attr('x', 15)
      .attr('y', (_: any, i: any) => i * 20 + 8)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text((d: any) => d.label);
  }

  protected getSpecificMonthlyLocationNumberInsights(data: { less1km: number; less5km: number; above5km: number; day: string }[]) {
    let result = '';
    let dataOutside = [];
    const month = data[0].day.substring(0, 4) + '-' + data[0].day.substring(4, 6);

    for (let i = 0; i < data.length; i++) {
      if (data[i].less5km + data[i].above5km + data[i].less1km > 0) {
        dataOutside.push(data[i].day.substring(4, 6) + '-' + data[i].day.substring(6, 8));
      }
    }
    result += `In ${month}, the user ${this.userId} visited different locations outside for ${dataOutside.length} days. `;

    return result;
  }

  //get geo info from location
  async getGeoDataInsights(locations: any[]) {
    let result = '';
    for (let i = 0; i < locations.length; i++) {
      result += `The user ${this.userId} visited ${locations[i].address} for ${locations[i].duration} minutes. `;
    }
    return result;
  }

  // -----------------------preprocessing data-----------------------
  /**
   * Filter data records by a specific year and month.
   * @param record The array of data records to filter.
   * @param year The target year.
   * @param months The target month (1 to 12).
   * @returns The filtered array of data records.
   */
  //@ts-ignore
  protected filterDataByMonth(record, year, months) {
    if (!record) {
      return [];
    }
    //@ts-ignore
    const filteredData = record.filter(item => {
      if (!item.recorded_at) {
        console.error('Missing filed:', item);
        return null;
      }
      const recordedAt = new Date(item.recorded_at);
      return recordedAt.getFullYear() === year && months == recordedAt.getMonth() + 1;
    });
    return filteredData;
  }

  /**
   * Converts filtered data records to a specific format.
   * @param filteredData The array of filtered data records.
   * @returns The converted array of data records.
   */
  //@ts-ignore
  protected convertData(filteredData) {
    const arr = [];

    for (const element of filteredData) {
      const { id, latitude, longitude, accuracy } = element;
      let lat = latitude;
      let lon = longitude;
      let radius = accuracy;
      let index = id;
      const location = {
        id: String(index).trim(),
        lat: parseFloat(String(lat).trim()),
        lon: parseFloat(String(lon).trim()),
        radius: parseFloat(String(radius).trim()),
      };
      arr.push(location);
    }
    return arr;
  }

  /**
   * Calculates the frequency of each location with maximum accuracy.
   * @param locations The array of location data.
   * @returns A map containing the frequency of each location with maximum accuracy.
   */
  //@ts-ignore
  protected getLocationFrequencyWithMaxAccuracy(locations) {
    const locationFrequencyMap = new Map();

    // Iterate over locations
    for (const location of locations) {
      const key = `${location.lat},${location.lon}`;

      if (locationFrequencyMap.has(key)) {
        // Update the accuracy if the new accuracy is greater
        const currentInfo = locationFrequencyMap.get(key);
        if (location.radius > currentInfo.radius) {
          currentInfo.frequency += 1;
          currentInfo.radius = location.radius;
        } else {
          // If the new accuracy is not greater, just increment the frequency
          currentInfo.frequency += 1;
        }
        // Add the ID to the array in the current element
        currentInfo.ids.push(location.id);
      } else {
        // Add the location to the map with a frequency of 1 and the initial accuracy
        locationFrequencyMap.set(key, { lat: location.lat, lon: location.lon, frequency: 1, radius: location.radius, ids: [location.id] });
      }
    }
    return locationFrequencyMap;
  }

  /**
   * Ranks locations by their occurrence frequency.
   * @param locations The array of locations.
   * @returns An array of locations sorted by frequency of occurrence in descending order.
   */
  //@ts-ignore
  protected rankLocationsByOccurrence(locations) {
    const locationFrequencyMap = this.getLocationFrequencyWithMaxAccuracy(locations);

    // Convert the map to an array of objects
    const locationArray = Array.from(locationFrequencyMap.values(), value => ({
      key: [value.lat, value.lon], // Convert the key to an array of numbers
      frequency: value.frequency,
      radius: value.radius,
      ids: value.ids,
    }));

    // Sort the array by frequency in descending order
    const sortedLocations = locationArray.sort((a, b) => b.frequency - a.frequency);
    return sortedLocations;
  }

  // -----------------------Daily fluctuations line graph-----------------------

  /**
   * Finds the data within the last week from the given data.
   * @param data The array of data entries.
   * @returns An array of data entries within the last week, sorted by recorded_at timestamp.
   */
  // @ts-ignore
  protected findWeekData(data) {
    // Create a new array with Date objects from recorded_at, without modifying the original data
    // @ts-ignore
    const dates = data.map(entry => new Date(entry.recorded_at));

    // Find the most recent date
    const mostRecentTime = new Date(Math.max(...dates)); // EndDate
    const mostRecentDate = new Date(mostRecentTime.toDateString());

    // Calculate the target date range: from seven days before the most recent date to the day before it
    const startDate = new Date(mostRecentDate.toDateString());
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(mostRecentDate.toDateString());
    endDate.setDate(endDate.getDate()); // Include the end day

    // Filter the data to include only those entries within the specified date range
    // @ts-ignore
    const filteredData = data.filter((entry, index) => {
      const entryDate = dates[index];
      return entryDate >= startDate && entryDate < endDate;
    });

    // Sort the filtered data by recorded_at
    // @ts-ignore
    return filteredData.sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  }

  /**
   * Gets the first and last data entries for a given date from a list of data entries.
   * @param list The list of data entries.
   * @param date The target date.
   * @returns An array containing the first and last data entries for the specified date.
   */
  // @ts-ignore
  protected getDateFirstAndLastData(list, date) {
    // @ts-ignore
    const dayFirstIndex = list.findIndex(i => i.recorded_at.includes(date));
    // @ts-ignore
    const dayLastIndex = list.findLastIndex(i => i.recorded_at.includes(date));
    const dayFirstItem = Object.assign({}, list[dayFirstIndex]);
    dayFirstItem.recorded_at = date + ' 00:00:00.000000';
    dayFirstItem.acquired_at = date + ' 00:00:00.000000';
    const dayLastItem = Object.assign({}, list[dayLastIndex]);
    dayLastItem.recorded_at = date + ' 23:59:59.999999';
    dayLastItem.acquired_at = date + ' 23:59:59.999999';

    return [dayFirstItem, dayLastItem];
  }

  /**
   * Extracts the list of unique dates from a list of data entries.
   * @param list The list of data entries.
   * @returns An array containing unique date strings extracted from the recorded_at field of the data entries.
   */
  // @ts-ignore
  protected getDateList(list) {
    // @ts-ignore
    return list.reduce((prev, curr) => {
      //@ts-ignore
      if (!prev.includes(curr.recorded_at.split(' ').filter(i => i)[0])) {
        //@ts-ignore
        return prev.concat(curr.recorded_at.split(' ').filter(i => i)[0]);
      }
      return prev;
    }, []);
  }

  /**
   * Finds the home cluster from a cluster array.
   * @param clusterArray The array of clusters.
   * @returns An array containing the latitude, longitude, and radius of the home cluster.
   */
  // @ts-ignore
  protected findHomeCluster(clusterArray) {
    // @ts-ignore
    let maxMembersObj = clusterArray.reduce((maxObj, currentObj) => {
      return currentObj.members.length > maxObj.members.length ? currentObj : maxObj;
    });

    let location = maxMembersObj.leader[0].location;
    let radius = maxMembersObj.leader[0].radius;

    return [location[0], location[1], radius];
  }

  /**
   * Adds location attributes to the data based on cluster information and home location.
   * @param data The array of data entries.
   * @param cluster The cluster array.
   * @param homeLocation The home location [latitude, longitude, radius].
   * @returns An array of data entries with added location attributes.
   */
  // @ts-ignore
  protected addLocationAttributesToData(data, cluster, homeLocation) {
    // Creating a map with member ID as the key and leader's location and radius as the value
    const memberLocationMap = new Map();
    // @ts-ignore
    cluster.forEach(clusterItem => {
      const { location, radius } = clusterItem.leader[0];
      // @ts-ignore
      clusterItem.members.forEach(memberId => {
        memberLocationMap.set(memberId, { location, radius });
      });
    });

    // Creating a new array that includes the original data objects with added properties
    // @ts-ignore
    let enrichedData = data.map(dataItem => {
      const memberInfo = memberLocationMap.get(dataItem.id.toString());
      if (memberInfo) {
        // Returning an object that combines the original data with new attributes
        return {
          ...dataItem,
          belong_to_location_lat: memberInfo.location[0],
          belong_to_location_long: memberInfo.location[1],
          belong_to_location_radius: memberInfo.radius,
        };
      }
      return dataItem; // If no corresponding cluster info is found, return the original data item
    });

    // @ts-ignore
    enrichedData.sort((a, b) => {
      // @ts-ignore
      return new Date(a.recorded_at) - new Date(b.recorded_at);
    });
    // @ts-ignore
    enrichedData.map(item => {
      const lat1 = parseFloat(item.latitude);
      const lon1 = parseFloat(item.longitude);
      const lat2 = homeLocation[0];
      const lon2 = homeLocation[1];
      const radius = homeLocation[2];

      const distance = this.haversine(lat1, lon1, lat2, lon2);

      if (distance <= radius) {
        item.belong_to_location_lat = homeLocation[0];
        item.belong_to_location_long = homeLocation[1];
        item.belong_to_location_radius = homeLocation[2];
      }

      return item;
    });

    const homeCluster = this.findHomeCluster(cluster);
    // @ts-ignore
    enrichedData.map(item => {
      if (
        item.belong_to_location_lat === homeCluster[0] &&
        item.belong_to_location_long === homeCluster[1] &&
        item.belong_to_location_radius === homeCluster[2]
      ) {
        item.belong_to_location_lat = homeLocation[0];
        item.belong_to_location_long = homeLocation[1];
        item.belong_to_location_radius = homeLocation[2];
      }
      if (this.haversine(item.belong_to_location_lat, item.belong_to_location_long, homeLocation[0], homeLocation[1]) < 20) {
        item.belong_to_location_lat = homeLocation[0];
        item.belong_to_location_long = homeLocation[1];
        item.belong_to_location_radius = homeLocation[2];
      }

      return item;
    });
    enrichedData = this.addNightData(enrichedData);

    return enrichedData;
  }

  /**
   * Adds night data entries (at 00:00:00 and 23:59:59) to the input data array to ensure completeness for each day.
   * @param data An array of data entries.
   * @returns A new array of data entries with additional entries for the start and end of each day.
   */
  // @ts-ignore
  protected addNightData(data: any[]) {
    // @ts-ignore
    const lastDate = new Date(data[0].recorded_at);
    let newData: any = [];
    newData.push(this.add0date(data[0]));
    for (let i = 0; i < data.length; i++) {
      const date = new Date(data[i].recorded_at.toString());
      if (date.getDate() !== lastDate.getDate()) {
        newData.push(this.add24date(data[i - 1]));
        newData.push(this.add0date(data[i]));
        newData.push(data[i]);
      } else {
        newData.push(data[i]);
      }
      lastDate.setDate(date.getDate());
    }

    newData.push(this.add24date(data[data.length - 1]));
    return newData;
  }

  /**
   * Adds a data entry for the start of a day (00:00:00).
   * @param data The original data entry.
   * @returns A new data entry with the recorded_at timestamp set to 00:00:00 for the same date.
   */
  private add0date(data: any) {
    const copy = JSON.parse(JSON.stringify(data));
    const dateStringArray = data.recorded_at.toString().split(' ');
    const dateString = dateStringArray[0] + ' 00:00:00.000000';
    copy.recorded_at = dateString;
    return copy;
  }

  /**
   * Adds a data entry for the end of a day (23:59:59).
   * @param data The original data entry.
   * @returns A new data entry with the recorded_at timestamp set to 23:59:59 for the same date.
   */
  private add24date(data: any) {
    const copy = JSON.parse(JSON.stringify(data));
    const dateStringArray = data.recorded_at.toString().split(' ');
    const dateString = dateStringArray[0] + ' 23:59:59.999999';
    copy.recorded_at = dateString;
    return copy;
  }

  /**
   * Groups the data entries by date.
   * @param data An array of data entries.
   * @returns An object where each key is a date and the corresponding value is an array of data entries for that date.
   */
  // @ts-ignore
  protected dataPerDate(data) {
    // @ts-ignore
    return data.reduce((prev, curr) => {
      const date = curr?.recorded_at?.trim().split(' ')[0];
      if (!(date in prev)) {
        prev[date] = [];
      }
      prev[date].push(curr);
      return prev;
    }, {});
  }

  /**
   * Checks if an item is within the predefined home location.
   * @param item The data item to be checked.
   * @returns True if the item is within the home location, false otherwise.
   */
  // @ts-ignore
  protected isInHome(item) {
    return (
      item?.belong_to_location_lat == this.homeLocation[0] &&
      item?.belong_to_location_long == this.homeLocation[1] &&
      item?.belong_to_location_radius == this.homeLocation[2]
    );
  }

  /**
   * Groups the list of data entries into consecutive time ranges spent at home.
   * @param list An array of data entries.
   * @returns A list of consecutive time ranges spent at home.
   */
  // @ts-ignore
  protected getStayAtHomeTimeRangeList(list) {
    let groupList = [[]];
    let groupIndex = 0;

    for (let i = 0; i < list.length; i++) {
      if (this.isInHome(list[i])) {
        // @ts-ignore
        groupList[groupIndex].push(list[i]);
        if (!this.isInHome(list[i + 1])) {
          groupIndex += 1;
          groupList[groupIndex] = [];
        }
      }

      if (!this.isInHome(list[i])) {
        continue;
      }
    }
    return groupList;
  }

  /**
   * Gets the first and last elements of each list.
   * @param list An array of lists.
   * @returns An array containing the first and last elements of each list.
   */
  // @ts-ignore
  protected getFirstAndLast(list) {
    // @ts-ignore
    return (
      list
        // @ts-ignore
        .filter(i => i.length >= 2)
        // @ts-ignore
        .map(i => {
          const { 0: firstItem, length, [length - 1]: lastItem } = i;
          return [firstItem, lastItem];
        })
    );
  }

  /**
   * Calculates the time range between the start and end timestamps in a list of data entries.
   * @param list An array of data entries.
   * @returns The time range between the start and end timestamps in hours.
   */
  // @ts-ignore
  protected calcTimeRange(list) {
    // @ts-ignore
    const [start, end] = list.map(i => +new Date(i.recorded_at.trim()));
    return end - start;
  }

  /**
   * Calculates the total hours spent at home for each user based on the provided time range lists.
   * @param list An object where each key is a user identifier and the corresponding value is an array of time range lists.
   * @returns An object where each key is a user identifier and the corresponding value is the total hours spent at home.
   */
  // @ts-ignore
  protected getStayAtHomeHourList(list) {
    const stayAtHomeHourList = {};
    for (const [k, v] of Object.entries(list)) {
      const stayAtHomeTimeRangeList = this.getStayAtHomeTimeRangeList(v);
      const stayAtHomeTimeHeadTail = this.getFirstAndLast(stayAtHomeTimeRangeList);
      const timestampList = stayAtHomeTimeHeadTail.map(this.calcTimeRange);
      // @ts-ignore
      const stayAtHomeTotalTimestamp = timestampList.reduce((prev, curr) => prev + curr, 0);
      const hours = stayAtHomeTotalTimestamp / (1000 * 60 * 60);
      // @ts-ignore
      stayAtHomeHourList[k] = (+hours).toFixed(2);
    }
    return stayAtHomeHourList;
  }

  // @ts-ignore
  protected getChartData(list) {
    const result = [];
    for (const [k, v] of Object.entries(list)) {
      // @ts-ignore
      result.push({ date: k, hours: v, hourPercentage: +(+v / 24).toFixed(4) });
    }

    return result;
  }

  //--------Overview of Time Spent in Different Ranges (Last 7 Days)----------------------
  /**
   * Calculates the daily duration spent in different distance ranges from home.
   * @param locationInfos An array containing information about each location, including distance from home, frequency, and duration.
   * @returns An array representing the daily duration spent in different distance ranges from home.
   */
  protected getDailyDurationByDistanceRange(locationInfos: any[]) {
    const categories = [
      { range: 'At Home', locations: new Set(), visits: 0, duration: 0 },
      { range: '<1km', locations: new Set(), visits: 0, duration: 0 },
      { range: '<5km', locations: new Set(), visits: 0, duration: 0 },
      { range: '>5km', locations: new Set(), visits: 0, duration: 0 },
    ];

    locationInfos.forEach(info => {
      let categoryIndex;
      if (info.home_distance === 0) {
        categoryIndex = 0;
      } else if (info.home_distance < 1000) {
        categoryIndex = 1;
      } else if (info.home_distance < 5000) {
        categoryIndex = 2;
      } else {
        categoryIndex = 3;
      }

      categories[categoryIndex].locations.add(info.location);
      categories[categoryIndex].visits += info.frequency;
      categories[categoryIndex].duration += info.duration;
    });

    // Convert Set of locations to count
    categories.forEach(category => {
      //@ts-ignore
      category.locations = category.locations.size;
    });

    return categories;
  }

  //--------Time Spent in Different Ranges per Date (Last 7 Days)----------------------

  /**
   * Calculates the daily duration spent in different distance ranges from home per date for the last 7 days.
   * @param weekDateList An array containing the dates for the last 7 days.
   * @returns An array representing the daily duration spent in different distance ranges from home per date.
   */
  protected getDailyDurationByDistanceRangePerDate(weekDateList: any[]) {
    const categories: { day: string; atHome: number; less1km: number; less5km: number; above5km: number }[] = [];
    //let dailyDurationDataPerDate

    Object.keys(weekDateList).forEach(date => {
      categories.push({ day: date, atHome: 0, less1km: 0, less5km: 0, above5km: 0 });

      //@ts-ignore
      const eachDate = weekDateList[date];
      const dailyLocationInfos = this.findLocationInfos(
        this.extractStayDetails(eachDate),
        this.homeLocation[0],
        this.homeLocation[1],
        this.homeLocation[2],
      );
      const dailyDurationData = this.getDailyDurationByDistanceRange(dailyLocationInfos);
      categories[categories.length - 1].atHome = dailyDurationData[0].duration;
      categories[categories.length - 1].less1km = dailyDurationData[1].duration;
      categories[categories.length - 1].less5km = dailyDurationData[2].duration;
      categories[categories.length - 1].above5km = dailyDurationData[3].duration;
    });

    const formattedCategories = categories.map(item => {
      const formattedDay = item.day.replace(/-/g, '');

      const total = item.atHome + item.less1km + item.less5km + item.above5km;

      const atHomePct = item.atHome / total;
      const less1kmPct = item.less1km / total;
      const less5kmPct = item.less5km / total;
      const above5kmPct = item.above5km / total;

      return {
        day: formattedDay,
        atHome: atHomePct,
        less1km: less1kmPct,
        less5km: less5kmPct,
        above5km: above5kmPct,
      };
    });

    return formattedCategories;
  }

  //-----Total Duration of visits by different distance range from home per Month----------

  /**
   * Filters the data to include only entries from the last 12 months.
   * @param data The data entries to filter.
   * @returns The filtered data containing entries from the last 12 months.
   */
  //@ts-ignore
  protected findDataInLast12Months(data) {
    const startDate = new Date();
    startDate.setMonth(new Date().getMonth() - 11);
    const startDateYear = startDate.getFullYear();
    const startDateMonth = startDate.getMonth() + 1;

    //@ts-ignore
    const result = data.filter(item => {
      const itemDate = new Date(item.recorded_at);
      return (
        (itemDate.getFullYear() === startDateYear && itemDate.getMonth() + 1 >= startDateMonth) || itemDate.getFullYear() > startDateYear
      );
    });

    return result;
  }

  /**
   * Groups the data by year and month.
   * @param data An array of data objects.
   * @returns An object with data grouped by year and month.
   */
  protected dataPerMonth(data: any[]) {
    return data.reduce((prev, curr) => {
      const date = new Date(curr?.recorded_at);
      const yearMonth = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');

      if (!(yearMonth in prev)) {
        prev[yearMonth] = [];
      }
      prev[yearMonth].push(curr);
      return prev;
    }, {});
  }

  /**
   * Calculates the monthly data for each distance range from home.
   * @param data An array containing the data for each month.
   * @returns An object representing the monthly data for each distance range from home.
   */
  protected getmonthlyDurationData(dataPerMonth: any[]) {
    const categories: { month: string; atHome: number; less1km: number; less5km: number; above5km: number }[] = [];

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

    for (let i = 0; i < months.length; i++) {
      categories.push({ month: months[i], atHome: 0, less1km: 0, less5km: 0, above5km: 0 });
    }

    Object.keys(dataPerMonth).forEach(yearMonth => {
      categories.push({ month: yearMonth, atHome: 0, less1km: 0, less5km: 0, above5km: 0 });

      //@ts-ignore
      const eachMonth = dataPerMonth[yearMonth];

      const cluster = this.dbscan(this.rankLocationsByOccurrence(this.convertData(eachMonth)));
      const dataWithAttributes = this.addLocationAttributesToData(eachMonth, cluster, this.homeLocation);
      const locationInfos = this.findLocationInfos(
        this.extractStayDetails(dataWithAttributes),
        this.homeLocation[0],
        this.homeLocation[1],
        this.homeLocation[2],
      );

      const dailyDurationData = this.getDailyDurationByDistanceRange(locationInfos);
      categories[categories.length - 1].atHome = dailyDurationData[0].duration;
      categories[categories.length - 1].less1km = dailyDurationData[1].duration;
      categories[categories.length - 1].less5km = dailyDurationData[2].duration;
      categories[categories.length - 1].above5km = dailyDurationData[3].duration;
    });

    const formattedCategories = categories.map(item => {
      const formattedDay = item.month.replace(/-/g, '');
      const total = item.atHome + item.less1km + item.less5km + item.above5km;

      if (total == 0) {
        return {
          month: formattedDay,
          atHome: 0,
          less1km: 0,
          less5km: 0,
          above5km: 0,
        };
      }

      const atHomePct = item.atHome / total;
      const less1kmPct = item.less1km / total;
      const less5kmPct = item.less5km / total;
      const above5kmPct = item.above5km / total;

      return {
        month: formattedDay,
        atHome: atHomePct,
        less1km: less1kmPct,
        less5km: less5kmPct,
        above5km: above5kmPct,
      };
    });
    return formattedCategories.sort((a, b) => {
      // @ts-ignore
      return a.month - b.month;
    });
  }

  //-----Frequency of visits by different distance range from home per Month----------

  /**
   * Calculates the monthly frequency data for each distance range from home.
   * @param dataPerMonth An object containing the data for each month.
   * @returns An object representing the monthly frequency data for each distance range from home.
   */
  protected getmonthlyFrequencyData(dataPerMonth: any[]) {
    const categories: { month: string; atHome: number; less1km: number; less5km: number; above5km: number }[] = [];

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

    for (let i = 0; i < months.length; i++) {
      categories.push({ month: months[i], atHome: 0, less1km: 0, less5km: 0, above5km: 0 });
    }

    Object.keys(dataPerMonth).forEach(yearMonth => {
      categories.push({ month: yearMonth, atHome: 0, less1km: 0, less5km: 0, above5km: 0 });

      //@ts-ignore
      const eachMonth = dataPerMonth[yearMonth];

      const cluster = this.dbscan(this.rankLocationsByOccurrence(this.convertData(eachMonth)));
      const dataWithAttributes = this.addLocationAttributesToData(eachMonth, cluster, this.homeLocation);
      const locationInfos = this.findLocationInfos(
        this.extractStayDetails(dataWithAttributes),
        this.homeLocation[0],
        this.homeLocation[1],
        this.homeLocation[2],
      );
      const dailyDurationData = this.getDailyDurationByDistanceRange(locationInfos);
      categories[categories.length - 1].atHome = dailyDurationData[0].visits;
      categories[categories.length - 1].less1km = dailyDurationData[1].visits;
      categories[categories.length - 1].less5km = dailyDurationData[2].visits;
      categories[categories.length - 1].above5km = dailyDurationData[3].visits;
    });

    const formattedCategories = categories.map(item => {
      const formattedDay = item.month.replace(/-/g, '');
      const total = item.atHome + item.less1km + item.less5km + item.above5km;

      if (total == 0) {
        return {
          month: formattedDay,
          atHome: 0,
          less1km: 0,
          less5km: 0,
          above5km: 0,
        };
      }

      const atHomePct = item.atHome / total;
      const less1kmPct = item.less1km / total;
      const less5kmPct = item.less5km / total;
      const above5kmPct = item.above5km / total;

      return {
        month: formattedDay,
        atHome: atHomePct,
        less1km: less1kmPct,
        less5km: less5kmPct,
        above5km: above5kmPct,
      };
    });
    //@ts-ignore
    return formattedCategories.sort((a, b) => {
      // @ts-ignore
      return a.month - b.month;
    });
  }

  //-----Location Number of visits by different distance range from home per Month----------
  /**
   * Calculates the monthly location number data.
   * @param dataPerMonth An array containing data grouped by year and month.
   * @returns An array containing monthly location number data.
   */
  protected getmonthlyLocationNumberData(dataPerMonth: any[]) {
    const categories: { month: string; less1km: number; less5km: number; above5km: number }[] = [];

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

    for (let i = 0; i < months.length; i++) {
      categories.push({ month: months[i], less1km: 0, less5km: 0, above5km: 0 });
    }

    Object.keys(dataPerMonth).forEach(yearMonth => {
      categories.push({ month: yearMonth, less1km: 0, less5km: 0, above5km: 0 });

      //@ts-ignore
      const eachMonth = dataPerMonth[yearMonth];

      const cluster = this.dbscan(this.rankLocationsByOccurrence(this.convertData(eachMonth)));
      const dataWithAttributes = this.addLocationAttributesToData(eachMonth, cluster, this.homeLocation);
      const locationInfos = this.findLocationInfos(
        this.extractStayDetails(dataWithAttributes),
        this.homeLocation[0],
        this.homeLocation[1],
        this.homeLocation[2],
      );

      const dailyDurationData = this.getDailyDurationByDistanceRange(locationInfos);
      categories[categories.length - 1].less1km = +dailyDurationData[1].locations;
      categories[categories.length - 1].less5km = +dailyDurationData[2].locations;
      categories[categories.length - 1].above5km = +dailyDurationData[3].locations;
    });

    const formattedCategories = categories.map(item => {
      const formattedDay = item.month.replace(/-/g, '');
      const total = item.less1km + item.less5km + item.above5km;

      if (total == 0) {
        return {
          month: formattedDay,
          less1km: 0,
          less5km: 0,
          above5km: 0,
        };
      }

      const less1kmPct = item.less1km / total;
      const less5kmPct = item.less5km / total;
      const above5kmPct = item.above5km / total;

      return {
        month: formattedDay,
        less1km: less1kmPct,
        less5km: less5kmPct,
        above5km: above5kmPct,
      };
    });

    //@ts-ignore
    return formattedCategories.sort((a, b) => {
      // @ts-ignore
      return a.month - b.month;
    });
  }

  // Total Duration of visits by different distance range from home in specific month

  /**
   * Retrieves the last 12 months.
   * @returns An array containing the last 12 months.
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
   * Calculates the daily duration data within a specific month.
   * @param dailyDataInMonth An array containing daily data within a specific month.
   * @returns An array containing daily duration data within a specific month.
   */
  protected getDailyDurationDataInMonth(dailyDataInMonth: any[]) {
    const categories: { day: string; atHome: number; less1km: number; less5km: number; above5km: number }[] = [];

    Object.keys(dailyDataInMonth).forEach(date => {
      categories.push({ day: date, atHome: 0, less1km: 0, less5km: 0, above5km: 0 });

      //@ts-ignore
      const dataWithAttributes = dailyDataInMonth[date];

      const locationInfos = this.findLocationInfos(
        this.extractStayDetails(dataWithAttributes),
        this.homeLocation[0],
        this.homeLocation[1],
        this.homeLocation[2],
      );

      const dailyDurationData = this.getDailyDurationByDistanceRange(locationInfos);
      categories[categories.length - 1].atHome = dailyDurationData[0].duration;
      categories[categories.length - 1].less1km = dailyDurationData[1].duration;
      categories[categories.length - 1].less5km = dailyDurationData[2].duration;
      categories[categories.length - 1].above5km = dailyDurationData[3].duration;
    });

    const formattedCategories = categories.map(item => {
      const formattedDay = item.day.replace(/-/g, '');
      const total = item.atHome + item.less1km + item.less5km + item.above5km;

      if (total == 0) {
        return {
          day: formattedDay,
          atHome: 0,
          less1km: 0,
          less5km: 0,
          above5km: 0,
        };
      }

      const atHomePct = item.atHome / total;
      const less1kmPct = item.less1km / total;
      const less5kmPct = item.less5km / total;
      const above5kmPct = item.above5km / total;

      return {
        day: formattedDay,
        atHome: atHomePct,
        less1km: less1kmPct,
        less5km: less5kmPct,
        above5km: above5kmPct,
      };
    });

    return formattedCategories;
  }

  //Frequency of visits by different distance range from home in specific month
  /**
   * Calculates the daily frequency data within a specific month.
   * @param dailyDataInMonth An array containing daily data within a specific month.
   * @returns An array containing daily frequency data within a specific month.
   */
  protected getDailyFrequencyDataInMonth(dailyDataInMonth: any[]) {
    const categories: { day: string; atHome: number; less1km: number; less5km: number; above5km: number }[] = [];

    Object.keys(dailyDataInMonth).forEach(date => {
      categories.push({ day: date, atHome: 0, less1km: 0, less5km: 0, above5km: 0 });

      //@ts-ignore
      const dataWithAttributes = dailyDataInMonth[date];

      const locationInfos = this.findLocationInfos(
        this.extractStayDetails(dataWithAttributes),
        this.homeLocation[0],
        this.homeLocation[1],
        this.homeLocation[2],
      );
      const dailyDurationData = this.getDailyDurationByDistanceRange(locationInfos);
      categories[categories.length - 1].atHome = dailyDurationData[0].visits;
      categories[categories.length - 1].less1km = dailyDurationData[1].visits;
      categories[categories.length - 1].less5km = dailyDurationData[2].visits;
      categories[categories.length - 1].above5km = dailyDurationData[3].visits;
    });

    const formattedCategories = categories.map(item => {
      const formattedDay = item.day.replace(/-/g, '');

      const total = item.atHome + item.less1km + item.less5km + item.above5km;

      if (total == 0) {
        return {
          day: formattedDay,
          atHome: 0,
          less1km: 0,
          less5km: 0,
          above5km: 0,
        };
      }

      const atHomePct = item.atHome / total;
      const less1kmPct = item.less1km / total;
      const less5kmPct = item.less5km / total;
      const above5kmPct = item.above5km / total;

      return {
        day: formattedDay,
        atHome: atHomePct,
        less1km: less1kmPct,
        less5km: less5kmPct,
        above5km: above5kmPct,
      };
    });

    return formattedCategories;
  }

  //Location Number of visits by different distance range from home in specific month
  /**
   * Calculates the daily location number data within a specific month.
   * @param dailyDataInMonth An array containing daily data within a specific month.
   * @returns An array containing daily location number data within a specific month.
   */
  protected getDailyLocationNumberDataInMonth(dailyDataInMonth: any[]) {
    const categories: { day: string; less1km: number; less5km: number; above5km: number }[] = [];

    Object.keys(dailyDataInMonth).forEach(date => {
      categories.push({ day: date, less1km: 0, less5km: 0, above5km: 0 });

      //@ts-ignore
      const dataWithAttributes = dailyDataInMonth[date];

      const locationInfos = this.findLocationInfos(
        this.extractStayDetails(dataWithAttributes),
        this.homeLocation[0],
        this.homeLocation[1],
        this.homeLocation[2],
      );
      const dailyDurationData = this.getDailyDurationByDistanceRange(locationInfos);
      categories[categories.length - 1].less1km = +dailyDurationData[1].locations;
      categories[categories.length - 1].less5km = +dailyDurationData[2].locations;
      categories[categories.length - 1].above5km = +dailyDurationData[3].locations;
    });

    const formattedCategories = categories.map(item => {
      const formattedDay = item.day.replace(/-/g, '');
      const total = item.less1km + item.less5km + item.above5km;

      if (total == 0) {
        return {
          day: formattedDay,
          less1km: 0,
          less5km: 0,
          above5km: 0,
        };
      }

      const less1kmPct = item.less1km / total;
      const less5kmPct = item.less5km / total;
      const above5kmPct = item.above5km / total;

      return {
        day: formattedDay,
        less1km: less1kmPct,
        less5km: less5kmPct,
        above5km: above5kmPct,
      };
    });

    return formattedCategories;
  }

  /**
   * Finds the most recent date from the provided data.
   * @param data An array containing data with recorded_at timestamps.
   * @returns The most recent date.
   */
  protected findMostRecentData(data: any[]) {
    // Create a new array with Date objects from recorded_at, without modifying the original data
    // @ts-ignore
    const dates = data.map(entry => new Date(entry.recorded_at));

    // @ts-ignore
    const mostRecentTime = new Date(Math.max(...dates)); // EndDate
    const mostRecentDate = new Date(mostRecentTime.toDateString());

    return mostRecentDate;
  }

  // -----------------------Algorithm -----------------------
  // @ts-ignore
  /**
   * Calculates the Haversine distance between two points on Earth.
   * @param {number} lat1 - Latitude of the first point.
   * @param {number} lon1 - Longitude of the first point.
   * @param {number} lat2 - Latitude of the second point.
   * @param {number} lon2 - Longitude of the second point.
   * @returns {number} The Haversine distance between the two points in meters.
   */
  protected haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    //@ts-ignore
    const toRadians = angle => (angle * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance;
  }

  // @ts-ignore
  /**
   * Gets neighboring locations within a certain distance from a given location.
   * @param {Object} leader - The leader location.
   * @param {Object} location - The location to find neighbors for.
   * @param {Object[]} final_locations - Array of all locations.
   * @returns {Object[]} An array of neighboring locations.
   */
  protected getNeighbors(leader: any, location: any, final_locations: any) {
    //@ts-ignore
    return final_locations.filter(other => {
      const distance = this.haversine(location.key[0], location.key[1], other.key[0], other.key[1]);
      const distance_leader = this.haversine(leader.key[0], leader.key[1], other.key[0], other.key[1]);
      const combinedRadius = Math.max(location.radius, other.radius) / 2;
      return distance <= combinedRadius && distance_leader < leader.radius / 2;
    });
  }

  // @ts-ignore
  /**
   * Expands a cluster by recursively adding neighboring locations.
   * @param {Object} leader - The leader location.
   * @param {Object} location - The current location to expand from.
   * @param {Object[]} neighbors - Neighboring locations of the current location.
   * @param {Object[]} cluster - The cluster being expanded.
   * @param {number[]} clusterMembers - IDs of members in the cluster.
   * @param {Set} visited - Set of visited locations.
   * @param {Object[]} locations - Array of all locations.
   */
  protected expandCluster(leader: any, location: any, neighbors: any, cluster: any, clusterMembers: any, visited: any, locations: any) {
    if (!visited.has(location.key)) {
      cluster.push({
        location: location.key,
        radius: location.radius,
        frequency: location.frequency,
      });
      clusterMembers.push(...location.ids);
      visited.add(location.key);
    }

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.key)) {
        visited.add(neighbor.key);
        clusterMembers.push(...neighbor.ids);
        const neighborNeighbors = this.getNeighbors(leader, neighbor, locations);
        this.expandCluster(leader, neighbor, neighborNeighbors, cluster, clusterMembers, visited, locations);
      }
    }
  }

  // @ts-ignore
  /**
   * Performs DBSCAN clustering algorithm on given locations.
   * @param {Object[]} locations - Array of locations to cluster.
   * @returns {Object[]} An array of clusters.
   */
  protected dbscan(locations: any) {
    const clusters = [];
    const visited = new Set();

    for (const location of locations) {
      if (!visited.has(location.key)) {
        const neighbors = this.getNeighbors(location, location, locations);
        //@ts-ignore
        const cluster = [];
        //@ts-ignore
        const clusterMembers = [];
        //@ts-ignore
        this.expandCluster(location, location, neighbors, cluster, clusterMembers, visited, locations);
        clusters.push({
          //@ts-ignore
          leader: cluster,
          //@ts-ignore
          members: clusterMembers,
        });
      }
    }
    return clusters;
  }
}
