package com.babygrow.backend.repository;

import com.babygrow.backend.domain.WishChecklistItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WishChecklistItemRepository extends JpaRepository<WishChecklistItemEntity, Long> {

    List<WishChecklistItemEntity> findByWishIdOrderBySortAscIdAsc(Long wishId);

    /** 清单是整份替换的，先清空再写入。批量删除的理由见 BabyMilestoneRepository */
    @Modifying(flushAutomatically = true)
    @Query("delete from WishChecklistItemEntity e where e.wishId = :wishId")
    void deleteByWishId(@Param("wishId") Long wishId);
}
