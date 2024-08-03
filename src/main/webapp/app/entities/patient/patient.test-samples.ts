import { IPatient, NewPatient } from './patient.model';

export const sampleWithRequiredData: IPatient = {
  id: 26355,
};

export const sampleWithPartialData: IPatient = {
  id: 24194,
  health: 'huzzah drat',
  nickname: 'yuck befremdlicherweise westwärts',
  title: 'Gerste tingeln Globalisierung',
};

export const sampleWithFullData: IPatient = {
  id: 27817,
  health: 'anjetzt hinsichtlich heuern',
  geo: 'Zeitalter kostbar',
  user_id: 9569,
  nickname: 'illegal darin seitwärts',
  title: 'besonders zuliebe überallhin',
  birthday: 'mehrmals an inspirierend',
  sex: 'unkonventionell aha',
  medical_preconditions: 'wherever',
  home_latitude: 134,
  home_longitude: 134,
};

export const sampleWithNewData: NewPatient = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
