package de.almaphil.insights.domain;

import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

public class GeoLocationTestSamples {

    private static final Random random = new Random();
    private static final AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    public static GeoLocation getGeoLocationSample1() {
        return new GeoLocation()
            .id(1L)
            .acquired_at("acquired_at1")
            .source_of_geolocation("source_of_geolocation1")
            .recorded_at("recorded_at1")
            .just_left_geofence_time("just_left_geofence_time1")
            .userId(1L);
    }

    public static GeoLocation getGeoLocationSample2() {
        return new GeoLocation()
            .id(2L)
            .acquired_at("acquired_at2")
            .source_of_geolocation("source_of_geolocation2")
            .recorded_at("recorded_at2")
            .just_left_geofence_time("just_left_geofence_time2")
            .userId(2L);
    }

    public static GeoLocation getGeoLocationRandomSampleGenerator() {
        return new GeoLocation()
            .id(longCount.incrementAndGet())
            .acquired_at(UUID.randomUUID().toString())
            .source_of_geolocation(UUID.randomUUID().toString())
            .recorded_at(UUID.randomUUID().toString())
            .just_left_geofence_time(UUID.randomUUID().toString())
            .userId(longCount.incrementAndGet());
    }
}
