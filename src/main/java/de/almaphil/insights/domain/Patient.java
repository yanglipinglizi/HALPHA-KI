package de.almaphil.insights.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.io.Serializable;
import java.util.HashSet;
import java.util.Set;

/**
 * A Patient.
 */
@Entity
@Table(name = "patient")
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Patient implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "sequenceGenerator")
    @SequenceGenerator(name = "sequenceGenerator")
    @Column(name = "id")
    private Long id;

    @Column(name = "health")
    private String health;

    @Column(name = "geo")
    private String geo;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "nickname")
    private String nickname;

    @Column(name = "title")
    private String title;

    @Column(name = "birthday")
    private String birthday;

    @Column(name = "sex")
    private String sex;

    @Column(name = "medical_preconditions")
    private String medical_preconditions;

    @Column(name = "home_longitude")
    private Float home_longitude;

    @Column(name = "home_latitude")
    private Float home_latitude;

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "patient")
    @JsonIgnoreProperties(value = { "patient" }, allowSetters = true)
    private Set<Bloodpressure> bloodpressures = new HashSet<>();

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "patient")
    @JsonIgnoreProperties(value = { "patient" }, allowSetters = true)
    private Set<UserActivity> userActivities = new HashSet<>();

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "patient")
    @JsonIgnoreProperties(value = { "patient" }, allowSetters = true)
    private Set<GeoLocation> geoLocations = new HashSet<>();

    // jhipster-needle-entity-add-field - JHipster will add fields here

    public Long getId() {
        return this.id;
    }

    public Patient id(Long id) {
        this.setId(id);
        return this;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getHealth() {
        return this.health;
    }

    public Patient health(String health) {
        this.setHealth(health);
        return this;
    }

    public void setHealth(String health) {
        this.health = health;
    }

    public String getGeo() {
        return this.geo;
    }

    public Patient geo(String geo) {
        this.setGeo(geo);
        return this;
    }

    public void setGeo(String geo) {
        this.geo = geo;
    }

    public Long getUser_id() {
        return this.userId;
    }

    public Patient userId(Long userId) {
        this.setUser_id(userId);
        return this;
    }

    public void setUser_id(Long userId) {
        this.userId = userId;
    }

    public String getNickname() {
        return this.nickname;
    }

    public Patient nickname(String nickname) {
        this.setNickname(nickname);
        return this;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getTitle() {
        return this.title;
    }

    public Patient title(String title) {
        this.setTitle(title);
        return this;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Float getHome_longitude() {
        return this.home_longitude;
    }

    public Patient home_longitude(Float home_longitude) {
        this.setHome_longitude(home_longitude);
        return this;
    }

    public void setHome_longitude(Float home_longitude) {
        this.home_longitude = home_longitude;
    }

    public Float getHome_latitude() {
        return this.home_latitude;
    }

    public Patient home_latitude(Float home_latitude) {
        this.setHome_latitude(home_latitude);
        return this;
    }

    public void setHome_latitude(Float home_latitude) {
        this.home_latitude = home_latitude;
    }

    public String getBirthday() {
        return this.birthday;
    }

    public Patient birthday(String birthday) {
        this.setBirthday(birthday);
        return this;
    }

    public void setBirthday(String birthday) {
        this.birthday = birthday;
    }

    public String getSex() {
        return this.sex;
    }

    public Patient sex(String sex) {
        this.setSex(sex);
        return this;
    }

    public void setSex(String sex) {
        this.sex = sex;
    }

    public String getMedical_preconditions() {
        return this.medical_preconditions;
    }

    public Patient medical_preconditions(String medical_preconditions) {
        this.setMedical_preconditions(medical_preconditions);
        return this;
    }

    public void setMedical_preconditions(String medical_preconditions) {
        this.medical_preconditions = medical_preconditions;
    }

    public Set<Bloodpressure> getBloodpressures() {
        return this.bloodpressures;
    }

    public void setBloodpressures(Set<Bloodpressure> bloodpressures) {
        if (this.bloodpressures != null) {
            this.bloodpressures.forEach(i -> i.setPatient(null));
        }
        if (bloodpressures != null) {
            bloodpressures.forEach(i -> i.setPatient(this));
        }
        this.bloodpressures = bloodpressures;
    }

    public Patient bloodpressures(Set<Bloodpressure> bloodpressures) {
        this.setBloodpressures(bloodpressures);
        return this;
    }

    public Patient addBloodpressure(Bloodpressure bloodpressure) {
        this.bloodpressures.add(bloodpressure);
        bloodpressure.setPatient(this);
        return this;
    }

    public Patient removeBloodpressure(Bloodpressure bloodpressure) {
        this.bloodpressures.remove(bloodpressure);
        bloodpressure.setPatient(null);
        return this;
    }

    public Set<UserActivity> getUserActivities() {
        return this.userActivities;
    }

    public void setUserActivities(Set<UserActivity> userActivities) {
        if (this.userActivities != null) {
            this.userActivities.forEach(i -> i.setPatient(null));
        }
        if (userActivities != null) {
            userActivities.forEach(i -> i.setPatient(this));
        }
        this.userActivities = userActivities;
    }

    public Patient userActivities(Set<UserActivity> userActivities) {
        this.setUserActivities(userActivities);
        return this;
    }

    public Patient addUserActivity(UserActivity userActivity) {
        this.userActivities.add(userActivity);
        userActivity.setPatient(this);
        return this;
    }

    public Patient removeUserActivity(UserActivity userActivity) {
        this.userActivities.remove(userActivity);
        userActivity.setPatient(null);
        return this;
    }

    public Set<GeoLocation> getGeoLocations() {
        return this.geoLocations;
    }

    public void setGeoLocations(Set<GeoLocation> geoLocations) {
        if (this.geoLocations != null) {
            this.geoLocations.forEach(i -> i.setPatient(null));
        }
        if (geoLocations != null) {
            geoLocations.forEach(i -> i.setPatient(this));
        }
        this.geoLocations = geoLocations;
    }

    public Patient geoLocations(Set<GeoLocation> geoLocations) {
        this.setGeoLocations(geoLocations);
        return this;
    }

    public Patient addGeoLocation(GeoLocation geoLocation) {
        this.geoLocations.add(geoLocation);
        geoLocation.setPatient(this);
        return this;
    }

    public Patient removeGeoLocation(GeoLocation geoLocation) {
        this.geoLocations.remove(geoLocation);
        geoLocation.setPatient(null);
        return this;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Patient)) {
            return false;
        }
        return getId() != null && getId().equals(((Patient) o).getId());
    }

    @Override
    public int hashCode() {
        // see https://vladmihalcea.com/how-to-implement-equals-and-hashcode-using-the-jpa-entity-identifier/
        return getClass().hashCode();
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "Patient{" +
            "id=" + getId() +
            ", health='" + getHealth() + "'" +
            ", geo='" + getGeo() + "'" +
            ", user_id=" + getUser_id() +
            ", nickname='" + getNickname() + "'" +
            ", title='" + getTitle() + "'" +
            ", birthday='" + getBirthday() + "'" +
            ", sex='" + getSex() + "'" +
            ", medical_preconditions='" + getMedical_preconditions() + "'" +
            ", home_longitude='" + getHome_longitude() + "'" +
            ", home_latitude='" + getHome_latitude() + "'" +
            "}";
    }
}
