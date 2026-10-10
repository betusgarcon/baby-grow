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
 * 时间线的读投影。字段与前端 {@code JourneyEntry} 一一对应。
 *
 * <p>{@code time} 是展示串（"2:30 PM" / "8:00 PM - 6:30 AM"），排序一律用
 * {@code sortKey}——解析展示串来排序会在跨天、12/24 小时制上出错。
 */
@Entity
@Table(name = "timeline_entries")
public class TimelineEntryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "record_id")
    private Long recordId;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "type", nullable = false, length = 16)
    private String type;

    @Column(name = "filter_key", nullable = false, length = 16)
    private String filterKey;

    @Column(name = "time", nullable = false, length = 32)
    private String time;

    @Column(name = "badge", nullable = false, length = 32)
    private String badge;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "image_url", length = 512)
    private String imageUrl;

    @Column(name = "amount", length = 32)
    private String amount;

    @Column(name = "method", length = 64)
    private String method;

    @Column(name = "duration", length = 32)
    private String duration;

    @Column(name = "progress")
    private Double progress;

    @Column(name = "waking_count")
    private Integer wakingCount;

    @Column(name = "sort_key", nullable = false)
    private long sortKey;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected TimelineEntryEntity() {
        // JPA
    }

    public static TimelineEntryEntity of(Long babyId, Long recordId, LocalDate date, String type,
                                         String filterKey, String time, String badge, String title,
                                         String description, String imageUrl, long sortKey) {
        TimelineEntryEntity entry = new TimelineEntryEntity();
        entry.babyId = babyId;
        entry.recordId = recordId;
        entry.date = date;
        entry.type = type;
        entry.filterKey = filterKey;
        entry.time = time;
        entry.badge = badge;
        entry.title = title;
        entry.description = description;
        entry.imageUrl = imageUrl;
        entry.sortKey = sortKey;
        return entry;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public Long getRecordId() {
        return recordId;
    }

    public LocalDate getDate() {
        return date;
    }

    public String getType() {
        return type;
    }

    public String getFilterKey() {
        return filterKey;
    }

    public String getTime() {
        return time;
    }

    public String getBadge() {
        return badge;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public String getAmount() {
        return amount;
    }

    public String getMethod() {
        return method;
    }

    public String getDuration() {
        return duration;
    }

    public Double getProgress() {
        return progress;
    }

    public Integer getWakingCount() {
        return wakingCount;
    }

    public long getSortKey() {
        return sortKey;
    }
}
