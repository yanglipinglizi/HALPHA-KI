package de.almaphil.insights.repository;

import de.almaphil.insights.domain.Patient;
import de.almaphil.insights.domain.UserActivity;
import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Patient entity.
 */
@SuppressWarnings("unused")
@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    List<Patient> findByUserId(long userId);
    List<Patient> findByBirthdayBetween(String from, String to);
}
