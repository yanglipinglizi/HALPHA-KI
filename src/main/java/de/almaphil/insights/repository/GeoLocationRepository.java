package de.almaphil.insights.repository;

import de.almaphil.insights.domain.Bloodpressure;
import de.almaphil.insights.domain.GeoLocation;
import java.util.List;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the GeoLocation entity.
 */
@SuppressWarnings("unused")
@Repository
public interface GeoLocationRepository extends JpaRepository<GeoLocation, Long> {
    List<GeoLocation> findByUserId(Long userId);
}
