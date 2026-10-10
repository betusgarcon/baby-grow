package com.babygrow.backend.repository;

import com.babygrow.backend.domain.BabyPreferenceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BabyPreferenceRepository extends JpaRepository<BabyPreferenceEntity, Long> {

    List<BabyPreferenceEntity> findByBabyIdOrderBySortAscIdAsc(Long babyId);

    void deleteByBabyId(Long babyId);
}
