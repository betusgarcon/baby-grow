package com.babygrow.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** 睡眠投影。由 records(kind=sleep) 派生，可从 records 重建。 */
@Entity
@Table(name = "sleep_sessions")
public class SleepSessionEntity {

    public static final String TYPE_NIGHT = "night";
    public static final String TYPE_NAP = "nap";
    public static final String TYPE_AWAKE = "awake";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "record_id")
    private Long recordId;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at")
    private Instant endAt;

    @Column(name = "duration_min")
    private Integer durationMin;

    @Column(name = "session_type", nullable = false, length = 16)
    private String sessionType = TYPE_NIGHT;

    @Column(name = "quality", length = 16)
    private String quality;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SleepSessionEntity() {
        // JPA
    }

    public static SleepSessionEntity of(Long babyId, Long recordId, Instant startAt, Integer durationMin,
                                        String sessionType, String quality) {
        SleepSessionEntity entity = new SleepSessionEntity();
        entity.babyId = babyId;
        entity.recordId = recordId;
        entity.startAt = startAt;
        entity.durationMin = durationMin;
        entity.sessionType = sessionType == null ? TYPE_NIGHT : sessionType;
        entity.quality = quality;
        if (durationMin != null) {
            entity.endAt = startAt.plusSeconds(durationMin * 60L);
        }
        return entity;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public Instant getStartAt() {
        return startAt;
    }

    public Integer getDurationMin() {
        return durationMin;
    }

    public String getSessionType() {
        return sessionType;
    }

    public String getQuality() {
        return quality;
    }
}
