package com.babygrow.backend.repository;

import com.babygrow.backend.domain.RecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecordRepository extends JpaRepository<RecordEntity, Long> {

    List<RecordEntity> findByBabyIdOrderByOccurredAtDesc(Long babyId);
}
