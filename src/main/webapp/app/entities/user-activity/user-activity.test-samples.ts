import { IUserActivity, NewUserActivity } from './user-activity.model';

export const sampleWithRequiredData: IUserActivity = {
  id: 31807,
};

export const sampleWithPartialData: IUserActivity = {
  id: 914,
  reportedFor: 'oh wogegen südöstlich',
};

export const sampleWithFullData: IUserActivity = {
  id: 15660,
  reportedFor: 'altertümeln whoa schließlich',
  recordedAt: 'Geburtenkontrolle qualvoll',
  userId: 28537,
  reportedAbsoluteCount: 12363,
};

export const sampleWithNewData: NewUserActivity = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
