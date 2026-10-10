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

/** 宝宝的一条偏好（喜欢的玩具、睡眠习惯、喂养状况…）。前端整份替换，这里按行存。 */
@Entity
@Table(name = "baby_preferences")
public class BabyPreferenceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "icon", length = 48)
    private String icon;

    @Column(name = "label", nullable = false, length = 64)
    private String label;

    @Column(name = "value", length = 255)
    private String value;

    @Column(name = "sort", nullable = false)
    private int sort;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected BabyPreferenceEntity() {
        // JPA
    }

    public static BabyPreferenceEntity of(Long babyId, String icon, String label, String value, int sort) {
        BabyPreferenceEntity preference = new BabyPreferenceEntity();
        preference.babyId = babyId;
        preference.icon = icon;
        preference.label = label;
        preference.value = value;
        preference.sort = sort;
        return preference;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public String getIcon() {
        return icon;
    }

    public String getLabel() {
        return label;
    }

    public String getValue() {
        return value;
    }

    public int getSort() {
        return sort;
    }
}
