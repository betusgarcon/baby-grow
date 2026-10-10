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

/**
 * 原始记录，唯一事实来源（append-only）。
 *
 * <p>结构化字段放在 {@code payload} 里：不同 kind 的结构差异很大，而 P2 的分析投影表
 * 会把这些字段展开成可聚合的列。本表只负责「如实记下发生了什么」。
 */
@Entity
@Table(name = "records")
public class RecordEntity {

    public static final String KIND_FEEDING = "feeding";
    public static final String KIND_SLEEP = "sleep";
    public static final String KIND_MOOD = "mood";
    public static final String KIND_GROWTH = "growth";
    public static final String KIND_MILESTONE = "milestone";
    public static final String KIND_MEMORY = "memory";

    public static final String SOURCE_TEXT = "TEXT";
    public static final String SOURCE_IMAGE = "IMAGE";
    public static final String SOURCE_VIDEO = "VIDEO";
    public static final String SOURCE_MANUAL = "MANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "kind", nullable = false, length = 16)
    private String kind;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "source", nullable = false, length = 16)
    private String source;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload")
    private String payload;

    @Column(name = "media_id")
    private Long mediaId;

    @Column(name = "ai_task_id")
    private Long aiTaskId;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected RecordEntity() {
        // JPA
    }

    public static RecordEntity of(Long babyId, String kind, Instant occurredAt, String source,
                                  String payloadJson, Long mediaId, Long aiTaskId, Long createdBy) {
        RecordEntity record = new RecordEntity();
        record.babyId = babyId;
        record.kind = kind;
        record.occurredAt = occurredAt;
        record.source = source;
        record.payload = payloadJson;
        record.mediaId = mediaId;
        record.aiTaskId = aiTaskId;
        record.createdBy = createdBy;
        return record;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public String getKind() {
        return kind;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getSource() {
        return source;
    }

    public String getPayload() {
        return payload;
    }

    public Long getMediaId() {
        return mediaId;
    }

    public Long getAiTaskId() {
        return aiTaskId;
    }
}
