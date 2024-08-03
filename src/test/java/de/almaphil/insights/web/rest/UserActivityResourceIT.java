package de.almaphil.insights.web.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import de.almaphil.insights.IntegrationTest;
import de.almaphil.insights.domain.UserActivity;
import de.almaphil.insights.repository.UserActivityRepository;
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
 * Integration tests for the {@link UserActivityResource} REST controller.
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class UserActivityResourceIT {

    private static final String DEFAULT_REPORTED_FOR = "AAAAAAAAAA";
    private static final String UPDATED_REPORTED_FOR = "BBBBBBBBBB";

    private static final String DEFAULT_RECORDED_AT = "AAAAAAAAAA";
    private static final String UPDATED_RECORDED_AT = "BBBBBBBBBB";

    private static final Long DEFAULT_USER_ID = 1L;
    private static final Long UPDATED_USER_ID = 2L;

    private static final Integer DEFAULT_REPORTED_ABSOLUTE_COUNT = 1;
    private static final Integer UPDATED_REPORTED_ABSOLUTE_COUNT = 2;

    private static final String ENTITY_API_URL = "/api/user-activities";
    private static final String ENTITY_API_URL_ID = ENTITY_API_URL + "/{id}";

    private static Random random = new Random();
    private static AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    @Autowired
    private UserActivityRepository userActivityRepository;

    @Autowired
    private EntityManager em;

    @Autowired
    private MockMvc restUserActivityMockMvc;

    private UserActivity userActivity;

    /**
     * Create an entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static UserActivity createEntity(EntityManager em) {
        UserActivity userActivity = new UserActivity()
            .reportedFor(DEFAULT_REPORTED_FOR)
            .recordedAt(DEFAULT_RECORDED_AT)
            .userId(DEFAULT_USER_ID)
            .reportedAbsoluteCount(DEFAULT_REPORTED_ABSOLUTE_COUNT);
        return userActivity;
    }

    /**
     * Create an updated entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static UserActivity createUpdatedEntity(EntityManager em) {
        UserActivity userActivity = new UserActivity()
            .reportedFor(UPDATED_REPORTED_FOR)
            .recordedAt(UPDATED_RECORDED_AT)
            .userId(UPDATED_USER_ID)
            .reportedAbsoluteCount(UPDATED_REPORTED_ABSOLUTE_COUNT);
        return userActivity;
    }

    @BeforeEach
    public void initTest() {
        userActivity = createEntity(em);
    }

    @Test
    @Transactional
    void createUserActivity() throws Exception {
        int databaseSizeBeforeCreate = userActivityRepository.findAll().size();
        // Create the UserActivity
        restUserActivityMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(userActivity)))
            .andExpect(status().isCreated());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeCreate + 1);
        UserActivity testUserActivity = userActivityList.get(userActivityList.size() - 1);
        assertThat(testUserActivity.getReportedFor()).isEqualTo(DEFAULT_REPORTED_FOR);
        assertThat(testUserActivity.getRecordedAt()).isEqualTo(DEFAULT_RECORDED_AT);
        assertThat(testUserActivity.getUserId()).isEqualTo(DEFAULT_USER_ID);
        assertThat(testUserActivity.getReportedAbsoluteCount()).isEqualTo(DEFAULT_REPORTED_ABSOLUTE_COUNT);
    }

    @Test
    @Transactional
    void createUserActivityWithExistingId() throws Exception {
        // Create the UserActivity with an existing ID
        userActivity.setId(1L);

        int databaseSizeBeforeCreate = userActivityRepository.findAll().size();

        // An entity with an existing ID cannot be created, so this API call must fail
        restUserActivityMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(userActivity)))
            .andExpect(status().isBadRequest());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeCreate);
    }

    @Test
    @Transactional
    void getAllUserActivities() throws Exception {
        // Initialize the database
        userActivityRepository.saveAndFlush(userActivity);

        // Get all the userActivityList
        restUserActivityMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(userActivity.getId().intValue())))
            .andExpect(jsonPath("$.[*].reportedFor").value(hasItem(DEFAULT_REPORTED_FOR)))
            .andExpect(jsonPath("$.[*].recordedAt").value(hasItem(DEFAULT_RECORDED_AT)))
            .andExpect(jsonPath("$.[*].userId").value(hasItem(DEFAULT_USER_ID.intValue())))
            .andExpect(jsonPath("$.[*].reportedAbsoluteCount").value(hasItem(DEFAULT_REPORTED_ABSOLUTE_COUNT)));
    }

    @Test
    @Transactional
    void getUserActivity() throws Exception {
        // Initialize the database
        userActivityRepository.saveAndFlush(userActivity);

        // Get the userActivity
        restUserActivityMockMvc
            .perform(get(ENTITY_API_URL_ID, userActivity.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.id").value(userActivity.getId().intValue()))
            .andExpect(jsonPath("$.reportedFor").value(DEFAULT_REPORTED_FOR))
            .andExpect(jsonPath("$.recordedAt").value(DEFAULT_RECORDED_AT))
            .andExpect(jsonPath("$.userId").value(DEFAULT_USER_ID.intValue()))
            .andExpect(jsonPath("$.reportedAbsoluteCount").value(DEFAULT_REPORTED_ABSOLUTE_COUNT));
    }

    @Test
    @Transactional
    void getNonExistingUserActivity() throws Exception {
        // Get the userActivity
        restUserActivityMockMvc.perform(get(ENTITY_API_URL_ID, Long.MAX_VALUE)).andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void putExistingUserActivity() throws Exception {
        // Initialize the database
        userActivityRepository.saveAndFlush(userActivity);

        int databaseSizeBeforeUpdate = userActivityRepository.findAll().size();

        // Update the userActivity
        UserActivity updatedUserActivity = userActivityRepository.findById(userActivity.getId()).orElseThrow();
        // Disconnect from session so that the updates on updatedUserActivity are not directly saved in db
        em.detach(updatedUserActivity);
        updatedUserActivity
            .reportedFor(UPDATED_REPORTED_FOR)
            .recordedAt(UPDATED_RECORDED_AT)
            .userId(UPDATED_USER_ID)
            .reportedAbsoluteCount(UPDATED_REPORTED_ABSOLUTE_COUNT);

        restUserActivityMockMvc
            .perform(
                put(ENTITY_API_URL_ID, updatedUserActivity.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(updatedUserActivity))
            )
            .andExpect(status().isOk());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeUpdate);
        UserActivity testUserActivity = userActivityList.get(userActivityList.size() - 1);
        assertThat(testUserActivity.getReportedFor()).isEqualTo(UPDATED_REPORTED_FOR);
        assertThat(testUserActivity.getRecordedAt()).isEqualTo(UPDATED_RECORDED_AT);
        assertThat(testUserActivity.getUserId()).isEqualTo(UPDATED_USER_ID);
        assertThat(testUserActivity.getReportedAbsoluteCount()).isEqualTo(UPDATED_REPORTED_ABSOLUTE_COUNT);
    }

    @Test
    @Transactional
    void putNonExistingUserActivity() throws Exception {
        int databaseSizeBeforeUpdate = userActivityRepository.findAll().size();
        userActivity.setId(longCount.incrementAndGet());

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restUserActivityMockMvc
            .perform(
                put(ENTITY_API_URL_ID, userActivity.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(userActivity))
            )
            .andExpect(status().isBadRequest());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithIdMismatchUserActivity() throws Exception {
        int databaseSizeBeforeUpdate = userActivityRepository.findAll().size();
        userActivity.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restUserActivityMockMvc
            .perform(
                put(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(userActivity))
            )
            .andExpect(status().isBadRequest());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithMissingIdPathParamUserActivity() throws Exception {
        int databaseSizeBeforeUpdate = userActivityRepository.findAll().size();
        userActivity.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restUserActivityMockMvc
            .perform(put(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(userActivity)))
            .andExpect(status().isMethodNotAllowed());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void partialUpdateUserActivityWithPatch() throws Exception {
        // Initialize the database
        userActivityRepository.saveAndFlush(userActivity);

        int databaseSizeBeforeUpdate = userActivityRepository.findAll().size();

        // Update the userActivity using partial update
        UserActivity partialUpdatedUserActivity = new UserActivity();
        partialUpdatedUserActivity.setId(userActivity.getId());

        partialUpdatedUserActivity.recordedAt(UPDATED_RECORDED_AT).userId(UPDATED_USER_ID);

        restUserActivityMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedUserActivity.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(partialUpdatedUserActivity))
            )
            .andExpect(status().isOk());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeUpdate);
        UserActivity testUserActivity = userActivityList.get(userActivityList.size() - 1);
        assertThat(testUserActivity.getReportedFor()).isEqualTo(DEFAULT_REPORTED_FOR);
        assertThat(testUserActivity.getRecordedAt()).isEqualTo(UPDATED_RECORDED_AT);
        assertThat(testUserActivity.getUserId()).isEqualTo(UPDATED_USER_ID);
        assertThat(testUserActivity.getReportedAbsoluteCount()).isEqualTo(DEFAULT_REPORTED_ABSOLUTE_COUNT);
    }

    @Test
    @Transactional
    void fullUpdateUserActivityWithPatch() throws Exception {
        // Initialize the database
        userActivityRepository.saveAndFlush(userActivity);

        int databaseSizeBeforeUpdate = userActivityRepository.findAll().size();

        // Update the userActivity using partial update
        UserActivity partialUpdatedUserActivity = new UserActivity();
        partialUpdatedUserActivity.setId(userActivity.getId());

        partialUpdatedUserActivity
            .reportedFor(UPDATED_REPORTED_FOR)
            .recordedAt(UPDATED_RECORDED_AT)
            .userId(UPDATED_USER_ID)
            .reportedAbsoluteCount(UPDATED_REPORTED_ABSOLUTE_COUNT);

        restUserActivityMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedUserActivity.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(partialUpdatedUserActivity))
            )
            .andExpect(status().isOk());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeUpdate);
        UserActivity testUserActivity = userActivityList.get(userActivityList.size() - 1);
        assertThat(testUserActivity.getReportedFor()).isEqualTo(UPDATED_REPORTED_FOR);
        assertThat(testUserActivity.getRecordedAt()).isEqualTo(UPDATED_RECORDED_AT);
        assertThat(testUserActivity.getUserId()).isEqualTo(UPDATED_USER_ID);
        assertThat(testUserActivity.getReportedAbsoluteCount()).isEqualTo(UPDATED_REPORTED_ABSOLUTE_COUNT);
    }

    @Test
    @Transactional
    void patchNonExistingUserActivity() throws Exception {
        int databaseSizeBeforeUpdate = userActivityRepository.findAll().size();
        userActivity.setId(longCount.incrementAndGet());

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restUserActivityMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, userActivity.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(userActivity))
            )
            .andExpect(status().isBadRequest());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithIdMismatchUserActivity() throws Exception {
        int databaseSizeBeforeUpdate = userActivityRepository.findAll().size();
        userActivity.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restUserActivityMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(userActivity))
            )
            .andExpect(status().isBadRequest());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithMissingIdPathParamUserActivity() throws Exception {
        int databaseSizeBeforeUpdate = userActivityRepository.findAll().size();
        userActivity.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restUserActivityMockMvc
            .perform(
                patch(ENTITY_API_URL).contentType("application/merge-patch+json").content(TestUtil.convertObjectToJsonBytes(userActivity))
            )
            .andExpect(status().isMethodNotAllowed());

        // Validate the UserActivity in the database
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void deleteUserActivity() throws Exception {
        // Initialize the database
        userActivityRepository.saveAndFlush(userActivity);

        int databaseSizeBeforeDelete = userActivityRepository.findAll().size();

        // Delete the userActivity
        restUserActivityMockMvc
            .perform(delete(ENTITY_API_URL_ID, userActivity.getId()).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isNoContent());

        // Validate the database contains one less item
        List<UserActivity> userActivityList = userActivityRepository.findAll();
        assertThat(userActivityList).hasSize(databaseSizeBeforeDelete - 1);
    }
}
