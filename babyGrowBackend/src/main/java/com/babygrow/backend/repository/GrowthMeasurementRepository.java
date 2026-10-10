package com.babygrow.backend.repository;

import com.babygrow.backend.domain.GrowthMeasurementEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GrowthMeasurementRepository extends JpaRepository<GrowthMeasurementEntity, Long> {

    List<GrowthMeasurementEntity> findByBabyIdOrderByMeasuredAtAsc(Long babyId);

    /** 批量删除：见 BabyMilestoneRepository#deleteByBabyId 的说明 */
    @Modifying(flushAutomatically = true)
    @Query("delete from GrowthMeasurementEntity e where e.babyId = :babyId")
    void deleteByBabyId(@Param("babyId") Long babyId);
}
