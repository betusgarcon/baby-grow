package com.babygrow.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** 喂养投影。奶量与辅食同表，用 kind 区分——分析时要一起按天汇总。 */
@Entity
@Table(name = "feedings")
public class FeedingEntity {

    public static final String KIND_MILK = "milk";
    public static final String KIND_SOLID = "solid";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "record_id")
    private Long recordId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "kind", nullable = false, length = 16)
    private String kind;

    @Column(name = "food_name", length = 64)
    private String foodName;

    @Column(name = "food_category", length = 32)
    private String foodCategory;

    @Column(name = "amount_ml")
    private Integer amountMl;

    @Column(name = "is_first", nullable = false)
    private boolean first;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected FeedingEntity() {
        // JPA
    }

    public static FeedingEntity milk(Long babyId, Long recordId, Instant occurredAt, Integer amountMl) {
        FeedingEntity entity = new FeedingEntity();
        entity.babyId = babyId;
        entity.recordId = recordId;
        entity.occurredAt = occurredAt;
        entity.kind = KIND_MILK;
        entity.amountMl = amountMl;
        return entity;
    }

    public static FeedingEntity solid(Long babyId, Long recordId, Instant occurredAt,
                                      String foodName, String foodCategory, boolean first) {
        FeedingEntity entity = new FeedingEntity();
        entity.babyId = babyId;
        entity.recordId = recordId;
        entity.occurredAt = occurredAt;
        entity.kind = KIND_SOLID;
        entity.foodName = foodName;
        entity.foodCategory = foodCategory;
        entity.first = first;
        return entity;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getKind() {
        return kind;
    }

    public String getFoodName() {
        return foodName;
    }

    public String getFoodCategory() {
        return foodCategory;
    }

    public Integer getAmountMl() {
        return amountMl;
    }

    public boolean isFirst() {
        return first;
    }
}
