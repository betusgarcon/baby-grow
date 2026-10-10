package com.babygrow.backend.repository;

import com.babygrow.backend.domain.TimelineEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TimelineEntryRepository extends JpaRepository<TimelineEntryEntity, Long> {

    List<TimelineEntryEntity> findByBabyIdOrderByDateDescSortKeyDesc(Long babyId);
}
