package de.almaphil.insights.domain;

import static de.almaphil.insights.domain.BloodpressureTestSamples.*;
import static de.almaphil.insights.domain.PatientTestSamples.*;
import static org.assertj.core.api.Assertions.assertThat;

import de.almaphil.insights.web.rest.TestUtil;
import org.junit.jupiter.api.Test;

class BloodpressureTest {

    @Test
    void equalsVerifier() throws Exception {
        TestUtil.equalsVerifier(Bloodpressure.class);
        Bloodpressure bloodpressure1 = getBloodpressureSample1();
        Bloodpressure bloodpressure2 = new Bloodpressure();
        assertThat(bloodpressure1).isNotEqualTo(bloodpressure2);

        bloodpressure2.setId(bloodpressure1.getId());
        assertThat(bloodpressure1).isEqualTo(bloodpressure2);

        bloodpressure2 = getBloodpressureSample2();
        assertThat(bloodpressure1).isNotEqualTo(bloodpressure2);
    }

    @Test
    void patientTest() throws Exception {
        Bloodpressure bloodpressure = getBloodpressureRandomSampleGenerator();
        Patient patientBack = getPatientRandomSampleGenerator();

        bloodpressure.setPatient(patientBack);
        assertThat(bloodpressure.getPatient()).isEqualTo(patientBack);

        bloodpressure.patient(null);
        assertThat(bloodpressure.getPatient()).isNull();
    }
}
