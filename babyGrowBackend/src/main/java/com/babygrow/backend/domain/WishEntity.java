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

/**
 * 成长心愿。
 *
 * <p>{@code clientKey} 是前端生成的 id（形如 {@code wish-1699999999999}），它同时被前端
 * 嵌进详情页路径里，所以接口必须原样返回它。数据库另有代理主键，并用
 * {@code (baby_id, client_key)} 唯一约束防止跨宝宝撞车。
 */
@Entity
@Table(name = "wishes")
public class WishEntity {

    public static final String KIND_CHECKLIST = "checklist";
    public static final String KIND_COUNTER = "counter";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "client_key", nullable = false, length = 64)
    private String clientKey;

    @Column(name = "kind", nullable = false, length = 16)
    private String kind = KIND_CHECKLIST;

    @Column(name = "icon", length = 48)
    private String icon;

    @Column(name = "circle_class", length = 48)
    private String circleClass;

    @Column(name = "title", nullable = false, length = 128)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "detail_subtitle")
    private String detailSubtitle;

    @Column(name = "goal", nullable = false)
    private int goal = 1;

    @Column(name = "unit_label", length = 32)
    private String unitLabel;

    @Column(name = "checklist_title", length = 128)
    private String checklistTitle;

    @Column(name = "path", length = 255)
    private String path;

    @Column(name = "badge", length = 64)
    private String badge;

    @Column(name = "expert_tip")
    private String expertTip;

    @Column(name = "counter_current")
    private Integer counterCurrent;

    @Column(name = "counter_target")
    private Integer counterTarget;

    @Column(name = "counter_unit", length = 32)
    private String counterUnit;

    @Column(name = "sort", nullable = false)
    private int sort;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WishEntity() {
        // JPA
    }

    public static WishEntity of(Long babyId, String clientKey) {
        WishEntity wish = new WishEntity();
        wish.babyId = babyId;
        wish.clientKey = clientKey;
        return wish;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public String getClientKey() {
        return clientKey;
    }

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getCircleClass() {
        return circleClass;
    }

    public void setCircleClass(String circleClass) {
        this.circleClass = circleClass;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDetailSubtitle() {
        return detailSubtitle;
    }

    public void setDetailSubtitle(String detailSubtitle) {
        this.detailSubtitle = detailSubtitle;
    }

    public int getGoal() {
        return goal;
    }

    public void setGoal(int goal) {
        this.goal = goal;
    }

    public String getUnitLabel() {
        return unitLabel;
    }

    public void setUnitLabel(String unitLabel) {
        this.unitLabel = unitLabel;
    }

    public String getChecklistTitle() {
        return checklistTitle;
    }

    public void setChecklistTitle(String checklistTitle) {
        this.checklistTitle = checklistTitle;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getBadge() {
        return badge;
    }

    public void setBadge(String badge) {
        this.badge = badge;
    }

    public String getExpertTip() {
        return expertTip;
    }

    public void setExpertTip(String expertTip) {
        this.expertTip = expertTip;
    }

    public Integer getCounterCurrent() {
        return counterCurrent;
    }

    public void setCounterCurrent(Integer counterCurrent) {
        this.counterCurrent = counterCurrent;
    }

    public Integer getCounterTarget() {
        return counterTarget;
    }

    public void setCounterTarget(Integer counterTarget) {
        this.counterTarget = counterTarget;
    }

    public String getCounterUnit() {
        return counterUnit;
    }

    public void setCounterUnit(String counterUnit) {
        this.counterUnit = counterUnit;
    }

    public int getSort() {
        return sort;
    }

    public void setSort(int sort) {
        this.sort = sort;
    }
}
