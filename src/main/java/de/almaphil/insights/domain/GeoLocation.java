package de.almaphil.insights.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import de.almaphil.insights.domain.enumeration.geoFence;
import de.almaphil.insights.domain.enumeration.geoFenceDetailedStatus;
import jakarta.persistence.*;
import java.io.Serializable;

/**
 * A GeoLocation.
 */
@Entity
@Table(name = "geo_location")
@SuppressWarnings("common-java:DuplicatedBlocks")
public class GeoLocation implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "longitude")
    private Float longitude;

    @Column(name = "acquired_at")
    private String acquired_at;

    @Enumerated(EnumType.STRING)
    @Column(name = "geo_fence_status")
    private geoFence geo_fence_status;

    @Column(name = "connected_to_trusted_wifi")
    private Boolean connected_to_trusted_wifi;

    @Column(name = "source_of_geolocation")
    private String source_of_geolocation;

    @Column(name = "latitude")
    private Float latitude;

    @Column(name = "recorded_at")
    private String recorded_at;

    @Column(name = "accuracy")
    private Float accuracy;

    @Enumerated(EnumType.STRING)
    @Column(name = "geofence_detailed_status")
    private geoFenceDetailedStatus geofence_detailed_status;

    @Column(name = "just_left_geofence_time")
    private String just_left_geofence_time;

    @Column(name = "user_id")
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties(value = { "bloodpressures", "userActivities", "geoLocations" }, allowSetters = true)
    private Patient patient;

    // jhipster-needle-entity-add-field - JHipster will add fields here

    public Long getId() {
        return this.id;
    }

    public GeoLocation id(Long id) {
        this.setId(id);
        return this;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Float getLongitude() {
        return this.longitude;
    }

    public GeoLocation longitude(Float longitude) {
        this.setLongitude(longitude);
        return this;
    }

    public void setLongitude(Float longitude) {
        this.longitude = longitude;
    }

    public String getAcquired_at() {
        return this.acquired_at;
    }

    public GeoLocation acquired_at(String acquired_at) {
        this.setAcquired_at(acquired_at);
        return this;
    }

    public void setAcquired_at(String acquired_at) {
        this.acquired_at = acquired_at;
    }

    public geoFence getGeo_fence_status() {
        return this.geo_fence_status;
    }

    public GeoLocation geo_fence_status(geoFence geo_fence_status) {
        this.setGeo_fence_status(geo_fence_status);
        return this;
    }

    public void setGeo_fence_status(geoFence geo_fence_status) {
        this.geo_fence_status = geo_fence_status;
    }

    public Boolean getConnected_to_trusted_wifi() {
        return this.connected_to_trusted_wifi;
    }

    public GeoLocation connected_to_trusted_wifi(Boolean connected_to_trusted_wifi) {
        this.setConnected_to_trusted_wifi(connected_to_trusted_wifi);
        return this;
    }

    public void setConnected_to_trusted_wifi(Boolean connected_to_trusted_wifi) {
        this.connected_to_trusted_wifi = connected_to_trusted_wifi;
    }

    public String getSource_of_geolocation() {
        return this.source_of_geolocation;
    }

    public GeoLocation source_of_geolocation(String source_of_geolocation) {
        this.setSource_of_geolocation(source_of_geolocation);
        return this;
    }

    public void setSource_of_geolocation(String source_of_geolocation) {
        this.source_of_geolocation = source_of_geolocation;
    }

    public Float getLatitude() {
        return this.latitude;
    }

    public GeoLocation latitude(Float latitude) {
        this.setLatitude(latitude);
        return this;
    }

    public void setLatitude(Float latitude) {
        this.latitude = latitude;
    }

    public String getRecorded_at() {
        return this.recorded_at;
    }

    public GeoLocation recorded_at(String recorded_at) {
        this.setRecorded_at(recorded_at);
        return this;
    }

    public void setRecorded_at(String recorded_at) {
        this.recorded_at = recorded_at;
    }

    public Float getAccuracy() {
        return this.accuracy;
    }

    public GeoLocation accuracy(Float accuracy) {
        this.setAccuracy(accuracy);
        return this;
    }

    public void setAccuracy(Float accuracy) {
        this.accuracy = accuracy;
    }

    public geoFenceDetailedStatus getGeofence_detailed_status() {
        return this.geofence_detailed_status;
    }

    public GeoLocation geofence_detailed_status(geoFenceDetailedStatus geofence_detailed_status) {
        this.setGeofence_detailed_status(geofence_detailed_status);
        return this;
    }

    public void setGeofence_detailed_status(geoFenceDetailedStatus geofence_detailed_status) {
        this.geofence_detailed_status = geofence_detailed_status;
    }

    public String getJust_left_geofence_time() {
        return this.just_left_geofence_time;
    }

    public GeoLocation just_left_geofence_time(String just_left_geofence_time) {
        this.setJust_left_geofence_time(just_left_geofence_time);
        return this;
    }

    public void setJust_left_geofence_time(String just_left_geofence_time) {
        this.just_left_geofence_time = just_left_geofence_time;
    }

    public Long getUserId() {
        return this.userId;
    }

    public GeoLocation userId(Long userId) {
        this.setUserId(userId);
        return this;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Patient getPatient() {
        return this.patient;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    public GeoLocation patient(Patient patient) {
        this.setPatient(patient);
        return this;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof GeoLocation)) {
            return false;
        }
        return getId() != null && getId().equals(((GeoLocation) o).getId());
    }

    @Override
    public int hashCode() {
        // see https://vladmihalcea.com/how-to-implement-equals-and-hashcode-using-the-jpa-entity-identifier/
        return getClass().hashCode();
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "GeoLocation{" +
            "id=" + getId() +
            ", longitude=" + getLongitude() +
            ", acquired_at='" + getAcquired_at() + "'" +
            ", geo_fence_status='" + getGeo_fence_status() + "'" +
            ", connected_to_trusted_wifi='" + getConnected_to_trusted_wifi() + "'" +
            ", source_of_geolocation='" + getSource_of_geolocation() + "'" +
            ", latitude=" + getLatitude() +
            ", recorded_at='" + getRecorded_at() + "'" +
            ", accuracy=" + getAccuracy() +
            ", geofence_detailed_status='" + getGeofence_detailed_status() + "'" +
            ", just_left_geofence_time='" + getJust_left_geofence_time() + "'" +
            ", userId=" + getUserId() +
            "}";
    }
}
