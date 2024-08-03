package de.almaphil.insights.domain;

import java.util.Random;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class UserActivityTestSamples {

    private static final Random random = new Random();
    private static final AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));
    private static final AtomicInteger intCount = new AtomicInteger(random.nextInt() + (2 * Short.MAX_VALUE));

    public static UserActivity getUserActivitySample1() {
        return new UserActivity().id(1L).reportedFor("reportedFor1").recordedAt("recordedAt1").userId(1L).reportedAbsoluteCount(1);
    }

    public static UserActivity getUserActivitySample2() {
        return new UserActivity().id(2L).reportedFor("reportedFor2").recordedAt("recordedAt2").userId(2L).reportedAbsoluteCount(2);
    }

    public static UserActivity getUserActivityRandomSampleGenerator() {
        return new UserActivity()
            .id(longCount.incrementAndGet())
            .reportedFor(UUID.randomUUID().toString())
            .recordedAt(UUID.randomUUID().toString())
            .userId(longCount.incrementAndGet())
            .reportedAbsoluteCount(intCount.incrementAndGet());
    }
}
