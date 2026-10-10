package com.babygrow.backend.repository;

import com.babygrow.backend.domain.MediaAssetEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MediaAssetRepository extends JpaRepository<MediaAssetEntity, Long> {

    Optional<MediaAssetEntity> findByObjectKey(String objectKey);

    /** 前端回传的是上传接口给的绝对 URL，据此反查并顺带校验归属 */
    Optional<MediaAssetEntity> findByUrlAndOwnerUserId(String url, Long ownerUserId);
}
