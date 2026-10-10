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
 * 家庭记忆。
 *
 * <p>存真实日期而不是「Oct 12, 2023」这类展示串——日期一旦被格式化成字符串就再也没法
 * 排序或按区间过滤了。展示形态由接口在返回时生成。
 */
@Entity
@Table(name = "memories")
public class MemoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "baby_id")
    private Long babyId;

    @Column(name = "category", nullable = false, length = 48)
    private String category;

    @Column(name = "title", nullable = false, length = 128)
    private String title;

    @Column(name = "memory_date", nullable = false)
    private LocalDate memoryDate;

    @Column(name = "tone", nullable = false, length = 16)
    private String tone = "green";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags")
    private String tags;

    @Column(name = "media", nullable = false, length = 16)
    private String media = "Text";

    @Column(name = "media_id")
    private Long mediaId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected MemoryEntity() {
        // JPA
    }

    public static MemoryEntity of(Long familyId, Long babyId, String category, String title,
                                  LocalDate memoryDate, String tone, String tagsJson,
                                  String media, Long mediaId) {
        MemoryEntity memory = new MemoryEntity();
        memory.familyId = familyId;
        memory.babyId = babyId;
        memory.category = category;
        memory.title = title;
        memory.memoryDate = memoryDate;
        memory.tone = tone;
        memory.tags = tagsJson;
        memory.media = media;
        memory.mediaId = mediaId;
        return memory;
    }

    public Long getId() {
        return id;
    }

    public Long getFamilyId() {
        return familyId;
    }

    public Long getBabyId() {
        return babyId;
    }

    public String getCategory() {
        return category;
    }

    public String getTitle() {
        return title;
    }

    public LocalDate getMemoryDate() {
        return memoryDate;
    }

    public String getTone() {
        return tone;
    }

    public String getTags() {
        return tags;
    }

    public String getMedia() {
        return media;
    }

    public Long getMediaId() {
        return mediaId;
    }
}
