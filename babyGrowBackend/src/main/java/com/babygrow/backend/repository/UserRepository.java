package com.babygrow.backend.repository;

import com.babygrow.backend.domain.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByWxOpenid(String wxOpenid);
}
