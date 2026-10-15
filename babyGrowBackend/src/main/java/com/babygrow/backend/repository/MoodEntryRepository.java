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

    /**
     * 该宝宝有没有任何情绪记录（不限时间窗口）。
     *
     * <p>见 {@code SleepSessionRepository#existsByBabyId} 的说明：窗口内的判空不能代替它。
     */
    boolean existsByBabyId(Long babyId);

    /** 批量删除：见 BabyMilestoneRepository#deleteByBabyId 的说明 */
    @Modifying(flushAutomatically = true)
    @Query("delete from MoodEntryEntity e where e.babyId = :babyId")
    void deleteByBabyId(@Param("babyId") Long babyId);
}
