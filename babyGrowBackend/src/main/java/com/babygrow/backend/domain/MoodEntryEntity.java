package com.babygrow.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * 情绪投影。
 *
 * <p>AI 抽出来的情绪是自由文本（开心/烦躁/哭闹…），这里归一化到前端的三档，
 * 原文保留在 {@code rawMood} 里——映射不到的情绪不会被悄悄改写成某一档。
 */
@Entity
@Table(name = "mood_entries")
public class MoodEntryEntity {

    public static final String MOOD_HAPPY = "happy";
    public static final String MOOD_CLINGY = "clingy";
    public static final String MOOD_DISCOMFORT = "discomfort";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "record_id")
    private Long recordId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "mood", nullable = false, length = 16)
    private String mood;

    @Column(name = "raw_mood", length = 32)
    private String rawMood;

    @Column(name = "trigger", length = 64)
    private String trigger;

    @Column(name = "note", length = 255)
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MoodEntryEntity() {
        // JPA
    }

    public static MoodEntryEntity of(Long babyId, Long recordId, Instant occurredAt,
                                     String mood, String rawMood, String trigger, String note) {
        MoodEntryEntity entity = new MoodEntryEntity();
        entity.babyId = babyId;
        entity.recordId = recordId;
        entity.occurredAt = occurredAt;
        entity.mood = mood;
        entity.rawMood = rawMood;
        entity.trigger = trigger;
        entity.note = note;
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

    public String getMood() {
        return mood;
    }

    public String getRawMood() {
        return rawMood;
    }

    public String getTrigger() {
        return trigger;
    }
}
