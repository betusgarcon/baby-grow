package com.babygrow.backend.repository;

import com.babygrow.backend.domain.MemoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemoryRepository extends JpaRepository<MemoryEntity, Long> {

    List<MemoryEntity> findByFamilyIdOrderByMemoryDateDescIdDesc(Long familyId);
}
