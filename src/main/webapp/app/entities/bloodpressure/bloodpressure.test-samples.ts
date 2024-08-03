import { IBloodpressure, NewBloodpressure } from './bloodpressure.model';

export const sampleWithRequiredData: IBloodpressure = {
  id: 27007,
};

export const sampleWithPartialData: IBloodpressure = {
  id: 12580,
  recorded_at: 'Agnostizismus whoa',
};

export const sampleWithFullData: IBloodpressure = {
  id: 32463,
  systolic: 11081,
  diastolic: 19885,
  pulse: 16272,
  recorded_at: 'moralisieren Cholera Mathematiker',
  userId: 32488,
};

export const sampleWithNewData: NewBloodpressure = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
