package com.babygrow.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/**
 * 宝宝档案。
 *
 * <p>只存「唯一真值」：生日、性别、星座。年龄是派生值，不落库——存年龄会在第二天就过期。
 */
@Entity
@Table(name = "babies")
public class BabyEntity {

    public static final String GENDER_MALE = "male";
    public static final String GENDER_FEMALE = "female";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "name", nullable = false, length = 64)
    private String name;

    @Column(name = "birthday")
    private LocalDate birthday;

    @Column(name = "gender", length = 8)
    private String gender;

    @Column(name = "constellation", length = 16)
    private String constellation;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(name = "badge", length = 64)
    private String badge;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected BabyEntity() {
        // JPA
    }

    public static BabyEntity inFamily(Long familyId, String name) {
        BabyEntity baby = new BabyEntity();
        baby.familyId = familyId;
        baby.name = name;
        return baby;
    }

    public Long getId() {
        return id;
    }

    public Long getFamilyId() {
        return familyId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDate getBirthday() {
        return birthday;
    }

    public void setBirthday(LocalDate birthday) {
        this.birthday = birthday;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getConstellation() {
        return constellation;
    }

    public void setConstellation(String constellation) {
        this.constellation = constellation;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getBadge() {
        return badge;
    }

    public void setBadge(String badge) {
        this.badge = badge;
    }
}
