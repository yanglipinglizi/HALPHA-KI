export interface IPatient {
  id: number;
  health?: string | null;
  geo?: string | null;
  user_id?: number | null;
  nickname?: string | null;
  title?: string | null;
  home_longitude?: number | null;
  home_latitude?: number | null;
  birthday?: string | null;
  sex?: string | null;
  medical_preconditions?: string | null;
}

export type NewPatient = Omit<IPatient, 'id'> & { id: null };
