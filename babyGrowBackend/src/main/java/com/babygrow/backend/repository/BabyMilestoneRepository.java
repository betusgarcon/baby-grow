package com.babygrow.backend.repository;

import com.babygrow.backend.domain.BabyMilestoneEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BabyMilestoneRepository extends JpaRepository<BabyMilestoneEntity, Long> {

    List<BabyMilestoneEntity> findByBabyIdOrderByUnlockedAtDesc(Long babyId);

    /**
     * 批量删除，必须用 {@code @Modifying} 立即执行 DELETE。
     *
     * <p>投影重建是「先清空再重算」：若走派生删除，Hibernate 会在同一次 flush 里把
     * INSERT 排在 DELETE 之前，重建出的行会与尚未删除的旧行撞上唯一约束。
     */
    @Modifying(flushAutomatically = true)
    @Query("delete from BabyMilestoneEntity e where e.babyId = :babyId")
    void deleteByBabyId(@Param("babyId") Long babyId);
}
