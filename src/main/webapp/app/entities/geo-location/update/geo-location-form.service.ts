import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { IGeoLocation, NewGeoLocation } from '../geo-location.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IGeoLocation for edit and NewGeoLocationFormGroupInput for create.
 */
type GeoLocationFormGroupInput = IGeoLocation | PartialWithRequiredKeyOf<NewGeoLocation>;

type GeoLocationFormDefaults = Pick<NewGeoLocation, 'id' | 'connected_to_trusted_wifi'>;

type GeoLocationFormGroupContent = {
  id: FormControl<IGeoLocation['id'] | NewGeoLocation['id']>;
  longitude: FormControl<IGeoLocation['longitude']>;
  acquired_at: FormControl<IGeoLocation['acquired_at']>;
  geo_fence_status: FormControl<IGeoLocation['geo_fence_status']>;
  connected_to_trusted_wifi: FormControl<IGeoLocation['connected_to_trusted_wifi']>;
  source_of_geolocation: FormControl<IGeoLocation['source_of_geolocation']>;
  latitude: FormControl<IGeoLocation['latitude']>;
  recorded_at: FormControl<IGeoLocation['recorded_at']>;
  accuracy: FormControl<IGeoLocation['accuracy']>;
  geofence_detailed_status: FormControl<IGeoLocation['geofence_detailed_status']>;
  just_left_geofence_time: FormControl<IGeoLocation['just_left_geofence_time']>;
  user_id: FormControl<IGeoLocation['user_id']>;
  patient: FormControl<IGeoLocation['patient']>;
};

export type GeoLocationFormGroup = FormGroup<GeoLocationFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class GeoLocationFormService {
  createGeoLocationFormGroup(geoLocation: GeoLocationFormGroupInput = { id: null }): GeoLocationFormGroup {
    const geoLocationRawValue = {
      ...this.getFormDefaults(),
      ...geoLocation,
    };
    return new FormGroup<GeoLocationFormGroupContent>({
      id: new FormControl(
        { value: geoLocationRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      longitude: new FormControl(geoLocationRawValue.longitude),
      acquired_at: new FormControl(geoLocationRawValue.acquired_at),
      geo_fence_status: new FormControl(geoLocationRawValue.geo_fence_status),
      connected_to_trusted_wifi: new FormControl(geoLocationRawValue.connected_to_trusted_wifi),
      source_of_geolocation: new FormControl(geoLocationRawValue.source_of_geolocation),
      latitude: new FormControl(geoLocationRawValue.latitude),
      recorded_at: new FormControl(geoLocationRawValue.recorded_at),
      accuracy: new FormControl(geoLocationRawValue.accuracy),
      geofence_detailed_status: new FormControl(geoLocationRawValue.geofence_detailed_status),
      just_left_geofence_time: new FormControl(geoLocationRawValue.just_left_geofence_time),
      user_id: new FormControl(geoLocationRawValue.user_id),
      patient: new FormControl(geoLocationRawValue.patient),
    });
  }

  getGeoLocation(form: GeoLocationFormGroup): IGeoLocation | NewGeoLocation {
    return form.getRawValue() as IGeoLocation | NewGeoLocation;
  }

  resetForm(form: GeoLocationFormGroup, geoLocation: GeoLocationFormGroupInput): void {
    const geoLocationRawValue = { ...this.getFormDefaults(), ...geoLocation };
    form.reset(
      {
        ...geoLocationRawValue,
        id: { value: geoLocationRawValue.id, disabled: true },
      } as any /* cast to workaround https://github.com/angular/angular/issues/46458 */,
    );
  }

  private getFormDefaults(): GeoLocationFormDefaults {
    return {
      id: null,
      connected_to_trusted_wifi: false,
    };
  }
}
