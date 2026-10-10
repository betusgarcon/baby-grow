package com.babygrow.backend.repository;

import com.babygrow.backend.domain.DailyRecommendationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyRecommendationRepository extends JpaRepository<DailyRecommendationEntity, Long> {

    Optional<DailyRecommendationEntity> findByBabyIdAndDate(Long babyId, LocalDate date);

    /** 定时预生成用：全部宝宝 */
    List<DailyRecommendationEntity> findByDate(LocalDate date);
}
