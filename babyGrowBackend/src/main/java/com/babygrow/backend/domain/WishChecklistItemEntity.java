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
 * 心愿清单里的一条。
 *
 * <p>更新时整份清单一起替换（前端每次提交完整的数组），所以这里不需要唯一约束，
 * {@code clientKey} 只用来把前端生成的 id 原样还回去。
 */
@Entity
@Table(name = "wish_checklist_items")
public class WishChecklistItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wish_id", nullable = false)
    private Long wishId;

    @Column(name = "client_key", length = 64)
    private String clientKey;

    @Column(name = "title", nullable = false, length = 128)
    private String title;

    @Column(name = "note", length = 255)
    private String note;

    @Column(name = "done", nullable = false)
    private boolean done;

    @Column(name = "sort", nullable = false)
    private int sort;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected WishChecklistItemEntity() {
        // JPA
    }

    public static WishChecklistItemEntity of(Long wishId, String clientKey, String title,
                                             String note, boolean done, int sort) {
        WishChecklistItemEntity item = new WishChecklistItemEntity();
        item.wishId = wishId;
        item.clientKey = clientKey;
        item.title = title;
        item.note = note;
        item.done = done;
        item.sort = sort;
        return item;
    }

    public Long getId() {
        return id;
    }

    public String getClientKey() {
        return clientKey;
    }

    public String getTitle() {
        return title;
    }

    public String getNote() {
        return note;
    }

    public boolean isDone() {
        return done;
    }
}
