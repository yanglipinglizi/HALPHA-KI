package de.almaphil.insights.domain;

import static de.almaphil.insights.domain.GeoLocationTestSamples.*;
import static de.almaphil.insights.domain.PatientTestSamples.*;
import static org.assertj.core.api.Assertions.assertThat;

import de.almaphil.insights.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class GeoLocationTest {

    @Test
    void equalsVerifier() throws Exception {
        TestUtil.equalsVerifier(GeoLocation.class);
        GeoLocation geoLocation1 = getGeoLocationSample1();
        GeoLocation geoLocation2 = new GeoLocation();
        assertThat(geoLocation1).isNotEqualTo(geoLocation2);

        geoLocation2.setId(geoLocation1.getId());
        assertThat(geoLocation1).isEqualTo(geoLocation2);

        geoLocation2 = getGeoLocationSample2();
        assertThat(geoLocation1).isNotEqualTo(geoLocation2);
    }

    @Test
    void patientTest() throws Exception {
        GeoLocation geoLocation = getGeoLocationRandomSampleGenerator();
        Patient patientBack = getPatientRandomSampleGenerator();

        geoLocation.setPatient(patientBack);
        assertThat(geoLocation.getPatient()).isEqualTo(patientBack);

        geoLocation.patient(null);
        assertThat(geoLocation.getPatient()).isNull();
    }
}
