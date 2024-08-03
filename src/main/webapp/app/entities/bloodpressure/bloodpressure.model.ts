import { IPatient } from 'src/main/webapp/app/entities/patient/patient.model';

export interface IBloodpressure {
  id: number;
  systolic?: number | null;
  diastolic?: number | null;
  pulse?: number | null;
  recorded_at?: string | null;
  userId?: number | null;
  patient?: Pick<IPatient, 'id'> | null;
}

export type NewBloodpressure = Omit<IBloodpressure, 'id'> & { id: null };

export interface IMappedBP {
  Datum: string;
  Zeitslot: string;
  Systolisch: number;
  Diastolisch: number;
  Puls: number;
  date: string;
  month: number;
  user_id: number;
}

export interface IAverageData {
  date: string;
  year: string;
  month: number;
  timeBox: string;
  avgSystolicBP: number;
  avgDiastolicBP: number;
  avgPulse: number;
}

export interface DailyAverage {
  count: number;
  totalSystolic: number;
  totalDiastolic: number;
  totalPulse: number;
  year: string;
  month: number;
}

export interface Accumulator {
  [key: string]: DailyAverage;
}
