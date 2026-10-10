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
 * 宝宝已达成的里程碑。
 *
 * <p>{@code milestoneKey} 命中目录时用目录 key；命不中时用事件文本生成的 slug。
 * 两者共存的目的是不丢数据——AI 抽出来的事件未必都在预设目录里。
 */
@Entity
@Table(name = "baby_milestones")
public class BabyMilestoneEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "record_id")
    private Long recordId;

    @Column(name = "milestone_key", nullable = false, length = 64)
    private String milestoneKey;

    @Column(name = "title", nullable = false, length = 128)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "unlocked_at", nullable = false)
    private Instant unlockedAt;

    @Column(name = "tier", length = 16)
    private String tier;

    /** 里程碑类型：语言 / 运动 / 社交 / 认知。来自记录的 payload，列表页据此生成分类标签 */
    @Column(name = "type", length = 32)
    private String type;

    @Column(name = "icon", length = 48)
    private String icon;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BabyMilestoneEntity() {
        // JPA
    }

    public static BabyMilestoneEntity of(Long babyId, Long recordId, String milestoneKey, String title,
                                         String description, Instant unlockedAt, String tier, String icon) {
        BabyMilestoneEntity entity = new BabyMilestoneEntity();
        entity.babyId = babyId;
        entity.recordId = recordId;
        entity.milestoneKey = milestoneKey;
        entity.title = title;
        entity.description = description;
        entity.unlockedAt = unlockedAt;
        entity.tier = tier;
        entity.icon = icon;
        return entity;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getType() {
        return type;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public String getMilestoneKey() {
        return milestoneKey;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Instant getUnlockedAt() {
        return unlockedAt;
    }

    public String getTier() {
        return tier;
    }

    public String getIcon() {
        return icon;
    }
}
