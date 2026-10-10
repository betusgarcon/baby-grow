package com.babygrow.backend.repository;

import com.babygrow.backend.domain.FamilyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyRepository extends JpaRepository<FamilyEntity, Long> {
}
