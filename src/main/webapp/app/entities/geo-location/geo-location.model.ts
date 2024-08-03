import { IPatient } from 'src/main/webapp/app/entities/patient/patient.model';
import { geoFence } from 'src/main/webapp/app/entities/enumerations/geo-fence.model';
import { geoFenceDetailedStatus } from 'src/main/webapp/app/entities/enumerations/geo-fence-detailed-status.model';

export interface IGeoLocation {
  id: number;
  longitude?: number | null;
  acquired_at?: string | null;
  geo_fence_status?: keyof typeof geoFence | null;
  connected_to_trusted_wifi?: boolean | null;
  source_of_geolocation?: string | null;
  latitude?: number | null;
  recorded_at?: string | null;
  accuracy?: number | null;
  geofence_detailed_status?: keyof typeof geoFenceDetailedStatus | null;
  just_left_geofence_time?: string | null;
  user_id?: number | null;
  patient?: Pick<IPatient, 'id'> | null;
}

export type NewGeoLocation = Omit<IGeoLocation, 'id'> & { id: null };

export interface ICalculateData {
  id: string;
  lon: number;
  lat: number;
  radius: number;
}

export interface IDataWithFrequency {
  key: number[];
  frequency: number;
  radius: number;
  ids: number[];
}

export interface ILeader {
  location: number[];
  frequency: number;
  radius: number;
}

export interface IResult {
  leader: ILeader;
  members: number[];
}
