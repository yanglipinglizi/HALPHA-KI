package de.almaphil.insights.domain;

import static de.almaphil.insights.domain.BloodpressureTestSamples.*;
import static de.almaphil.insights.domain.GeoLocationTestSamples.*;
import static de.almaphil.insights.domain.PatientTestSamples.*;
import static de.almaphil.insights.domain.UserActivityTestSamples.*;
import static org.assertj.core.api.Assertions.assertThat;

import de.almaphil.insights.web.rest.TestUtil;
import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class PatientTest {

    @Test
    void equalsVerifier() throws Exception {
        TestUtil.equalsVerifier(Patient.class);
        Patient patient1 = getPatientSample1();
        Patient patient2 = new Patient();
        assertThat(patient1).isNotEqualTo(patient2);

        patient2.setId(patient1.getId());
        assertThat(patient1).isEqualTo(patient2);

        patient2 = getPatientSample2();
        assertThat(patient1).isNotEqualTo(patient2);
    }

    @Test
    void bloodpressureTest() throws Exception {
        Patient patient = getPatientRandomSampleGenerator();
        Bloodpressure bloodpressureBack = getBloodpressureRandomSampleGenerator();

        patient.addBloodpressure(bloodpressureBack);
        assertThat(patient.getBloodpressures()).containsOnly(bloodpressureBack);
        assertThat(bloodpressureBack.getPatient()).isEqualTo(patient);

        patient.removeBloodpressure(bloodpressureBack);
        assertThat(patient.getBloodpressures()).doesNotContain(bloodpressureBack);
        assertThat(bloodpressureBack.getPatient()).isNull();

        patient.bloodpressures(new HashSet<>(Set.of(bloodpressureBack)));
        assertThat(patient.getBloodpressures()).containsOnly(bloodpressureBack);
        assertThat(bloodpressureBack.getPatient()).isEqualTo(patient);

        patient.setBloodpressures(new HashSet<>());
        assertThat(patient.getBloodpressures()).doesNotContain(bloodpressureBack);
        assertThat(bloodpressureBack.getPatient()).isNull();
    }

    @Test
    void userActivityTest() throws Exception {
        Patient patient = getPatientRandomSampleGenerator();
        UserActivity userActivityBack = getUserActivityRandomSampleGenerator();

        patient.addUserActivity(userActivityBack);
        assertThat(patient.getUserActivities()).containsOnly(userActivityBack);
        assertThat(userActivityBack.getPatient()).isEqualTo(patient);

        patient.removeUserActivity(userActivityBack);
        assertThat(patient.getUserActivities()).doesNotContain(userActivityBack);
        assertThat(userActivityBack.getPatient()).isNull();

        patient.userActivities(new HashSet<>(Set.of(userActivityBack)));
        assertThat(patient.getUserActivities()).containsOnly(userActivityBack);
        assertThat(userActivityBack.getPatient()).isEqualTo(patient);

        patient.setUserActivities(new HashSet<>());
        assertThat(patient.getUserActivities()).doesNotContain(userActivityBack);
        assertThat(userActivityBack.getPatient()).isNull();
    }

    @Test
    void geoLocationTest() throws Exception {
        Patient patient = getPatientRandomSampleGenerator();
        GeoLocation geoLocationBack = getGeoLocationRandomSampleGenerator();

        patient.addGeoLocation(geoLocationBack);
        assertThat(patient.getGeoLocations()).containsOnly(geoLocationBack);
        assertThat(geoLocationBack.getPatient()).isEqualTo(patient);

        patient.removeGeoLocation(geoLocationBack);
        assertThat(patient.getGeoLocations()).doesNotContain(geoLocationBack);
        assertThat(geoLocationBack.getPatient()).isNull();

        patient.geoLocations(new HashSet<>(Set.of(geoLocationBack)));
        assertThat(patient.getGeoLocations()).containsOnly(geoLocationBack);
        assertThat(geoLocationBack.getPatient()).isEqualTo(patient);

        patient.setGeoLocations(new HashSet<>());
        assertThat(patient.getGeoLocations()).doesNotContain(geoLocationBack);
        assertThat(geoLocationBack.getPatient()).isNull();
    }
}
