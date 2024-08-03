package de.almaphil.insights.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.io.Serializable;

/**
 * A UserActivity.
 */
@Entity
@Table(name = "user_activity")
@SuppressWarnings("common-java:DuplicatedBlocks")
public class UserActivity implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "reported_for")
    private String reportedFor;

    @Column(name = "recorded_at")
    private String recordedAt;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "reported_absolute_count")
    private Integer reportedAbsoluteCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties(value = { "bloodpressures", "userActivities", "geoLocations" }, allowSetters = true)
    private Patient patient;

    // jhipster-needle-entity-add-field - JHipster will add fields here

    public Long getId() {
        return this.id;
    }

    public UserActivity id(Long id) {
        this.setId(id);
        return this;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReportedFor() {
        return this.reportedFor;
    }

    public UserActivity reportedFor(String reportedFor) {
        this.setReportedFor(reportedFor);
        return this;
    }

    public void setReportedFor(String reportedFor) {
        this.reportedFor = reportedFor;
    }

    public String getRecordedAt() {
        return this.recordedAt;
    }

    public UserActivity recordedAt(String recordedAt) {
        this.setRecordedAt(recordedAt);
        return this;
    }

    public void setRecordedAt(String recordedAt) {
        this.recordedAt = recordedAt;
    }

    public Long getUserId() {
        return this.userId;
    }

    public UserActivity userId(Long userId) {
        this.setUserId(userId);
        return this;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getReportedAbsoluteCount() {
        return this.reportedAbsoluteCount;
    }

    public UserActivity reportedAbsoluteCount(Integer reportedAbsoluteCount) {
        this.setReportedAbsoluteCount(reportedAbsoluteCount);
        return this;
    }

    public void setReportedAbsoluteCount(Integer reportedAbsoluteCount) {
        this.reportedAbsoluteCount = reportedAbsoluteCount;
    }

    public Patient getPatient() {
        return this.patient;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    public UserActivity patient(Patient patient) {
        this.setPatient(patient);
        return this;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof UserActivity)) {
            return false;
        }
        return getId() != null && getId().equals(((UserActivity) o).getId());
    }

    @Override
    public int hashCode() {
        // see https://vladmihalcea.com/how-to-implement-equals-and-hashcode-using-the-jpa-entity-identifier/
        return getClass().hashCode();
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "UserActivity{" +
            "id=" + getId() +
            ", reportedFor='" + getReportedFor() + "'" +
            ", recordedAt='" + getRecordedAt() + "'" +
            ", userId=" + getUserId() +
            ", reportedAbsoluteCount=" + getReportedAbsoluteCount() +
            "}";
    }
}
