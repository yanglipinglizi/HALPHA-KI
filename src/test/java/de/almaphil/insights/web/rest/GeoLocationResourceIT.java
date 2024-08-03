package de.almaphil.insights.web.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import de.almaphil.insights.IntegrationTest;
import de.almaphil.insights.domain.GeoLocation;
import de.almaphil.insights.domain.enumeration.geoFence;
import de.almaphil.insights.domain.enumeration.geoFenceDetailedStatus;
import de.almaphil.insights.repository.GeoLocationRepository;
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
 * Integration tests for the {@link GeoLocationResource} REST controller.
 */
@IntegrationTest
@AutoConfigureMockMvc
@WithMockUser
class GeoLocationResourceIT {

    private static final Float DEFAULT_LONGITUDE = 1F;
    private static final Float UPDATED_LONGITUDE = 2F;

    private static final String DEFAULT_ACQUIRED_AT = "AAAAAAAAAA";
    private static final String UPDATED_ACQUIRED_AT = "BBBBBBBBBB";

    private static final geoFence DEFAULT_GEO_FENCE_STATUS = geoFence.GEOFENCE_DISABLED;
    private static final geoFence UPDATED_GEO_FENCE_STATUS = geoFence.IN;

    private static final Boolean DEFAULT_CONNECTED_TO_TRUSTED_WIFI = false;
    private static final Boolean UPDATED_CONNECTED_TO_TRUSTED_WIFI = true;

    private static final String DEFAULT_SOURCE_OF_GEOLOCATION = "AAAAAAAAAA";
    private static final String UPDATED_SOURCE_OF_GEOLOCATION = "BBBBBBBBBB";

    private static final Float DEFAULT_LATITUDE = 1F;
    private static final Float UPDATED_LATITUDE = 2F;

    private static final String DEFAULT_RECORDED_AT = "AAAAAAAAAA";
    private static final String UPDATED_RECORDED_AT = "BBBBBBBBBB";

    private static final Float DEFAULT_ACCURACY = 1F;
    private static final Float UPDATED_ACCURACY = 2F;

    private static final geoFenceDetailedStatus DEFAULT_GEOFENCE_DETAILED_STATUS = geoFenceDetailedStatus.IN_GEOFENCE;
    private static final geoFenceDetailedStatus UPDATED_GEOFENCE_DETAILED_STATUS = geoFenceDetailedStatus.STILL_JUST_LEFT_GEOFENCE;

    private static final String DEFAULT_JUST_LEFT_GEOFENCE_TIME = "AAAAAAAAAA";
    private static final String UPDATED_JUST_LEFT_GEOFENCE_TIME = "BBBBBBBBBB";

    private static final Long DEFAULT_USER_ID = 1L;
    private static final Long UPDATED_USER_ID = 2L;

    private static final String ENTITY_API_URL = "/api/geo-locations";
    private static final String ENTITY_API_URL_ID = ENTITY_API_URL + "/{id}";

    private static Random random = new Random();
    private static AtomicLong longCount = new AtomicLong(random.nextInt() + (2 * Integer.MAX_VALUE));

    @Autowired
    private GeoLocationRepository geoLocationRepository;

    @Autowired
    private EntityManager em;

    @Autowired
    private MockMvc restGeoLocationMockMvc;

    private GeoLocation geoLocation;

