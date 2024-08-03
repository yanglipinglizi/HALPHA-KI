package de.almaphil.insights.web.rest;

import de.almaphil.insights.domain.UserActivity;
import de.almaphil.insights.repository.UserActivityRepository;
import de.almaphil.insights.web.rest.errors.BadRequestAlertException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Collections;
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
 * REST controller for managing {@link de.almaphil.insights.domain.UserActivity}.
 */
@RestController
@RequestMapping("/api/user-activities")
@Transactional
public class UserActivityResource {

    private final Logger log = LoggerFactory.getLogger(UserActivityResource.class);

    private static final String ENTITY_NAME = "userActivity";

    @Value("${jhipster.clientApp.name}")
    private String applicationName;

    private final UserActivityRepository userActivityRepository;

    public UserActivityResource(UserActivityRepository userActivityRepository) {
        this.userActivityRepository = userActivityRepository;
    }

    /**
     * {@code POST  /user-activities} : Create a new userActivity.
     *
     * @param userActivity the userActivity to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new userActivity, or with status {@code 400 (Bad Request)} if the userActivity has already an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    public ResponseEntity<UserActivity> createUserActivity(@RequestBody UserActivity userActivity) throws URISyntaxException {
        log.debug("REST request to save UserActivity : {}", userActivity);
        if (userActivity.getId() != null) {
            throw new BadRequestAlertException("A new userActivity cannot already have an ID", ENTITY_NAME, "idexists");
        }
        UserActivity result = userActivityRepository.save(userActivity);
        return ResponseEntity
            .created(new URI("/api/user-activities/" + result.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, result.getId().toString()))
            .body(result);
    }

    /**
     * {@code PUT  /user-activities/:id} : Updates an existing userActivity.
     *
     * @param id the id of the userActivity to save.
     * @param userActivity the userActivity to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated userActivity,
     * or with status {@code 400 (Bad Request)} if the userActivity is not valid,
     * or with status {@code 500 (Internal Server Error)} if the userActivity couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    public ResponseEntity<UserActivity> updateUserActivity(
        @PathVariable(value = "id", required = false) final Long id,
        @RequestBody UserActivity userActivity
    ) throws URISyntaxException {
        log.debug("REST request to update UserActivity : {}, {}", id, userActivity);
        if (userActivity.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, userActivity.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!userActivityRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        UserActivity result = userActivityRepository.save(userActivity);
        return ResponseEntity
            .ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, userActivity.getId().toString()))
            .body(result);
    }

    /**
     * {@code PATCH  /user-activities/:id} : Partial updates given fields of an existing userActivity, field will ignore if it is null
     *
     * @param id the id of the userActivity to save.
     * @param userActivity the userActivity to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated userActivity,
     * or with status {@code 400 (Bad Request)} if the userActivity is not valid,
     * or with status {@code 404 (Not Found)} if the userActivity is not found,
     * or with status {@code 500 (Internal Server Error)} if the userActivity couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    public ResponseEntity<UserActivity> partialUpdateUserActivity(
        @PathVariable(value = "id", required = false) final Long id,
        @RequestBody UserActivity userActivity
    ) throws URISyntaxException {
        log.debug("REST request to partial update UserActivity partially : {}, {}", id, userActivity);
        if (userActivity.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, userActivity.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!userActivityRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Optional<UserActivity> result = userActivityRepository
            .findById(userActivity.getId())
            .map(existingUserActivity -> {
                if (userActivity.getReportedFor() != null) {
                    existingUserActivity.setReportedFor(userActivity.getReportedFor());
                }
                if (userActivity.getRecordedAt() != null) {
                    existingUserActivity.setRecordedAt(userActivity.getRecordedAt());
                }
                if (userActivity.getUserId() != null) {
                    existingUserActivity.setUserId(userActivity.getUserId());
                }
                if (userActivity.getReportedAbsoluteCount() != null) {
                    existingUserActivity.setReportedAbsoluteCount(userActivity.getReportedAbsoluteCount());
                }

                return existingUserActivity;
            })
            .map(userActivityRepository::save);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, userActivity.getId().toString())
        );
    }

    /**
     * {@code GET  /user-activities} : get all the userActivities.
     *
     * @param pageable the pagination information.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of userActivities in body.
     */
    @GetMapping("")
    public ResponseEntity<List<UserActivity>> getAllUserActivities(@org.springdoc.core.annotations.ParameterObject Pageable pageable) {
        log.debug("REST request to get a page of UserActivities");
        Page<UserActivity> page = userActivityRepository.findAll(pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /user-activities/:id} : get the "id" userActivity.
     *
     * @param id the id of the userActivity to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the userActivity, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserActivity> getUserActivity(@PathVariable Long id) {
        log.debug("REST request to get UserActivity : {}", id);
        Optional<UserActivity> userActivity = userActivityRepository.findById(id);
        return ResponseUtil.wrapOrNotFound(userActivity);
    }

    @GetMapping("/userid/{userId}")
    public ResponseEntity<List<UserActivity>> getDailyUserActivityPerUserID(@PathVariable Long userId) {
        log.debug("REST request to get UserActivity : {}", userId);
        List<UserActivity> userActivities = userActivityRepository.findByUserId(userId);
        if (userActivities.isEmpty()) {
            return ResponseEntity.notFound().build();
        } else {
            return ResponseEntity.ok(userActivities);
        }
    }

    @GetMapping("/otheruserid/{userId}")
    public ResponseEntity<List<UserActivity>> getDailyOtherUserActivityPerUserID(@PathVariable Long userId) {
        log.debug("REST request to get UserActivity : {}", userId);
        List<UserActivity> userActivities = userActivityRepository.findByUserId(userId);
        if (userActivities == null || userActivities.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        } else {
            return ResponseEntity.ok(userActivities);
        }
    }

    //    @GetMapping("/useridthisyear/{userId}")
    //    public ResponseEntity<List<UserActivity>> getMonthlyUserActivityPerUserID( @PathVariable Long userId) {
    //        log.debug("REST request to get UserActivity : {}", userId);
    //        List<UserActivity> userActivities = userActivityRepository.findByUserIdAndRecordedAtBetween(userId, "2023-01-01","2023-12-31");
    //        if (userActivities.isEmpty()) {
    //            return ResponseEntity.notFound().build();
    //        } else {
    //            return ResponseEntity.ok(userActivities);
    //        }
    //    }

    //    @GetMapping("/userid/{userId}")
    //    public ResponseEntity<List<UserActivity>> getUserActivityPerUserID( @PathVariable Long userId) {
    //        log.debug("REST request to get UserActivity : {}", userId);
    //        List<UserActivity> userActivities = userActivityRepository.findByUserId(userId);
    //        if (userActivities.isEmpty()) {
    //            return ResponseEntity.notFound().build();
    //        } else {
    //            return ResponseEntity.ok(userActivities);
    //        }
    //    }

    //    @GetMapping("/{userId}/{startDate}/{endDate}")
    //    public ResponseEntity<List<UserActivity>> getUserActivityPerUserID( @PathVariable Long userId, @PathVariable String startDate, @PathVariable String endDate) {
    //        log.debug("REST request to get UserActivity : {}", userId, startDate, endDate);
    //        List<UserActivity> userActivities = userActivityRepository.findByUserIdAndRecordedAtBetween(userId,startDate,endDate);
    //        if (userActivities.isEmpty()) {
    //            return ResponseEntity.notFound().build();
    //        } else {
    //            return ResponseEntity.ok(userActivities);
    //        }
    //    }

    //    @GetMapping("/userid/{userId}/{reportedFor}")
    //    public ResponseEntity<List<UserActivity>> getUserActivityPerUserID( @PathVariable Long userId, @PathVariable String reportedFor) {
    //        log.debug("REST request to get UserActivity : {}", userId, reportedFor);
    //        List<UserActivity> userActivities = userActivityRepository.findByUserIdAndReportedFor(userId, reportedFor);
    //        if (userActivities.isEmpty()) {
    //            return ResponseEntity.notFound().build();
    //        } else {
    //            return ResponseEntity.ok(userActivities);
    //        }
    //    }

    /**
     * {@code DELETE  /user-activities/:id} : delete the "id" userActivity.
     *
     * @param id the id of the userActivity to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUserActivity(@PathVariable Long id) {
        log.debug("REST request to delete UserActivity : {}", id);
        userActivityRepository.deleteById(id);
        return ResponseEntity
            .noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }
}
