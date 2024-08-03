package de.almaphil.insights.web.rest;

import de.almaphil.insights.domain.Bloodpressure;
import de.almaphil.insights.repository.BloodpressureRepository;
import de.almaphil.insights.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
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
 * REST controller for managing {@link de.almaphil.insights.domain.Bloodpressure}.
 */
@RestController
@RequestMapping("/api/bloodpressures")
@Transactional
public class BloodpressureResource {

    private final Logger log = LoggerFactory.getLogger(BloodpressureResource.class);

    private static final String ENTITY_NAME = "bloodpressure";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final BloodpressureRepository bloodpressureRepository;

    public BloodpressureResource(BloodpressureRepository bloodpressureRepository) {
        this.bloodpressureRepository = bloodpressureRepository;
    }

    /**
     * {@code POST  /bloodpressures} : Create a new bloodpressure.
     *
     * @param bloodpressure the bloodpressure to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new bloodpressure, or with status {@code 400 (Bad Request)} if the bloodpressure has already an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    public ResponseEntity<Bloodpressure> createBloodpressure(@Valid @RequestBody Bloodpressure bloodpressure) throws URISyntaxException {
        log.debug("REST request to save Bloodpressure : {}", bloodpressure);
        if (bloodpressure.getId() != null) {
            throw new BadRequestAlertException("A new bloodpressure cannot already have an ID", ENTITY_NAME, "idexists");
        }
        Bloodpressure result = bloodpressureRepository.save(bloodpressure);
        return ResponseEntity
            .created(new URI("/api/bloodpressures/" + result.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, result.getId().toString()))
            .body(result);
    }

    /**
     * {@code PUT  /bloodpressures/:id} : Updates an existing bloodpressure.
     *
     * @param id the id of the bloodpressure to save.
     * @param bloodpressure the bloodpressure to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated bloodpressure,
     * or with status {@code 400 (Bad Request)} if the bloodpressure is not valid,
     * or with status {@code 500 (Internal Server Error)} if the bloodpressure couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Bloodpressure> updateBloodpressure(
        @PathVariable(value = "id", required = false) final Long id,
        @Valid @RequestBody Bloodpressure bloodpressure
    ) throws URISyntaxException {
        log.debug("REST request to update Bloodpressure : {}, {}", id, bloodpressure);
        if (bloodpressure.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, bloodpressure.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!bloodpressureRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Bloodpressure result = bloodpressureRepository.save(bloodpressure);
        return ResponseEntity
            .ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, bloodpressure.getId().toString()))
            .body(result);
    }

    /**
     * {@code PATCH  /bloodpressures/:id} : Partial updates given fields of an existing bloodpressure, field will ignore if it is null
     *
     * @param id the id of the bloodpressure to save.
     * @param bloodpressure the bloodpressure to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated bloodpressure,
     * or with status {@code 400 (Bad Request)} if the bloodpressure is not valid,
     * or with status {@code 404 (Not Found)} if the bloodpressure is not found,
     * or with status {@code 500 (Internal Server Error)} if the bloodpressure couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    public ResponseEntity<Bloodpressure> partialUpdateBloodpressure(
        @PathVariable(value = "id", required = false) final Long id,
        @NotNull @RequestBody Bloodpressure bloodpressure
    ) throws URISyntaxException {
        log.debug("REST request to partial update Bloodpressure partially : {}, {}", id, bloodpressure);
        if (bloodpressure.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, bloodpressure.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!bloodpressureRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Optional<Bloodpressure> result = bloodpressureRepository
            .findById(bloodpressure.getId())
            .map(existingBloodpressure -> {
                if (bloodpressure.getSystolic() != null) {
                    existingBloodpressure.setSystolic(bloodpressure.getSystolic());
                }
                if (bloodpressure.getDiastolic() != null) {
                    existingBloodpressure.setDiastolic(bloodpressure.getDiastolic());
                }
                if (bloodpressure.getPulse() != null) {
                    existingBloodpressure.setPulse(bloodpressure.getPulse());
                }
                if (bloodpressure.getRecorded_at() != null) {
                    existingBloodpressure.setRecorded_at(bloodpressure.getRecorded_at());
                }
                if (bloodpressure.getUserId() != null) {
                    existingBloodpressure.setUserId(bloodpressure.getUserId());
                }

                return existingBloodpressure;
            })
            .map(bloodpressureRepository::save);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, bloodpressure.getId().toString())
        );
    }

    /**
     * {@code GET  /bloodpressures} : get all the bloodpressures.
     *
     * @param pageable the pagination information.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of bloodpressures in body.
     */
    @GetMapping("")
    public ResponseEntity<List<Bloodpressure>> getAllBloodpressures(@org.springdoc.core.annotations.ParameterObject Pageable pageable) {
        log.debug("REST request to get a page of Bloodpressures");
        Page<Bloodpressure> page = bloodpressureRepository.findAll(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /bloodpressures/:id} : get the "id" bloodpressure.
     *
     * @param id the id of the bloodpressure to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the bloodpressure, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Bloodpressure> getBloodpressure(@PathVariable Long id) {
        log.debug("REST request to get Bloodpressure : {}", id);
        Optional<Bloodpressure> bloodpressure = bloodpressureRepository.findById(id);
        return ResponseUtil.wrapOrNotFound(bloodpressure);
    }

    /**
     * {@code DELETE  /bloodpressures/:id} : delete the "id" bloodpressure.
     *
     * @param id the id of the bloodpressure to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBloodpressure(@PathVariable Long id) {
        log.debug("REST request to delete Bloodpressure : {}", id);
        bloodpressureRepository.deleteById(id);
        return ResponseEntity
            .noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }

    @GetMapping("/userId/{userId}")
    public ResponseEntity<List<Bloodpressure>> geAllBloodPressurePerUserID(@PathVariable Long userId) {
        log.debug("REST request to get Bloodpressure : {}", userId);
        List<Bloodpressure> bloodPressures = bloodpressureRepository.findByUserId(userId);
        if (bloodPressures.isEmpty()) {
            return ResponseEntity.notFound().build();
        } else {
            return ResponseEntity.ok(bloodPressures);
        }
    }
}
