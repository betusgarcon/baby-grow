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
 * 家庭与成员的关联，携带角色。
 *
 * <p>这张表同时承载两种人：已注册的成员（{@code userId} 有值）和**已邀请但还没注册**的
 * 亲友（{@code userId} 为空、只有 {@code displayName} 与一次性 {@code inviteToken}）。
 * 因此 access control 一律以「{@code userId} 有值且 {@code status=active}」为准。
 */
@Entity
@Table(name = "family_members")
public class FamilyMemberEntity {

    public static final String ROLE_ADMIN = "admin";
    public static final String ROLE_CONTRIBUTOR = "contributor";
    public static final String ROLE_VIEWER = "viewer";

    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_PENDING = "pending";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    /** 未注册的受邀者为 null */
    @Column(name = "user_id")
    private Long userId;

    /** 展示名。已注册成员可留空（用 users.nickname），受邀者必填 */
    @Column(name = "display_name", length = 64)
    private String displayName;

    @Column(name = "role", nullable = false, length = 16)
    private String role = ROLE_VIEWER;

    @Column(name = "status", nullable = false, length = 16)
    private String status = STATUS_ACTIVE;

    @Column(name = "invite_token", length = 64)
    private String inviteToken;

    @Column(name = "invite_expires_at")
    private Instant inviteExpiresAt;

    @Column(name = "invited_by")
    private Long invitedBy;

    @Column(name = "avatar_class", length = 48)
    private String avatarClass;

    @Column(name = "joined_at")
    private Instant joinedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected FamilyMemberEntity() {
        // JPA
    }

    public static FamilyMemberEntity active(Long familyId, Long userId, String role) {
        FamilyMemberEntity member = new FamilyMemberEntity();
        member.familyId = familyId;
        member.userId = userId;
        member.role = role;
        member.status = STATUS_ACTIVE;
        member.joinedAt = Instant.now();
        return member;
    }

    /** 邀请一个还没有账号的亲友 */
    public static FamilyMemberEntity pending(Long familyId, String displayName, String role,
                                             String inviteToken, Instant expiresAt, Long invitedBy) {
        FamilyMemberEntity member = new FamilyMemberEntity();
        member.familyId = familyId;
        member.displayName = displayName;
        member.role = role;
        member.status = STATUS_PENDING;
        member.inviteToken = inviteToken;
        member.inviteExpiresAt = expiresAt;
        member.invitedBy = invitedBy;
        return member;
    }

    /** 受邀者接受邀请：挂上账号、转为正式成员 */
    public void accept(Long userId) {
        this.userId = userId;
        this.status = STATUS_ACTIVE;
        this.joinedAt = Instant.now();
        this.inviteToken = null;
        this.inviteExpiresAt = null;
    }

    public Long getId() {
        return id;
    }

    public Long getFamilyId() {
        return familyId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getStatus() {
        return status;
    }

    public String getInviteToken() {
        return inviteToken;
    }

    public Instant getInviteExpiresAt() {
        return inviteExpiresAt;
    }

    public String getAvatarClass() {
        return avatarClass;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    /** 只有 admin 和 contributor 能改数据，viewer 只读。pending 的受邀者什么都做不了 */
    public boolean canWrite() {
        return STATUS_ACTIVE.equals(status)
                && (ROLE_ADMIN.equals(role) || ROLE_CONTRIBUTOR.equals(role));
    }

    public boolean isAdmin() {
        return STATUS_ACTIVE.equals(status) && ROLE_ADMIN.equals(role);
    }
}
