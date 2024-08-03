import { IGeoLocation, NewGeoLocation } from './geo-location.model';

export const sampleWithRequiredData: IGeoLocation = {
  id: 22929,
};

export const sampleWithPartialData: IGeoLocation = {
  id: 12982,
  longitude: 32106.48,
  acquired_at: 'nor',
  connected_to_trusted_wifi: true,
  recorded_at: 'beiderseits unisono',
  just_left_geofence_time: 'heldenmütig alleweg phooey',
  user_id: 2833,
};

export const sampleWithFullData: IGeoLocation = {
  id: 158,
  longitude: 24949.59,
  acquired_at: 'stückweise mithin',
  geo_fence_status: 'ACCURACY_NEEDS_REFINEMENT',
  connected_to_trusted_wifi: true,
  source_of_geolocation: 'höflichkeitshalber willen for',
  latitude: 9119.05,
  recorded_at: 'oh konstruktiv',
  accuracy: 2961.82,
  geofence_detailed_status: 'IN_GEOFENCE',
  just_left_geofence_time: 'zowie',
  user_id: 5492,
};

export const sampleWithNewData: NewGeoLocation = {
  id: null,
};

Object.freeze(sampleWithNewData);
Object.freeze(sampleWithRequiredData);
Object.freeze(sampleWithPartialData);
Object.freeze(sampleWithFullData);
