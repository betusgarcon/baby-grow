package com.babygrow.backend.repository;

import com.babygrow.backend.domain.BabyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BabyRepository extends JpaRepository<BabyEntity, Long> {

    List<BabyEntity> findByFamilyIdOrderByIdAsc(Long familyId);

    /** 当前阶段一个家庭一个宝宝，取最早创建的那个 */
    Optional<BabyEntity> findFirstByFamilyIdOrderByIdAsc(Long familyId);
}
