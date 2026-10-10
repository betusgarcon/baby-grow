package com.babygrow.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** 上传的媒体。DB 只存 object_key 与元信息，二进制在存储层。 */
@Entity
@Table(name = "media_assets")
public class MediaAssetEntity {

    public static final String KIND_IMAGE = "image";
    public static final String KIND_VIDEO = "video";
    public static final String KIND_AUDIO = "audio";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(name = "baby_id")
    private Long babyId;

    @Column(name = "kind", nullable = false, length = 16)
    private String kind;

    @Column(name = "object_key", nullable = false, length = 512)
    private String objectKey;

    @Column(name = "url", nullable = false, length = 512)
    private String url;

    @Column(name = "mime", length = 128)
    private String mime;

    @Column(name = "bytes")
    private Long bytes;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MediaAssetEntity() {
        // JPA
    }

    public static MediaAssetEntity of(Long ownerUserId, Long babyId, String kind,
                                      String objectKey, String url, String mime, long bytes) {
        MediaAssetEntity asset = new MediaAssetEntity();
        asset.ownerUserId = ownerUserId;
        asset.babyId = babyId;
        asset.kind = kind;
        asset.objectKey = objectKey;
        asset.url = url;
        asset.mime = mime;
        asset.bytes = bytes;
        return asset;
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerUserId() {
        return ownerUserId;
    }

    public Long getBabyId() {
        return babyId;
    }

    public String getKind() {
        return kind;
    }

    public String getObjectKey() {
        return objectKey;
    }

    public String getUrl() {
        return url;
    }

    public String getMime() {
        return mime;
    }

    public Long getBytes() {
        return bytes;
    }
}
