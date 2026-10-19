package com.babygrow.backend.repository;

import com.babygrow.backend.domain.TimelineEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TimelineEntryRepository
        extends JpaRepository<TimelineEntryEntity, Long>, JpaSpecificationExecutor<TimelineEntryEntity> {
}
