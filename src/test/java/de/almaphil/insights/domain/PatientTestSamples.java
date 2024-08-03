package de.almaphil.insights.domain;

import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

public class PatientTestSamples {

    private static final Random random = new Random();
    private static final AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    // private static final AtomicFloat floatCount = new AtomicFloat(random.nextFloat() + (2 * Integer.MAX_VALUE));

    // private static final AtomicReference<Float> floatCount = new AtomicReference<>((float) (random.nextInt() + (2 * Integer.MAX_VALUE)));

    public static Patient getPatientSample1() {
        return new Patient()
            .id(1L)
            .health("health1")
            .geo("geo1")
            .userId(1L)
            .nickname("nickname1")
            .title("title1")
            .birthday("birthday1")
            .sex("sex1")
            .home_latitude(1.0f)
            .home_longitude(1.0f)
            .medical_preconditions("medical_preconditions1");
    }

    public static Patient getPatientSample2() {
        return new Patient()
            .id(2L)
            .health("health2")
            .geo("geo2")
            .userId(2L)
            .nickname("nickname2")
            .title("title2")
            .birthday("birthday2")
            .sex("sex2")
            .home_latitude(2.0f)
            .home_longitude(2.0f)
            .medical_preconditions("medical_preconditions2");
    }

    public static Patient getPatientRandomSampleGenerator() {
        return new Patient()
            .id(longCount.incrementAndGet())
            .health(UUID.randomUUID().toString())
            .geo(UUID.randomUUID().toString())
            .userId(longCount.incrementAndGet())
            .nickname(UUID.randomUUID().toString())
            .title(UUID.randomUUID().toString())
            .birthday(UUID.randomUUID().toString())
            .sex(UUID.randomUUID().toString())
            .home_latitude(random.nextFloat())
            .home_longitude(random.nextFloat())
            .medical_preconditions(UUID.randomUUID().toString());
    }
}
