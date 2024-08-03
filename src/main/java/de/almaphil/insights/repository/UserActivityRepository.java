package de.almaphil.insights.repository;

import de.almaphil.insights.domain.User;
import de.almaphil.insights.domain.UserActivity;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the UserActivity entity.
 */
@SuppressWarnings("unused")
@Repository
public interface UserActivityRepository extends JpaRepository<UserActivity, Long> {
    // List<UserActivity> findByUserId (Long userId);

    //    List<UserActivity> findByUserIdAndReportedFor (Long userId, String reportedFor);
    List<UserActivity> findByUserId(long userId);
}
