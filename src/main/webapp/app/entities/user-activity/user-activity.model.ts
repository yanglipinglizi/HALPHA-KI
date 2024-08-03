import { IPatient } from 'src/main/webapp/app/entities/patient/patient.model';

export interface IUserActivity {
  id: number;
  reportedFor?: string | null;
  recordedAt?: string | null;
  userId?: number | null;
  reportedAbsoluteCount?: number | null;
  patient?: Pick<IPatient, 'id'> | null;
}

export type NewUserActivity = Omit<IUserActivity, 'id'> & { id: null };
