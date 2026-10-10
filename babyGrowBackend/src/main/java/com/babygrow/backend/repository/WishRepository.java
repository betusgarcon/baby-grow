package com.babygrow.backend.repository;

import com.babygrow.backend.domain.WishEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WishRepository extends JpaRepository<WishEntity, Long> {

    List<WishEntity> findByBabyIdOrderBySortAscIdAsc(Long babyId);

    /** 前端只认自己生成的那个 id（client_key），所以一律按它查 */
    Optional<WishEntity> findByBabyIdAndClientKey(Long babyId, String clientKey);
}
