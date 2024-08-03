package de.almaphil.insights.domain;

import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class BloodpressureTestSamples {

    private static final Random random = new Random();
    private static final AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));
    private static final AtomicInteger intCount = new AtomicInteger(random.nextInt() + (2 * Short.MAX_VALUE));

    public static Bloodpressure getBloodpressureSample1() {
        return new Bloodpressure().id(1L).systolic(1).diastolic(1).pulse(1).recorded_at("recorded_at1").userId(1L);
    }

    public static Bloodpressure getBloodpressureSample2() {
        return new Bloodpressure().id(2L).systolic(2).diastolic(2).pulse(2).recorded_at("recorded_at2").userId(2L);
    }

    public static Bloodpressure getBloodpressureRandomSampleGenerator() {
        return new Bloodpressure()
            .id(longCount.incrementAndGet())
            .systolic(intCount.incrementAndGet())
            .diastolic(intCount.incrementAndGet())
            .pulse(intCount.incrementAndGet())
            .recorded_at(UUID.randomUUID().toString())
            .userId(longCount.incrementAndGet());
    }
}
