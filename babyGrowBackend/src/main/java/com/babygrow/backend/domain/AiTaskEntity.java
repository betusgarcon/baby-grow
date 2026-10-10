package com.babygrow.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

/**
 * 异步 AI 任务。
 *
 * <p>图片识别约 10s、视频约 25-30s，都不能让用户同步等，因此每次识别建一条任务记录，
 * 前端轮询状态。任务状态以本表为准——进程重启后仍能如实反映。
 */
@Entity
@Table(name = "ai_tasks")
public class AiTaskEntity {

    public static final String TYPE_EXTRACT_TEXT = "extract_text";
    public static final String TYPE_RECOGNIZE_MEDIA = "recognize_media";

    public static final String STATUS_PENDING = "pending";
    public static final String STATUS_RUNNING = "running";
    public static final String STATUS_SUCCEEDED = "succeeded";
    public static final String STATUS_FAILED = "failed";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "task_type", nullable = false, length = 32)
    private String taskType;

    @Column(name = "status", nullable = false, length = 16)
    private String status = STATUS_PENDING;

    @Column(name = "input_ref", length = 255)
    private String inputRef;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result")
    private String result;

    @Column(name = "error")
    private String error;

    @Column(name = "attempt", nullable = false)
    private int attempt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    protected AiTaskEntity() {
        // JPA
    }

    public static AiTaskEntity pending(Long babyId, String taskType, String inputRef) {
        AiTaskEntity task = new AiTaskEntity();
        task.babyId = babyId;
        task.taskType = taskType;
        task.inputRef = inputRef;
        task.status = STATUS_PENDING;
        return task;
    }

    public void markRunning() {
        this.status = STATUS_RUNNING;
        this.startedAt = Instant.now();
        this.attempt++;
    }

    public void markSucceeded(String resultJson) {
        this.status = STATUS_SUCCEEDED;
        this.result = resultJson;
        this.error = null;
        this.finishedAt = Instant.now();
    }

    public void markFailed(String message) {
        this.status = STATUS_FAILED;
        this.error = message;
        this.finishedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public String getTaskType() {
        return taskType;
    }

    public String getStatus() {
        return status;
    }

    public String getInputRef() {
        return inputRef;
    }

    public String getResult() {
        return result;
    }

    public String getError() {
        return error;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }
}
