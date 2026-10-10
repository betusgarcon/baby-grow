package com.babygrow.backend.repository;

import com.babygrow.backend.domain.MoodEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface MoodEntryRepository extends JpaRepository<MoodEntryEntity, Long> {

    List<MoodEntryEntity> findByBabyIdAndOccurredAtBetweenOrderByOccurredAtAsc(
            Long babyId, Instant from, Instant to);

    /** 批量删除：见 BabyMilestoneRepository#deleteByBabyId 的说明 */
    @Modifying(flushAutomatically = true)
    @Query("delete from MoodEntryEntity e where e.babyId = :babyId")
    void deleteByBabyId(@Param("babyId") Long babyId);
}