    /**
     * Create an entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static GeoLocation createEntity(EntityManager em) {
        GeoLocation geoLocation = new GeoLocation()
            .longitude(DEFAULT_LONGITUDE)
            .acquired_at(DEFAULT_ACQUIRED_AT)
            .geo_fence_status(DEFAULT_GEO_FENCE_STATUS)
            .connected_to_trusted_wifi(DEFAULT_CONNECTED_TO_TRUSTED_WIFI)
            .source_of_geolocation(DEFAULT_SOURCE_OF_GEOLOCATION)
            .latitude(DEFAULT_LATITUDE)
            .recorded_at(DEFAULT_RECORDED_AT)
            .accuracy(DEFAULT_ACCURACY)
            .geofence_detailed_status(DEFAULT_GEOFENCE_DETAILED_STATUS)
            .just_left_geofence_time(DEFAULT_JUST_LEFT_GEOFENCE_TIME)
            .userId(DEFAULT_USER_ID);
        return geoLocation;
    }

    /**
     * Create an updated entity for this test.
     *
     * This is a static method, as tests for other entities might also need it,
     * if they test an entity which requires the current entity.
     */
    public static GeoLocation createUpdatedEntity(EntityManager em) {
        GeoLocation geoLocation = new GeoLocation()
            .longitude(UPDATED_LONGITUDE)
            .acquired_at(UPDATED_ACQUIRED_AT)
            .geo_fence_status(UPDATED_GEO_FENCE_STATUS)
            .connected_to_trusted_wifi(UPDATED_CONNECTED_TO_TRUSTED_WIFI)
            .source_of_geolocation(UPDATED_SOURCE_OF_GEOLOCATION)
            .latitude(UPDATED_LATITUDE)
            .recorded_at(UPDATED_RECORDED_AT)
            .accuracy(UPDATED_ACCURACY)
            .geofence_detailed_status(UPDATED_GEOFENCE_DETAILED_STATUS)
            .just_left_geofence_time(UPDATED_JUST_LEFT_GEOFENCE_TIME)
            .userId(UPDATED_USER_ID);
        return geoLocation;
    }

    @BeforeEach
    public void initTest() {
        geoLocation = createEntity(em);
    }

