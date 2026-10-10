package com.babygrow.backend.repository;

import com.babygrow.backend.domain.AiTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiTaskRepository extends JpaRepository<AiTaskEntity, Long> {

    /** 进程重启后，把上次没跑完就中断的任务标为失败，避免前端一直轮询 */
    List<AiTaskEntity> findByStatusIn(List<String> statuses);

    List<AiTaskEntity> findByBabyIdOrderByCreatedAtDesc(Long babyId);
}
