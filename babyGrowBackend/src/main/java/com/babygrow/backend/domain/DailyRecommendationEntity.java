package com.babygrow.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;

/**
 * 首页食谱推荐的缓存行。每个宝宝每天最多一条。
 *
 * <p>读路径只查这张表，绝不触发 LLM；生成由异步任务写回。
 */
@Entity
@Table(name = "daily_recommendations")
public class DailyRecommendationEntity {

    public static final String STATUS_PENDING = "pending";
    public static final String STATUS_READY = "ready";
    public static final String STATUS_FAILED = "failed";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "status", nullable = false, length = 16)
    private String status = STATUS_PENDING;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload")
    private String payload;

    @Column(name = "reason")
    private String reason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "avoid_items")
    private String avoidItems;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "source_refs")
    private String sourceRefs;

    @Column(name = "generator_model", length = 64)
    private String generatorModel;

    @Column(name = "error")
    private String error;

    @Column(name = "generated_at")
    private Instant generatedAt;

    @Column(name = "invalidated_at")
    private Instant invalidatedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DailyRecommendationEntity() {
        // JPA
    }

    public static DailyRecommendationEntity pending(Long babyId, LocalDate date) {
        DailyRecommendationEntity entity = new DailyRecommendationEntity();
        entity.babyId = babyId;
        entity.date = date;
        entity.status = STATUS_PENDING;
        return entity;
    }

    /** 标记该行需要（重新）生成。不删行，这样旧结果还能带 stale 标记返回。 */
    public void markPending() {
        this.status = STATUS_PENDING;
        this.invalidatedAt = Instant.now();
        this.error = null;
    }

    public void markReady(String payloadJson, String reason, String avoidItemsJson,
                          String sourceRefsJson, String model) {
        this.status = STATUS_READY;
        this.payload = payloadJson;
        this.reason = reason;
        this.avoidItems = avoidItemsJson;
        this.sourceRefs = sourceRefsJson;
        this.generatorModel = model;
        this.generatedAt = Instant.now();
        this.invalidatedAt = null;
        this.error = null;
    }

    public void markFailed(String message) {
        this.status = STATUS_FAILED;
        this.error = message;
    }

    /** 有结果、且结果没被标记为过期 */
    public boolean isFresh() {
        return STATUS_READY.equals(status) && invalidatedAt == null && payload != null;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public LocalDate getDate() {
        return date;
    }

    public String getStatus() {
        return status;
    }

    public String getPayload() {
        return payload;
    }

    public String getReason() {
        return reason;
    }

    public String getAvoidItems() {
        return avoidItems;
    }

    public String getSourceRefs() {
        return sourceRefs;
    }

    public String getGeneratorModel() {
        return generatorModel;
    }

    public String getError() {
        return error;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public Instant getInvalidatedAt() {
        return invalidatedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