    @Test
    @Transactional
    void createGeoLocation() throws Exception {
        int databaseSizeBeforeCreate = geoLocationRepository.findAll().size();
        // Create the GeoLocation
        restGeoLocationMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(geoLocation)))
            .andExpect(status().isCreated());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeCreate + 1);
        GeoLocation testGeoLocation = geoLocationList.get(geoLocationList.size() - 1);
        assertThat(testGeoLocation.getLongitude()).isEqualTo(DEFAULT_LONGITUDE);
        assertThat(testGeoLocation.getAcquired_at()).isEqualTo(DEFAULT_ACQUIRED_AT);
        assertThat(testGeoLocation.getGeo_fence_status()).isEqualTo(DEFAULT_GEO_FENCE_STATUS);
        assertThat(testGeoLocation.getConnected_to_trusted_wifi()).isEqualTo(DEFAULT_CONNECTED_TO_TRUSTED_WIFI);
        assertThat(testGeoLocation.getSource_of_geolocation()).isEqualTo(DEFAULT_SOURCE_OF_GEOLOCATION);
        assertThat(testGeoLocation.getLatitude()).isEqualTo(DEFAULT_LATITUDE);
        assertThat(testGeoLocation.getRecorded_at()).isEqualTo(DEFAULT_RECORDED_AT);
        assertThat(testGeoLocation.getAccuracy()).isEqualTo(DEFAULT_ACCURACY);
        assertThat(testGeoLocation.getGeofence_detailed_status()).isEqualTo(DEFAULT_GEOFENCE_DETAILED_STATUS);
        assertThat(testGeoLocation.getJust_left_geofence_time()).isEqualTo(DEFAULT_JUST_LEFT_GEOFENCE_TIME);
        assertThat(testGeoLocation.getUserId()).isEqualTo(DEFAULT_USER_ID);
    }

    @Test
    @Transactional
    void createGeoLocationWithExistingId() throws Exception {
        // Create the GeoLocation with an existing ID
        geoLocation.setId(1L);

        int databaseSizeBeforeCreate = geoLocationRepository.findAll().size();

        // An entity with an existing ID cannot be created, so this API call must fail
        restGeoLocationMockMvc
            .perform(post(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(geoLocation)))
            .andExpect(status().isBadRequest());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeCreate);
    }

    @Test
    @Transactional
    void getAllGeoLocations() throws Exception {
        // Initialize the database
        geoLocationRepository.saveAndFlush(geoLocation);

        // Get all the geoLocationList
        restGeoLocationMockMvc
            .perform(get(ENTITY_API_URL + "?sort=id,desc"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.[*].id").value(hasItem(geoLocation.getId().intValue())))
            .andExpect(jsonPath("$.[*].longitude").value(hasItem(DEFAULT_LONGITUDE.doubleValue())))
            .andExpect(jsonPath("$.[*].acquired_at").value(hasItem(DEFAULT_ACQUIRED_AT)))
            .andExpect(jsonPath("$.[*].geo_fence_status").value(hasItem(DEFAULT_GEO_FENCE_STATUS.toString())))
            .andExpect(jsonPath("$.[*].connected_to_trusted_wifi").value(hasItem(DEFAULT_CONNECTED_TO_TRUSTED_WIFI.booleanValue())))
            .andExpect(jsonPath("$.[*].source_of_geolocation").value(hasItem(DEFAULT_SOURCE_OF_GEOLOCATION)))
            .andExpect(jsonPath("$.[*].latitude").value(hasItem(DEFAULT_LATITUDE.doubleValue())))
            .andExpect(jsonPath("$.[*].recorded_at").value(hasItem(DEFAULT_RECORDED_AT)))
            .andExpect(jsonPath("$.[*].accuracy").value(hasItem(DEFAULT_ACCURACY.doubleValue())))
            .andExpect(jsonPath("$.[*].geofence_detailed_status").value(hasItem(DEFAULT_GEOFENCE_DETAILED_STATUS.toString())))
            .andExpect(jsonPath("$.[*].just_left_geofence_time").value(hasItem(DEFAULT_JUST_LEFT_GEOFENCE_TIME)))
            .andExpect(jsonPath("$.[*].user_id").value(hasItem(DEFAULT_USER_ID.intValue())));
    }

    @Test
    @Transactional
    void getGeoLocation() throws Exception {
        // Initialize the database
        geoLocationRepository.saveAndFlush(geoLocation);

        // Get the geoLocation
        restGeoLocationMockMvc
            .perform(get(ENTITY_API_URL_ID, geoLocation.getId()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON_VALUE))
            .andExpect(jsonPath("$.id").value(geoLocation.getId().intValue()))
            .andExpect(jsonPath("$.longitude").value(DEFAULT_LONGITUDE.doubleValue()))
            .andExpect(jsonPath("$.acquired_at").value(DEFAULT_ACQUIRED_AT))
            .andExpect(jsonPath("$.geo_fence_status").value(DEFAULT_GEO_FENCE_STATUS.toString()))
            .andExpect(jsonPath("$.connected_to_trusted_wifi").value(DEFAULT_CONNECTED_TO_TRUSTED_WIFI.booleanValue()))
            .andExpect(jsonPath("$.source_of_geolocation").value(DEFAULT_SOURCE_OF_GEOLOCATION))
            .andExpect(jsonPath("$.latitude").value(DEFAULT_LATITUDE.doubleValue()))
            .andExpect(jsonPath("$.recorded_at").value(DEFAULT_RECORDED_AT))
            .andExpect(jsonPath("$.accuracy").value(DEFAULT_ACCURACY.doubleValue()))
            .andExpect(jsonPath("$.geofence_detailed_status").value(DEFAULT_GEOFENCE_DETAILED_STATUS.toString()))
            .andExpect(jsonPath("$.just_left_geofence_time").value(DEFAULT_JUST_LEFT_GEOFENCE_TIME))
            .andExpect(jsonPath("$.user_id").value(DEFAULT_USER_ID.intValue()));
    }

    @Test
    @Transactional
    void getNonExistingGeoLocation() throws Exception {
        // Get the geoLocation
        restGeoLocationMockMvc.perform(get(ENTITY_API_URL_ID, Long.MAX_VALUE)).andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void putExistingGeoLocation() throws Exception {
        // Initialize the database
        geoLocationRepository.saveAndFlush(geoLocation);

        int databaseSizeBeforeUpdate = geoLocationRepository.findAll().size();

        // Update the geoLocation
        GeoLocation updatedGeoLocation = geoLocationRepository.findById(geoLocation.getId()).orElseThrow();
        // Disconnect from session so that the updates on updatedGeoLocation are not directly saved in db
        em.detach(updatedGeoLocation);
        updatedGeoLocation
            .longitude(UPDATED_LONGITUDE)
            .acquired_at(UPDATED_ACQUIRED_AT)
            .geo_fence_status(UPDATED_GEO_FENCE_STATUS)
            .connected_to_trusted_wifi(UPDATED_CONNECTED_TO_TRUSTED_WIFI)
            .source_of_geolocation(UPDATED_SOURCE_OF_GEOLOCATION)
            .latitude(UPDATED_LATITUDE)
            .recorded_at(UPDATED_RECORDED_AT)
            .accuracy(UPDATED_ACCURACY)
            .geofence_detailed_status(UPDATED_GEOFENCE_DETAILED_STATUS)
            .just_left_geofence_time(UPDATED_JUST_LEFT_GEOFENCE_TIME)
            .userId(UPDATED_USER_ID);

        restGeoLocationMockMvc
            .perform(
                put(ENTITY_API_URL_ID, updatedGeoLocation.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(updatedGeoLocation))
            )
            .andExpect(status().isOk());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeUpdate);
        GeoLocation testGeoLocation = geoLocationList.get(geoLocationList.size() - 1);
        assertThat(testGeoLocation.getLongitude()).isEqualTo(UPDATED_LONGITUDE);
        assertThat(testGeoLocation.getAcquired_at()).isEqualTo(UPDATED_ACQUIRED_AT);
        assertThat(testGeoLocation.getGeo_fence_status()).isEqualTo(UPDATED_GEO_FENCE_STATUS);
        assertThat(testGeoLocation.getConnected_to_trusted_wifi()).isEqualTo(UPDATED_CONNECTED_TO_TRUSTED_WIFI);
        assertThat(testGeoLocation.getSource_of_geolocation()).isEqualTo(UPDATED_SOURCE_OF_GEOLOCATION);
        assertThat(testGeoLocation.getLatitude()).isEqualTo(UPDATED_LATITUDE);
        assertThat(testGeoLocation.getRecorded_at()).isEqualTo(UPDATED_RECORDED_AT);
        assertThat(testGeoLocation.getAccuracy()).isEqualTo(UPDATED_ACCURACY);
        assertThat(testGeoLocation.getGeofence_detailed_status()).isEqualTo(UPDATED_GEOFENCE_DETAILED_STATUS);
        assertThat(testGeoLocation.getJust_left_geofence_time()).isEqualTo(UPDATED_JUST_LEFT_GEOFENCE_TIME);
        assertThat(testGeoLocation.getUserId()).isEqualTo(UPDATED_USER_ID);
    }

    @Test
    @Transactional
    void putNonExistingGeoLocation() throws Exception {
        int databaseSizeBeforeUpdate = geoLocationRepository.findAll().size();
        geoLocation.setId(longCount.incrementAndGet());

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restGeoLocationMockMvc
            .perform(
                put(ENTITY_API_URL_ID, geoLocation.getId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(geoLocation))
            )
            .andExpect(status().isBadRequest());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithIdMismatchGeoLocation() throws Exception {
        int databaseSizeBeforeUpdate = geoLocationRepository.findAll().size();
        geoLocation.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restGeoLocationMockMvc
            .perform(
                put(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(TestUtil.convertObjectToJsonBytes(geoLocation))
            )
            .andExpect(status().isBadRequest());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void putWithMissingIdPathParamGeoLocation() throws Exception {
        int databaseSizeBeforeUpdate = geoLocationRepository.findAll().size();
        geoLocation.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restGeoLocationMockMvc
            .perform(put(ENTITY_API_URL).contentType(MediaType.APPLICATION_JSON).content(TestUtil.convertObjectToJsonBytes(geoLocation)))
            .andExpect(status().isMethodNotAllowed());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void partialUpdateGeoLocationWithPatch() throws Exception {
        // Initialize the database
        geoLocationRepository.saveAndFlush(geoLocation);

        int databaseSizeBeforeUpdate = geoLocationRepository.findAll().size();

        // Update the geoLocation using partial update
        GeoLocation partialUpdatedGeoLocation = new GeoLocation();
        partialUpdatedGeoLocation.setId(geoLocation.getId());

        partialUpdatedGeoLocation
            .geo_fence_status(UPDATED_GEO_FENCE_STATUS)
            .connected_to_trusted_wifi(UPDATED_CONNECTED_TO_TRUSTED_WIFI)
            .source_of_geolocation(UPDATED_SOURCE_OF_GEOLOCATION)
            .latitude(UPDATED_LATITUDE)
            .just_left_geofence_time(UPDATED_JUST_LEFT_GEOFENCE_TIME);

        restGeoLocationMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedGeoLocation.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(partialUpdatedGeoLocation))
            )
            .andExpect(status().isOk());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeUpdate);
        GeoLocation testGeoLocation = geoLocationList.get(geoLocationList.size() - 1);
        assertThat(testGeoLocation.getLongitude()).isEqualTo(DEFAULT_LONGITUDE);
        assertThat(testGeoLocation.getAcquired_at()).isEqualTo(DEFAULT_ACQUIRED_AT);
        assertThat(testGeoLocation.getGeo_fence_status()).isEqualTo(UPDATED_GEO_FENCE_STATUS);
        assertThat(testGeoLocation.getConnected_to_trusted_wifi()).isEqualTo(UPDATED_CONNECTED_TO_TRUSTED_WIFI);
        assertThat(testGeoLocation.getSource_of_geolocation()).isEqualTo(UPDATED_SOURCE_OF_GEOLOCATION);
        assertThat(testGeoLocation.getLatitude()).isEqualTo(UPDATED_LATITUDE);
        assertThat(testGeoLocation.getRecorded_at()).isEqualTo(DEFAULT_RECORDED_AT);
        assertThat(testGeoLocation.getAccuracy()).isEqualTo(DEFAULT_ACCURACY);
        assertThat(testGeoLocation.getGeofence_detailed_status()).isEqualTo(DEFAULT_GEOFENCE_DETAILED_STATUS);
        assertThat(testGeoLocation.getJust_left_geofence_time()).isEqualTo(UPDATED_JUST_LEFT_GEOFENCE_TIME);
        assertThat(testGeoLocation.getUserId()).isEqualTo(DEFAULT_USER_ID);
    }

    @Test
    @Transactional
    void fullUpdateGeoLocationWithPatch() throws Exception {
        // Initialize the database
        geoLocationRepository.saveAndFlush(geoLocation);

        int databaseSizeBeforeUpdate = geoLocationRepository.findAll().size();

        // Update the geoLocation using partial update
        GeoLocation partialUpdatedGeoLocation = new GeoLocation();
        partialUpdatedGeoLocation.setId(geoLocation.getId());

        partialUpdatedGeoLocation
            .longitude(UPDATED_LONGITUDE)
            .acquired_at(UPDATED_ACQUIRED_AT)
            .geo_fence_status(UPDATED_GEO_FENCE_STATUS)
            .connected_to_trusted_wifi(UPDATED_CONNECTED_TO_TRUSTED_WIFI)
            .source_of_geolocation(UPDATED_SOURCE_OF_GEOLOCATION)
            .latitude(UPDATED_LATITUDE)
            .recorded_at(UPDATED_RECORDED_AT)
            .accuracy(UPDATED_ACCURACY)
            .geofence_detailed_status(UPDATED_GEOFENCE_DETAILED_STATUS)
            .just_left_geofence_time(UPDATED_JUST_LEFT_GEOFENCE_TIME)
            .userId(UPDATED_USER_ID);

        restGeoLocationMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, partialUpdatedGeoLocation.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(partialUpdatedGeoLocation))
            )
            .andExpect(status().isOk());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeUpdate);
        GeoLocation testGeoLocation = geoLocationList.get(geoLocationList.size() - 1);
        assertThat(testGeoLocation.getLongitude()).isEqualTo(UPDATED_LONGITUDE);
        assertThat(testGeoLocation.getAcquired_at()).isEqualTo(UPDATED_ACQUIRED_AT);
        assertThat(testGeoLocation.getGeo_fence_status()).isEqualTo(UPDATED_GEO_FENCE_STATUS);
        assertThat(testGeoLocation.getConnected_to_trusted_wifi()).isEqualTo(UPDATED_CONNECTED_TO_TRUSTED_WIFI);
        assertThat(testGeoLocation.getSource_of_geolocation()).isEqualTo(UPDATED_SOURCE_OF_GEOLOCATION);
        assertThat(testGeoLocation.getLatitude()).isEqualTo(UPDATED_LATITUDE);
        assertThat(testGeoLocation.getRecorded_at()).isEqualTo(UPDATED_RECORDED_AT);
        assertThat(testGeoLocation.getAccuracy()).isEqualTo(UPDATED_ACCURACY);
        assertThat(testGeoLocation.getGeofence_detailed_status()).isEqualTo(UPDATED_GEOFENCE_DETAILED_STATUS);
        assertThat(testGeoLocation.getJust_left_geofence_time()).isEqualTo(UPDATED_JUST_LEFT_GEOFENCE_TIME);
        assertThat(testGeoLocation.getUserId()).isEqualTo(UPDATED_USER_ID);
    }

    @Test
    @Transactional
    void patchNonExistingGeoLocation() throws Exception {
        int databaseSizeBeforeUpdate = geoLocationRepository.findAll().size();
        geoLocation.setId(longCount.incrementAndGet());

        // If the entity doesn't have an ID, it will throw BadRequestAlertException
        restGeoLocationMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, geoLocation.getId())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(geoLocation))
            )
            .andExpect(status().isBadRequest());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithIdMismatchGeoLocation() throws Exception {
        int databaseSizeBeforeUpdate = geoLocationRepository.findAll().size();
        geoLocation.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restGeoLocationMockMvc
            .perform(
                patch(ENTITY_API_URL_ID, longCount.incrementAndGet())
                    .contentType("application/merge-patch+json")
                    .content(TestUtil.convertObjectToJsonBytes(geoLocation))
            )
            .andExpect(status().isBadRequest());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void patchWithMissingIdPathParamGeoLocation() throws Exception {
        int databaseSizeBeforeUpdate = geoLocationRepository.findAll().size();
        geoLocation.setId(longCount.incrementAndGet());

        // If url ID doesn't match entity ID, it will throw BadRequestAlertException
        restGeoLocationMockMvc
            .perform(
                patch(ENTITY_API_URL).contentType("application/merge-patch+json").content(TestUtil.convertObjectToJsonBytes(geoLocation))
            )
            .andExpect(status().isMethodNotAllowed());

        // Validate the GeoLocation in the database
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeUpdate);
    }

    @Test
    @Transactional
    void deleteGeoLocation() throws Exception {
        // Initialize the database
        geoLocationRepository.saveAndFlush(geoLocation);

        int databaseSizeBeforeDelete = geoLocationRepository.findAll().size();

        // Delete the geoLocation
        restGeoLocationMockMvc
            .perform(delete(ENTITY_API_URL_ID, geoLocation.getId()).accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isNoContent());

        // Validate the database contains one less item
        List<GeoLocation> geoLocationList = geoLocationRepository.findAll();
        assertThat(geoLocationList).hasSize(databaseSizeBeforeDelete - 1);
    }
}
