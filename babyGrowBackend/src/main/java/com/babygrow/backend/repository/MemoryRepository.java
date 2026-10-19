package com.babygrow.backend.repository;

import com.babygrow.backend.domain.MemoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface MemoryRepository
        extends JpaRepository<MemoryEntity, Long>, JpaSpecificationExecutor<MemoryEntity> {

    List<MemoryEntity> findByFamilyIdOrderByMemoryDateDescIdDesc(Long familyId);
}
