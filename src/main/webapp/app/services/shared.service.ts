import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SharedService {
  private summaryMap = new Map<string, BehaviorSubject<string>>();
  private geoSummaryMap = new Map<string, BehaviorSubject<string>>();
  private activitySummaryMap = new Map<string, BehaviorSubject<string>>();

  updateSummary(userId: string, summary: string) {
    if (!this.summaryMap.has(userId)) {
      this.summaryMap.set(userId, new BehaviorSubject<string>(''));
    }
    this.summaryMap.get(userId)?.next(summary);
  }

  getSummary(userId: string) {
    if (!this.summaryMap.has(userId)) {
      this.summaryMap.set(userId, new BehaviorSubject<string>(''));
    }
    return this.summaryMap.get(userId)?.asObservable();
  }

  updateGeoSummary(userId: string, summary: string) {
    if (!this.geoSummaryMap.has(userId)) {
      this.geoSummaryMap.set(userId, new BehaviorSubject<string>(''));
    }
    this.geoSummaryMap.get(userId)?.next(summary);
  }

  getGeoSummary(userId: string) {
    if (!this.geoSummaryMap.has(userId)) {
      this.geoSummaryMap.set(userId, new BehaviorSubject<string>(''));
    }
    return this.geoSummaryMap.get(userId)?.asObservable();
  }

  updateActivitySummary(userId: string, summary: string) {
    if (!this.activitySummaryMap.has(userId)) {
      this.activitySummaryMap.set(userId, new BehaviorSubject<string>(''));
    }
    this.activitySummaryMap.get(userId)?.next(summary);
  }

  getActivitySummary(userId: string) {
    if (!this.activitySummaryMap.has(userId)) {
      this.activitySummaryMap.set(userId, new BehaviorSubject<string>(''));
    }
    return this.activitySummaryMap.get(userId)?.asObservable();
  }
}
