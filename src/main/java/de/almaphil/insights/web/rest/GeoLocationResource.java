package de.almaphil.insights.web.rest;

import de.almaphil.insights.domain.GeoLocation;
import de.almaphil.insights.domain.UserActivity;
import de.almaphil.insights.repository.GeoLocationRepository;
import de.almaphil.insights.web.rest.errors.BadRequestAlertException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * REST controller for managing {@link de.almaphil.insights.domain.GeoLocation}.
 */
@RestController
@RequestMapping("/api/geo-locations")
@Transactional
public class GeoLocationResource {

    private final Logger log = LoggerFactory.getLogger(GeoLocationResource.class);

    private static final String ENTITY_NAME = "geoLocation";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final GeoLocationRepository geoLocationRepository;

    public GeoLocationResource(GeoLocationRepository geoLocationRepository) {
        this.geoLocationRepository = geoLocationRepository;
    }

    /**
     * {@code POST  /geo-locations} : Create a new geoLocation.
     *
     * @param geoLocation the geoLocation to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new geoLocation, or with status {@code 400 (Bad Request)} if the geoLocation has already an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    public ResponseEntity<GeoLocation> createGeoLocation(@RequestBody GeoLocation geoLocation) throws URISyntaxException {
        log.debug("REST request to save GeoLocation : {}", geoLocation);
        if (geoLocation.getId() != null) {
            throw new BadRequestAlertException("A new geoLocation cannot already have an ID", ENTITY_NAME, "idexists");
        }
        GeoLocation result = geoLocationRepository.save(geoLocation);
        return ResponseEntity
            .created(new URI("/api/geo-locations/" + result.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, result.getId().toString()))
            .body(result);
    }

    /**
     * {@code PUT  /geo-locations/:id} : Updates an existing geoLocation.
     *
     * @param id the id of the geoLocation to save.
     * @param geoLocation the geoLocation to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated geoLocation,
     * or with status {@code 400 (Bad Request)} if the geoLocation is not valid,
     * or with status {@code 500 (Internal Server Error)} if the geoLocation couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    public ResponseEntity<GeoLocation> updateGeoLocation(
        @PathVariable(value = "id", required = false) final Long id,
        @RequestBody GeoLocation geoLocation
    ) throws URISyntaxException {
        log.debug("REST request to update GeoLocation : {}, {}", id, geoLocation);
        if (geoLocation.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, geoLocation.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!geoLocationRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        GeoLocation result = geoLocationRepository.save(geoLocation);
        return ResponseEntity
            .ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, geoLocation.getId().toString()))
            .body(result);
    }

    @GetMapping("/userid/{userId}")
    public ResponseEntity<List<GeoLocation>> getGeoLocationPerUserID(@PathVariable Long userId) {
        log.debug("REST request to get GeoLocation : {}", userId);
        List<GeoLocation> geoLocations = geoLocationRepository.findByUserId(userId);
        if (geoLocations.isEmpty()) {
            return ResponseEntity.notFound().build();
        } else {
            return ResponseEntity.ok(geoLocations);
        }
    }

    /**
     * {@code PATCH  /geo-locations/:id} : Partial updates given fields of an existing geoLocation, field will ignore if it is null
     *
     * @param id the id of the geoLocation to save.
     * @param geoLocation the geoLocation to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated geoLocation,
     * or with status {@code 400 (Bad Request)} if the geoLocation is not valid,
     * or with status {@code 404 (Not Found)} if the geoLocation is not found,
     * or with status {@code 500 (Internal Server Error)} if the geoLocation couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    public ResponseEntity<GeoLocation> partialUpdateGeoLocation(
        @PathVariable(value = "id", required = false) final Long id,
        @RequestBody GeoLocation geoLocation
    ) throws URISyntaxException {
        log.debug("REST request to partial update GeoLocation partially : {}, {}", id, geoLocation);
        if (geoLocation.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, geoLocation.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!geoLocationRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Optional<GeoLocation> result = geoLocationRepository
            .findById(geoLocation.getId())
            .map(existingGeoLocation -> {
                if (geoLocation.getLongitude() != null) {
                    existingGeoLocation.setLongitude(geoLocation.getLongitude());
                }
                if (geoLocation.getAcquired_at() != null) {
                    existingGeoLocation.setAcquired_at(geoLocation.getAcquired_at());
                }
                if (geoLocation.getGeo_fence_status() != null) {
                    existingGeoLocation.setGeo_fence_status(geoLocation.getGeo_fence_status());
                }
                if (geoLocation.getConnected_to_trusted_wifi() != null) {
                    existingGeoLocation.setConnected_to_trusted_wifi(geoLocation.getConnected_to_trusted_wifi());
                }
                if (geoLocation.getSource_of_geolocation() != null) {
                    existingGeoLocation.setSource_of_geolocation(geoLocation.getSource_of_geolocation());
                }
                if (geoLocation.getLatitude() != null) {
                    existingGeoLocation.setLatitude(geoLocation.getLatitude());
                }
                if (geoLocation.getRecorded_at() != null) {
                    existingGeoLocation.setRecorded_at(geoLocation.getRecorded_at());
                }
                if (geoLocation.getAccuracy() != null) {
                    existingGeoLocation.setAccuracy(geoLocation.getAccuracy());
                }
                if (geoLocation.getGeofence_detailed_status() != null) {
                    existingGeoLocation.setGeofence_detailed_status(geoLocation.getGeofence_detailed_status());
                }
                if (geoLocation.getJust_left_geofence_time() != null) {
                    existingGeoLocation.setJust_left_geofence_time(geoLocation.getJust_left_geofence_time());
                }
                if (geoLocation.getUserId() != null) {
                    existingGeoLocation.setUserId(geoLocation.getUserId());
                }

                return existingGeoLocation;
            })
            .map(geoLocationRepository::save);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, geoLocation.getId().toString())
        );
    }

    /**
     * {@code GET  /geo-locations} : get all the geoLocations.
     *
     * @param pageable the pagination information.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of geoLocations in body.
     */
    @GetMapping("")
    public ResponseEntity<List<GeoLocation>> getAllGeoLocations(@org.springdoc.core.annotations.ParameterObject Pageable pageable) {
        log.debug("REST request to get a page of GeoLocations");
        Page<GeoLocation> page = geoLocationRepository.findAll(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /geo-locations/:id} : get the "id" geoLocation.
     *
     * @param id the id of the geoLocation to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the geoLocation, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<GeoLocation> getGeoLocation(@PathVariable Long id) {
        log.debug("REST request to get GeoLocation : {}", id);
        Optional<GeoLocation> geoLocation = geoLocationRepository.findById(id);
        return ResponseUtil.wrapOrNotFound(geoLocation);
    }

    /**
     * {@code DELETE  /geo-locations/:id} : delete the "id" geoLocation.
     *
     * @param id the id of the geoLocation to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGeoLocation(@PathVariable Long id) {
        log.debug("REST request to delete GeoLocation : {}", id);
        geoLocationRepository.deleteById(id);
        return ResponseEntity
            .noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }
}
