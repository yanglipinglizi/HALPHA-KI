package de.almaphil.insights.web.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import de.almaphil.insights.IntegrationTest;
import de.almaphil.insights.domain.Patient;
import de.almaphil.insights.repository.PatientRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Random;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration tests for the {@link PatientResource} REST controller.
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class PatientResourceIT {

    private static final String DEFAULT_HEALTH = "AAAAAAAAAA";
    private static final String UPDATED_HEALTH = "BBBBBBBBBB";

    private static final String DEFAULT_GEO = "AAAAAAAAAA";
    private static final String UPDATED_GEO = "BBBBBBBBBB";

    private static final Long DEFAULT_USER_ID = 1L;
    private static final Long UPDATED_USER_ID = 2L;

    private static final String DEFAULT_NICKNAME = "AAAAAAAAAA";
    private static final String UPDATED_NICKNAME = "BBBBBBBBBB";

    private static final String DEFAULT_TITLE = "AAAAAAAAAA";
    private static final String UPDATED_TITLE = "BBBBBBBBBB";

    private static final String DEFAULT_BIRTHDAY = "AAAAAAAAAA";
    private static final String UPDATED_BIRTHDAY = "BBBBBBBBBB";

    private static final String DEFAULT_SEX = "AAAAAAAAAA";
    private static final String UPDATED_SEX = "BBBBBBBBBB";

    private static final Float DEFAULT_HOME_LATITUDE = 1.0f;
    private static final Float UPDATED_HOME_LATITUDE = 2.0f;

    private static final Float DEFAULT_HOME_LONGITUDE = 1.0f;
    private static final Float UPDATED_HOME_LONGITUDE = 2.0f;

    private static final String DEFAULT_MEDICAL_PRECONDITIONS = "AAAAAAAAAA";
    private static final String UPDATED_MEDICAL_PRECONDITIONS = "BBBBBBBBBB";

    private static final String ENTITY_API_URL = "/api/patients";
    private static final String ENTITY_API_URL_ID = ENTITY_API_URL + "/{id}";

    private static Random random = new Random();
    private static AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private EntityManager em;

    @Autowired
    private MockMvc restPatientMockMvc;

    private Patient patient;

    /**
     * Create an entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static Patient createEntity(EntityManager em) {
        Patient patient = new Patient()
            .health(DEFAULT_HEALTH)
            .geo(DEFAULT_GEO)
            .userId(DEFAULT_USER_ID)
            .nickname(DEFAULT_NICKNAME)
            .title(DEFAULT_TITLE)
            .birthday(DEFAULT_BIRTHDAY)
            .sex(DEFAULT_SEX)
            .home_latitude(DEFAULT_HOME_LATITUDE)
            .home_longitude(DEFAULT_HOME_LONGITUDE)
            .medical_preconditions(DEFAULT_MEDICAL_PRECONDITIONS);
        return patient;
    }

    /**
     * Create an updated entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static Patient createUpdatedEntity(EntityManager em) {
        Patient patient = new Patient()
            .health(UPDATED_HEALTH)
            .geo(UPDATED_GEO)
            .userId(UPDATED_USER_ID)
            .nickname(UPDATED_NICKNAME)
            .title(UPDATED_TITLE)
            .birthday(UPDATED_BIRTHDAY)
            .sex(UPDATED_SEX)
            .home_latitude(UPDATED_HOME_LATITUDE)
            .home_longitude(UPDATED_HOME_LONGITUDE)
            .medical_preconditions(UPDATED_MEDICAL_PRECONDITIONS);
        return patient;
    }

    @BeforeEach
    public void initTest() {
        patient = createEntity(em);
    }

    @Test
    @Transactional
    void createPatient() throws Exception {
        int databaseSizeBeforeCreate = patientRepository.findAll().size();
        // Create the Patient
        restPatientMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(patient)))
            .andExpect(status().isCreated());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeCreate + 1);
        Patient testPatient = patientList.get(patientList.size() - 1);
        assertThat(testPatient.getHealth()).isEqualTo(DEFAULT_HEALTH);
        assertThat(testPatient.getGeo()).isEqualTo(DEFAULT_GEO);
        assertThat(testPatient.getUser_id()).isEqualTo(DEFAULT_USER_ID);
        assertThat(testPatient.getNickname()).isEqualTo(DEFAULT_NICKNAME);
        assertThat(testPatient.getTitle()).isEqualTo(DEFAULT_TITLE);
        assertThat(testPatient.getBirthday()).isEqualTo(DEFAULT_BIRTHDAY);
        assertThat(testPatient.getSex()).isEqualTo(DEFAULT_SEX);
        assertThat(testPatient.getHome_latitude()).isEqualTo(DEFAULT_HOME_LATITUDE);
        assertThat(testPatient.getHome_longitude()).isEqualTo(DEFAULT_HOME_LONGITUDE);
        assertThat(testPatient.getMedical_preconditions()).isEqualTo(DEFAULT_MEDICAL_PRECONDITIONS);
    }

    @Test
    @Transactional
    void createPatientWithExistingId() throws Exception {
        // Create the Patient with an existing ID
        patient.setId(1L);

        int databaseSizeBeforeCreate = patientRepository.findAll().size();

        // An entity with an existing ID cannot be created, so this API call must fail
        restPatientMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(patient)))
            .andExpect(status().isBadRequest());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeCreate);
    }

    @Test
    @Transactional
    void getAllPatients() throws Exception {
        // Initialize the database
        patientRepository.saveAndFlush(patient);

        // Get all the patientList
        restPatientMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(patient.getId().intValue())))
            .andExpect(jsonPath("$.[*].health").value(hasItem(DEFAULT_HEALTH)))
            .andExpect(jsonPath("$.[*].geo").value(hasItem(DEFAULT_GEO)))
            .andExpect(jsonPath("$.[*].user_id").value(hasItem(DEFAULT_USER_ID.intValue())))
            .andExpect(jsonPath("$.[*].nickname").value(hasItem(DEFAULT_NICKNAME)))
            .andExpect(jsonPath("$.[*].title").value(hasItem(DEFAULT_TITLE)))
            .andExpect(jsonPath("$.[*].birthday").value(hasItem(DEFAULT_BIRTHDAY)))
            .andExpect(jsonPath("$.[*].sex").value(hasItem(DEFAULT_SEX)))
            .andExpect(jsonPath("$.[*].home_latitude").value(hasItem(DEFAULT_HOME_LATITUDE)))
            .andExpect(jsonPath("$.[*].home_longitude").value(hasItem(DEFAULT_HOME_LONGITUDE)))
            .andExpect(jsonPath("$.[*].medical_preconditions").value(hasItem(DEFAULT_MEDICAL_PRECONDITIONS)));
    }

    @Test
    @Transactional
    void getPatient() throws Exception {
        // Initialize the database
        patientRepository.saveAndFlush(patient);

        // Get the patient
        restPatientMockMvc
            .perform(get(ENTITY_API_URL_ID, patient.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.id").value(patient.getId().intValue()))
            .andExpect(jsonPath("$.health").value(DEFAULT_HEALTH))
            .andExpect(jsonPath("$.geo").value(DEFAULT_GEO))
            .andExpect(jsonPath("$.user_id").value(DEFAULT_USER_ID.intValue()))
            .andExpect(jsonPath("$.nickname").value(DEFAULT_NICKNAME))
            .andExpect(jsonPath("$.title").value(DEFAULT_TITLE))
            .andExpect(jsonPath("$.birthday").value(DEFAULT_BIRTHDAY))
            .andExpect(jsonPath("$.sex").value(DEFAULT_SEX))
            .andExpect(jsonPath("$.[*].home_latitude").value(DEFAULT_HOME_LATITUDE))
            .andExpect(jsonPath("$.[*].home_longitude").value(DEFAULT_HOME_LONGITUDE))
            .andExpect(jsonPath("$.medical_preconditions").value(DEFAULT_MEDICAL_PRECONDITIONS));
    }

    @Test
    @Transactional
    void getNonExistingPatient() throws Exception {
        // Get the patient
        restPatientMockMvc.perform(get(ENTITY_API_URL_ID, Long.MAX_VALUE)).andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void putExistingPatient() throws Exception {
        // Initialize the database
        patientRepository.saveAndFlush(patient);

        int databaseSizeBeforeUpdate = patientRepository.findAll().size();

        // Update the patient
        Patient updatedPatient = patientRepository.findById(patient.getId()).orElseThrow();
        // Disconnect from session so that the updates on updatedPatient are not directly saved in db
        em.detach(updatedPatient);
        updatedPatient
            .health(UPDATED_HEALTH)
            .geo(UPDATED_GEO)
            .userId(UPDATED_USER_ID)
            .nickname(UPDATED_NICKNAME)
            .title(UPDATED_TITLE)
            .birthday(UPDATED_BIRTHDAY)
            .sex(UPDATED_SEX)
            .home_latitude(UPDATED_HOME_LATITUDE)
            .home_longitude(UPDATED_HOME_LONGITUDE)
            .medical_preconditions(UPDATED_MEDICAL_PRECONDITIONS);

        restPatientMockMvc
            .perform(
                put(ENTITY_API_URL_ID, updatedPatient.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(updatedPatient))
            )
            .andExpect(status().isOk());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeUpdate);
        Patient testPatient = patientList.get(patientList.size() - 1);
        assertThat(testPatient.getHealth()).isEqualTo(UPDATED_HEALTH);
        assertThat(testPatient.getGeo()).isEqualTo(UPDATED_GEO);
        assertThat(testPatient.getUser_id()).isEqualTo(UPDATED_USER_ID);
        assertThat(testPatient.getNickname()).isEqualTo(UPDATED_NICKNAME);
        assertThat(testPatient.getTitle()).isEqualTo(UPDATED_TITLE);
        assertThat(testPatient.getBirthday()).isEqualTo(UPDATED_BIRTHDAY);
        assertThat(testPatient.getHome_latitude()).isEqualTo(DEFAULT_HOME_LATITUDE);
        assertThat(testPatient.getHome_longitude()).isEqualTo(DEFAULT_HOME_LONGITUDE);
        assertThat(testPatient.getSex()).isEqualTo(UPDATED_SEX);
        assertThat(testPatient.getMedical_preconditions()).isEqualTo(UPDATED_MEDICAL_PRECONDITIONS);
    }

    @Test
    @Transactional
    void putNonExistingPatient() throws Exception {
        int databaseSizeBeforeUpdate = patientRepository.findAll().size();
        patient.setId(longCount.incrementAndGet());

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restPatientMockMvc
            .perform(
                put(ENTITY_API_URL_ID, patient.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(patient))
            )
            .andExpect(status().isBadRequest());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithIdMismatchPatient() throws Exception {
        int databaseSizeBeforeUpdate = patientRepository.findAll().size();
        patient.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restPatientMockMvc
            .perform(
                put(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(patient))
            )
            .andExpect(status().isBadRequest());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithMissingIdPathParamPatient() throws Exception {
        int databaseSizeBeforeUpdate = patientRepository.findAll().size();
        patient.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restPatientMockMvc
            .perform(put(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(patient)))
            .andExpect(status().isMethodNotAllowed());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void partialUpdatePatientWithPatch() throws Exception {
        // Initialize the database
        patientRepository.saveAndFlush(patient);

        int databaseSizeBeforeUpdate = patientRepository.findAll().size();

        // Update the patient using partial update
        Patient partialUpdatedPatient = new Patient();
        partialUpdatedPatient.setId(patient.getId());

        partialUpdatedPatient
            .geo(UPDATED_GEO)
            .userId(UPDATED_USER_ID)
            .nickname(UPDATED_NICKNAME)
            .title(UPDATED_TITLE)
            .birthday(UPDATED_BIRTHDAY)
            .sex(UPDATED_SEX);

        restPatientMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedPatient.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(partialUpdatedPatient))
            )
            .andExpect(status().isOk());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeUpdate);
        Patient testPatient = patientList.get(patientList.size() - 1);
        assertThat(testPatient.getHealth()).isEqualTo(DEFAULT_HEALTH);
        assertThat(testPatient.getGeo()).isEqualTo(UPDATED_GEO);
        assertThat(testPatient.getUser_id()).isEqualTo(UPDATED_USER_ID);
        assertThat(testPatient.getNickname()).isEqualTo(UPDATED_NICKNAME);
        assertThat(testPatient.getTitle()).isEqualTo(UPDATED_TITLE);
        assertThat(testPatient.getBirthday()).isEqualTo(UPDATED_BIRTHDAY);
        assertThat(testPatient.getSex()).isEqualTo(UPDATED_SEX);

        assertThat(testPatient.getHome_latitude()).isEqualTo(DEFAULT_HOME_LATITUDE);
        assertThat(testPatient.getHome_longitude()).isEqualTo(DEFAULT_HOME_LONGITUDE);
        assertThat(testPatient.getMedical_preconditions()).isEqualTo(DEFAULT_MEDICAL_PRECONDITIONS);
    }

    @Test
    @Transactional
    void fullUpdatePatientWithPatch() throws Exception {
        // Initialize the database
        patientRepository.saveAndFlush(patient);

        int databaseSizeBeforeUpdate = patientRepository.findAll().size();

        // Update the patient using partial update
        Patient partialUpdatedPatient = new Patient();
        partialUpdatedPatient.setId(patient.getId());

        partialUpdatedPatient
            .health(UPDATED_HEALTH)
            .geo(UPDATED_GEO)
            .userId(UPDATED_USER_ID)
            .nickname(UPDATED_NICKNAME)
            .title(UPDATED_TITLE)
            .birthday(UPDATED_BIRTHDAY)
            .sex(UPDATED_SEX)
            .home_latitude(UPDATED_HOME_LATITUDE)
            .home_longitude(UPDATED_HOME_LONGITUDE)
            .medical_preconditions(UPDATED_MEDICAL_PRECONDITIONS);

        restPatientMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedPatient.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(partialUpdatedPatient))
            )
            .andExpect(status().isOk());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeUpdate);
        Patient testPatient = patientList.get(patientList.size() - 1);
        assertThat(testPatient.getHealth()).isEqualTo(UPDATED_HEALTH);
        assertThat(testPatient.getGeo()).isEqualTo(UPDATED_GEO);
        assertThat(testPatient.getUser_id()).isEqualTo(UPDATED_USER_ID);
        assertThat(testPatient.getNickname()).isEqualTo(UPDATED_NICKNAME);
        assertThat(testPatient.getTitle()).isEqualTo(UPDATED_TITLE);
        assertThat(testPatient.getBirthday()).isEqualTo(UPDATED_BIRTHDAY);
        assertThat(testPatient.getSex()).isEqualTo(UPDATED_SEX);

        assertThat(testPatient.getHome_latitude()).isEqualTo(UPDATED_HOME_LATITUDE);
        assertThat(testPatient.getHome_longitude()).isEqualTo(UPDATED_HOME_LONGITUDE);
        assertThat(testPatient.getMedical_preconditions()).isEqualTo(UPDATED_MEDICAL_PRECONDITIONS);
    }

    @Test
    @Transactional
    void patchNonExistingPatient() throws Exception {
        int databaseSizeBeforeUpdate = patientRepository.findAll().size();
        patient.setId(longCount.incrementAndGet());

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restPatientMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, patient.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(patient))
            )
            .andExpect(status().isBadRequest());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithIdMismatchPatient() throws Exception {
        int databaseSizeBeforeUpdate = patientRepository.findAll().size();
        patient.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restPatientMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(patient))
            )
            .andExpect(status().isBadRequest());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithMissingIdPathParamPatient() throws Exception {
        int databaseSizeBeforeUpdate = patientRepository.findAll().size();
        patient.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restPatientMockMvc
            .perform(patch(ENTITY_API_URL).contentType("application/merge-patch+json").content(TestUtil.convertObjectToJsonBytes(patient)))
            .andExpect(status().isMethodNotAllowed());

        // Validate the Patient in the database
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void deletePatient() throws Exception {
        // Initialize the database
        patientRepository.saveAndFlush(patient);

        int databaseSizeBeforeDelete = patientRepository.findAll().size();

        // Delete the patient
        restPatientMockMvc
            .perform(delete(ENTITY_API_URL_ID, patient.getId()).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isNoContent());

        // Validate the database contains one less item
        List<Patient> patientList = patientRepository.findAll();
        assertThat(patientList).hasSize(databaseSizeBeforeDelete - 1);
    }
}
