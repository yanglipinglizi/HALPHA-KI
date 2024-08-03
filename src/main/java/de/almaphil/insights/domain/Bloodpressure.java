package de.almaphil.insights.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;

/**
 * A Bloodpressure.
 */
@Entity
@Table(name = "bloodpressure")
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Bloodpressure implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Min(value = 0)
    @Column(name = "systolic")
    private Integer systolic;

    @Min(value = 0)
    @Column(name = "diastolic")
    private Integer diastolic;

    @Min(value = 0)
    @Column(name = "pulse")
    private Integer pulse;

    @Column(name = "recorded_at")
    private String recorded_at;

    @Column(name = "user_id")
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties(value = { "bloodpressures", "userActivities", "geoLocations" }, allowSetters = true)
    private Patient patient;

    // jhipster-needle-entity-add-field - JHipster will add fields here

    public Long getId() {
        return this.id;
    }

    public Bloodpressure id(Long id) {
        this.setId(id);
        return this;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getSystolic() {
        return this.systolic;
    }

    public Bloodpressure systolic(Integer systolic) {
        this.setSystolic(systolic);
        return this;
    }

    public void setSystolic(Integer systolic) {
        this.systolic = systolic;
    }

    public Integer getDiastolic() {
        return this.diastolic;
    }

    public Bloodpressure diastolic(Integer diastolic) {
        this.setDiastolic(diastolic);
        return this;
    }

    public void setDiastolic(Integer diastolic) {
        this.diastolic = diastolic;
    }

    public Integer getPulse() {
        return this.pulse;
    }

    public Bloodpressure pulse(Integer pulse) {
        this.setPulse(pulse);
        return this;
    }

    public void setPulse(Integer pulse) {
        this.pulse = pulse;
    }

    public String getRecorded_at() {
        return this.recorded_at;
    }

    public Bloodpressure recorded_at(String recorded_at) {
        this.setRecorded_at(recorded_at);
        return this;
    }

    public void setRecorded_at(String recorded_at) {
        this.recorded_at = recorded_at;
    }

    public Long getUserId() {
        return this.userId;
    }

    public Bloodpressure userId(Long userId) {
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

    public Bloodpressure patient(Patient patient) {
        this.setPatient(patient);
        return this;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Bloodpressure)) {
            return false;
        }
        return getId() != null && getId().equals(((Bloodpressure) o).getId());
    }

    @Override
    public int hashCode() {
        // see https://vladmihalcea.com/how-to-implement-equals-and-hashcode-using-the-jpa-entity-identifier/
        return getClass().hashCode();
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "Bloodpressure{" +
            "id=" + getId() +
            ", systolic=" + getSystolic() +
            ", diastolic=" + getDiastolic() +
            ", pulse=" + getPulse() +
            ", recorded_at='" + getRecorded_at() + "'" +
            ", userId=" + getUserId() +
            "}";
    }
}
