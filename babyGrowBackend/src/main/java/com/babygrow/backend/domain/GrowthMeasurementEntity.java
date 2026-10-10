package com.babygrow.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

/** 生长测量投影。三项指标都可空——一次只量了体重也是有效的记录。 */
@Entity
@Table(name = "growth_measurements")
public class GrowthMeasurementEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "record_id")
    private Long recordId;

    @Column(name = "measured_at", nullable = false)
    private Instant measuredAt;

    @Column(name = "height_cm", precision = 5, scale = 2)
    private BigDecimal heightCm;

    @Column(name = "weight_kg", precision = 5, scale = 3)
    private BigDecimal weightKg;

    @Column(name = "head_cm", precision = 5, scale = 2)
    private BigDecimal headCm;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected GrowthMeasurementEntity() {
        // JPA
    }

    public static GrowthMeasurementEntity of(Long babyId, Long recordId, Instant measuredAt,
                                             BigDecimal heightCm, BigDecimal weightKg, BigDecimal headCm) {
        GrowthMeasurementEntity entity = new GrowthMeasurementEntity();
        entity.babyId = babyId;
        entity.recordId = recordId;
        entity.measuredAt = measuredAt;
        entity.heightCm = heightCm;
        entity.weightKg = weightKg;
        entity.headCm = headCm;
        return entity;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public Instant getMeasuredAt() {
        return measuredAt;
    }

    public BigDecimal getHeightCm() {
        return heightCm;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public BigDecimal getHeadCm() {
        return headCm;
    }
}
