package com.babygrow.backend.repository;

import com.babygrow.backend.domain.SleepSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface SleepSessionRepository extends JpaRepository<SleepSessionEntity, Long> {

    List<SleepSessionEntity> findByBabyIdAndStartAtBetweenOrderByStartAtAsc(
            Long babyId, Instant from, Instant to);

    /**
     * 该宝宝有没有任何睡眠记录（不限时间窗口）。
     *
     * <p>分析页的 {@code hasData} 用它判「一条都没有」。**不能用窗口内的查询代替**：
     * 某一天没记录时页面仍要保留日期选择，只有从来没有过记录才该显示空态。
     */
    boolean existsByBabyId(Long babyId);

    /** 批量删除：见 BabyMilestoneRepository#deleteByBabyId 的说明 */
    @Modifying(flushAutomatically = true)
    @Query("delete from SleepSessionEntity e where e.babyId = :babyId")
    void deleteByBabyId(@Param("babyId") Long babyId);
}
