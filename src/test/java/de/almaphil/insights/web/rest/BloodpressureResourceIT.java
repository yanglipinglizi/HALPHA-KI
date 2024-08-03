package de.almaphil.insights.web.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import de.almaphil.insights.IntegrationTest;
import de.almaphil.insights.domain.Bloodpressure;
import de.almaphil.insights.repository.BloodpressureRepository;
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
 * Integration tests for the {@link BloodpressureResource} REST controller.
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class BloodpressureResourceIT {

    private static final Integer DEFAULT_SYSTOLIC = 0;
    private static final Integer UPDATED_SYSTOLIC = 1;

    private static final Integer DEFAULT_DIASTOLIC = 0;
    private static final Integer UPDATED_DIASTOLIC = 1;

    private static final Integer DEFAULT_PULSE = 0;
    private static final Integer UPDATED_PULSE = 1;

    private static final String DEFAULT_RECORDED_AT = "AAAAAAAAAA";
    private static final String UPDATED_RECORDED_AT = "BBBBBBBBBB";

    private static final Long DEFAULT_USER_ID = 1L;
    private static final Long UPDATED_USER_ID = 2L;

    private static final String ENTITY_API_URL = "/api/bloodpressures";
    private static final String ENTITY_API_URL_ID = ENTITY_API_URL + "/{id}";

    private static Random random = new Random();
    private static AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    @Autowired
    private BloodpressureRepository bloodpressureRepository;

    @Autowired
    private EntityManager em;

    @Autowired
    private MockMvc restBloodpressureMockMvc;

    private Bloodpressure bloodpressure;

    /**
     * Create an entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static Bloodpressure createEntity(EntityManager em) {
        Bloodpressure bloodpressure = new Bloodpressure()
            .systolic(DEFAULT_SYSTOLIC)
            .diastolic(DEFAULT_DIASTOLIC)
            .pulse(DEFAULT_PULSE)
            .recorded_at(DEFAULT_RECORDED_AT)
            .userId(DEFAULT_USER_ID);
        return bloodpressure;
    }

    /**
     * Create an updated entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static Bloodpressure createUpdatedEntity(EntityManager em) {
        Bloodpressure bloodpressure = new Bloodpressure()
            .systolic(UPDATED_SYSTOLIC)
            .diastolic(UPDATED_DIASTOLIC)
            .pulse(UPDATED_PULSE)
            .recorded_at(UPDATED_RECORDED_AT)
            .userId(UPDATED_USER_ID);
        return bloodpressure;
    }

    @BeforeEach
    public void initTest() {
        bloodpressure = createEntity(em);
    }

    @Test
    @Transactional
    void createBloodpressure() throws Exception {
        int databaseSizeBeforeCreate = bloodpressureRepository.findAll().size();
        // Create the Bloodpressure
        restBloodpressureMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(bloodpressure)))
            .andExpect(status().isCreated());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeCreate + 1);
        Bloodpressure testBloodpressure = bloodpressureList.get(bloodpressureList.size() - 1);
        assertThat(testBloodpressure.getSystolic()).isEqualTo(DEFAULT_SYSTOLIC);
        assertThat(testBloodpressure.getDiastolic()).isEqualTo(DEFAULT_DIASTOLIC);
        assertThat(testBloodpressure.getPulse()).isEqualTo(DEFAULT_PULSE);
        assertThat(testBloodpressure.getRecorded_at()).isEqualTo(DEFAULT_RECORDED_AT);
        assertThat(testBloodpressure.getUserId()).isEqualTo(DEFAULT_USER_ID);
    }

    @Test
    @Transactional
    void createBloodpressureWithExistingId() throws Exception {
        // Create the Bloodpressure with an existing ID
        bloodpressure.setId(1L);

        int databaseSizeBeforeCreate = bloodpressureRepository.findAll().size();

        // An entity with an existing ID cannot be created, so this API call must fail
        restBloodpressureMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(bloodpressure)))
            .andExpect(status().isBadRequest());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeCreate);
    }

    @Test
    @Transactional
    void getAllBloodpressures() throws Exception {
        // Initialize the database
        bloodpressureRepository.saveAndFlush(bloodpressure);

        // Get all the bloodpressureList
        restBloodpressureMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(bloodpressure.getId().intValue())))
            .andExpect(jsonPath("$.[*].systolic").value(hasItem(DEFAULT_SYSTOLIC)))
            .andExpect(jsonPath("$.[*].diastolic").value(hasItem(DEFAULT_DIASTOLIC)))
            .andExpect(jsonPath("$.[*].pulse").value(hasItem(DEFAULT_PULSE)))
            .andExpect(jsonPath("$.[*].recorded_at").value(hasItem(DEFAULT_RECORDED_AT)))
            .andExpect(jsonPath("$.[*].user_id").value(hasItem(DEFAULT_USER_ID.intValue())));
    }

    @Test
    @Transactional
    void getBloodpressure() throws Exception {
        // Initialize the database
        bloodpressureRepository.saveAndFlush(bloodpressure);

        // Get the bloodpressure
        restBloodpressureMockMvc
            .perform(get(ENTITY_API_URL_ID, bloodpressure.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.id").value(bloodpressure.getId().intValue()))
            .andExpect(jsonPath("$.systolic").value(DEFAULT_SYSTOLIC))
            .andExpect(jsonPath("$.diastolic").value(DEFAULT_DIASTOLIC))
            .andExpect(jsonPath("$.pulse").value(DEFAULT_PULSE))
            .andExpect(jsonPath("$.recorded_at").value(DEFAULT_RECORDED_AT))
            .andExpect(jsonPath("$.user_id").value(DEFAULT_USER_ID.intValue()));
    }

    @Test
    @Transactional
    void getNonExistingBloodpressure() throws Exception {
        // Get the bloodpressure
        restBloodpressureMockMvc.perform(get(ENTITY_API_URL_ID, Long.MAX_VALUE)).andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void putExistingBloodpressure() throws Exception {
        // Initialize the database
        bloodpressureRepository.saveAndFlush(bloodpressure);

        int databaseSizeBeforeUpdate = bloodpressureRepository.findAll().size();

        // Update the bloodpressure
        Bloodpressure updatedBloodpressure = bloodpressureRepository.findById(bloodpressure.getId()).orElseThrow();
        // Disconnect from session so that the updates on updatedBloodpressure are not directly saved in db
        em.detach(updatedBloodpressure);
        updatedBloodpressure
            .systolic(UPDATED_SYSTOLIC)
            .diastolic(UPDATED_DIASTOLIC)
            .pulse(UPDATED_PULSE)
            .recorded_at(UPDATED_RECORDED_AT)
            .userId(UPDATED_USER_ID);

        restBloodpressureMockMvc
            .perform(
                put(ENTITY_API_URL_ID, updatedBloodpressure.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(updatedBloodpressure))
            )
            .andExpect(status().isOk());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeUpdate);
        Bloodpressure testBloodpressure = bloodpressureList.get(bloodpressureList.size() - 1);
        assertThat(testBloodpressure.getSystolic()).isEqualTo(UPDATED_SYSTOLIC);
        assertThat(testBloodpressure.getDiastolic()).isEqualTo(UPDATED_DIASTOLIC);
        assertThat(testBloodpressure.getPulse()).isEqualTo(UPDATED_PULSE);
        assertThat(testBloodpressure.getRecorded_at()).isEqualTo(UPDATED_RECORDED_AT);
        assertThat(testBloodpressure.getUserId()).isEqualTo(UPDATED_USER_ID);
    }

    @Test
    @Transactional
    void putNonExistingBloodpressure() throws Exception {
        int databaseSizeBeforeUpdate = bloodpressureRepository.findAll().size();
        bloodpressure.setId(longCount.incrementAndGet());

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restBloodpressureMockMvc
            .perform(
                put(ENTITY_API_URL_ID, bloodpressure.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(bloodpressure))
            )
            .andExpect(status().isBadRequest());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithIdMismatchBloodpressure() throws Exception {
        int databaseSizeBeforeUpdate = bloodpressureRepository.findAll().size();
        bloodpressure.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restBloodpressureMockMvc
            .perform(
                put(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(bloodpressure))
            )
            .andExpect(status().isBadRequest());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithMissingIdPathParamBloodpressure() throws Exception {
        int databaseSizeBeforeUpdate = bloodpressureRepository.findAll().size();
        bloodpressure.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restBloodpressureMockMvc
            .perform(put(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(bloodpressure)))
            .andExpect(status().isMethodNotAllowed());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void partialUpdateBloodpressureWithPatch() throws Exception {
        // Initialize the database
        bloodpressureRepository.saveAndFlush(bloodpressure);

        int databaseSizeBeforeUpdate = bloodpressureRepository.findAll().size();

        // Update the bloodpressure using partial update
        Bloodpressure partialUpdatedBloodpressure = new Bloodpressure();
        partialUpdatedBloodpressure.setId(bloodpressure.getId());

        partialUpdatedBloodpressure.systolic(UPDATED_SYSTOLIC).diastolic(UPDATED_DIASTOLIC).pulse(UPDATED_PULSE);

        restBloodpressureMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedBloodpressure.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(partialUpdatedBloodpressure))
            )
            .andExpect(status().isOk());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeUpdate);
        Bloodpressure testBloodpressure = bloodpressureList.get(bloodpressureList.size() - 1);
        assertThat(testBloodpressure.getSystolic()).isEqualTo(UPDATED_SYSTOLIC);
        assertThat(testBloodpressure.getDiastolic()).isEqualTo(UPDATED_DIASTOLIC);
        assertThat(testBloodpressure.getPulse()).isEqualTo(UPDATED_PULSE);
        assertThat(testBloodpressure.getRecorded_at()).isEqualTo(DEFAULT_RECORDED_AT);
        assertThat(testBloodpressure.getUserId()).isEqualTo(DEFAULT_USER_ID);
    }

    @Test
    @Transactional
    void fullUpdateBloodpressureWithPatch() throws Exception {
        // Initialize the database
        bloodpressureRepository.saveAndFlush(bloodpressure);

        int databaseSizeBeforeUpdate = bloodpressureRepository.findAll().size();

        // Update the bloodpressure using partial update
        Bloodpressure partialUpdatedBloodpressure = new Bloodpressure();
        partialUpdatedBloodpressure.setId(bloodpressure.getId());

        partialUpdatedBloodpressure
            .systolic(UPDATED_SYSTOLIC)
            .diastolic(UPDATED_DIASTOLIC)
            .pulse(UPDATED_PULSE)
            .recorded_at(UPDATED_RECORDED_AT)
            .userId(UPDATED_USER_ID);

        restBloodpressureMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedBloodpressure.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(partialUpdatedBloodpressure))
            )
            .andExpect(status().isOk());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeUpdate);
        Bloodpressure testBloodpressure = bloodpressureList.get(bloodpressureList.size() - 1);
        assertThat(testBloodpressure.getSystolic()).isEqualTo(UPDATED_SYSTOLIC);
        assertThat(testBloodpressure.getDiastolic()).isEqualTo(UPDATED_DIASTOLIC);
        assertThat(testBloodpressure.getPulse()).isEqualTo(UPDATED_PULSE);
        assertThat(testBloodpressure.getRecorded_at()).isEqualTo(UPDATED_RECORDED_AT);
        assertThat(testBloodpressure.getUserId()).isEqualTo(UPDATED_USER_ID);
    }

    @Test
    @Transactional
    void patchNonExistingBloodpressure() throws Exception {
        int databaseSizeBeforeUpdate = bloodpressureRepository.findAll().size();
        bloodpressure.setId(longCount.incrementAndGet());

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restBloodpressureMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, bloodpressure.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(bloodpressure))
            )
            .andExpect(status().isBadRequest());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithIdMismatchBloodpressure() throws Exception {
        int databaseSizeBeforeUpdate = bloodpressureRepository.findAll().size();
        bloodpressure.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restBloodpressureMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(bloodpressure))
            )
            .andExpect(status().isBadRequest());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithMissingIdPathParamBloodpressure() throws Exception {
        int databaseSizeBeforeUpdate = bloodpressureRepository.findAll().size();
        bloodpressure.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restBloodpressureMockMvc
            .perform(
                patch(ENTITY_API_URL).contentType("application/merge-patch+json").content(TestUtil.convertObjectToJsonBytes(bloodpressure))
            )
            .andExpect(status().isMethodNotAllowed());

        // Validate the Bloodpressure in the database
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void deleteBloodpressure() throws Exception {
        // Initialize the database
        bloodpressureRepository.saveAndFlush(bloodpressure);

        int databaseSizeBeforeDelete = bloodpressureRepository.findAll().size();

        // Delete the bloodpressure
        restBloodpressureMockMvc
            .perform(delete(ENTITY_API_URL_ID, bloodpressure.getId()).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isNoContent());

        // Validate the database contains one less item
        List<Bloodpressure> bloodpressureList = bloodpressureRepository.findAll();
        assertThat(bloodpressureList).hasSize(databaseSizeBeforeDelete - 1);
    }
}
