package com.babygrow.backend.repository;

import com.babygrow.backend.domain.BabyVaccinationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BabyVaccinationRepository extends JpaRepository<BabyVaccinationEntity, Long> {

    List<BabyVaccinationEntity> findByBabyIdOrderByAdministeredAtDescIdDesc(Long babyId);

    /** 日历要把所有接种日期都摊出来 */
    List<BabyVaccinationEntity> findByBabyId(Long babyId);
}
