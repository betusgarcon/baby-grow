package com.babygrow.backend.ai;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.config.AsyncConfig;
import com.babygrow.backend.domain.AiTaskEntity;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.media.MediaService;
import com.babygrow.backend.profile.AgeLabelCalculator;
import com.babygrow.backend.record.dto.RecordDtos.AiTaskResponse;
import com.babygrow.backend.record.dto.RecordDtos.RecognizeRequest;
import com.babygrow.backend.record.dto.RecordDtos.RecognizeResponse;
import com.babygrow.backend.repository.AiTaskRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.Executor;

/**
 * 异步识别任务。
 *
 * <p>三条约束：
 * <ol>
 *   <li>提交即返回，用户在识别期间不等；进度由前端轮询。</li>
 *   <li><b>不在慢速 AI 调用期间持有数据库事务</b>——状态变更各自成事务，
 *       否则一个 30s 的识别会长期占住连接池。</li>
 *   <li>进程重启时把上次未跑完的任务标为失败，避免前端永远轮询不到结果。</li>
 * </ol>
 */
@Service
public class AiTaskService {

    private static final Logger log = LoggerFactory.getLogger(AiTaskService.class);

    private final AiTaskRepository taskRepository;
    private final FamilyAccessService accessService;
    private final MediaService mediaService;
    private final AiClient aiClient;
    private final ObjectMapper objectMapper;
    private final Executor executor;

    public AiTaskService(AiTaskRepository taskRepository,
                         FamilyAccessService accessService,
                         MediaService mediaService,
                         AiClient aiClient,
                         ObjectMapper objectMapper,
                         @Qualifier(AsyncConfig.AI_EXECUTOR) Executor executor) {
        this.taskRepository = taskRepository;
        this.accessService = accessService;
        this.mediaService = mediaService;
        this.aiClient = aiClient;
        this.objectMapper = objectMapper;
        this.executor = executor;
    }

    public RecognizeResponse submitRecognize(Long userId, RecognizeRequest request) {
        BabyEntity baby = accessService.requireWritableBaby(userId);

        AiTaskEntity task = taskRepository.save(AiTaskEntity.pending(
                baby.getId(), AiTaskEntity.TYPE_RECOGNIZE_MEDIA, String.valueOf(request.mediaId())));

        Long taskId = task.getId();
        Long babyId = baby.getId();
        LocalDate birthday = baby.getBirthday();
        Long mediaId = request.mediaId();
        String sourceType = request.sourceType() == null ? "IMAGE" : request.sourceType();
        String note = request.note();

        // 直接用注入的 executor 而不是 @Async：同类内部调用不会经过代理，@Async 会静默失效
        executor.execute(() -> runRecognize(taskId, babyId, birthday, mediaId, sourceType, note));

        return new RecognizeResponse(taskId, task.getStatus());
    }

    private void runRecognize(Long taskId, Long babyId, LocalDate birthday,
                              Long mediaId, String sourceType, String note) {
        markRunning(taskId);
        try {
            MediaService.StoredMedia media = mediaService.load(mediaId);
            int ageMonths = AgeLabelCalculator.monthsBetween(birthday, LocalDate.now());

            var response = aiClient.extractMedia(babyId, ageMonths, sourceType,
                    media.content(), media.mime(), note);

            markSucceeded(taskId, response);
        } catch (Exception ex) {
            log.error("媒体识别失败 taskId={}", taskId, ex);
            markFailed(taskId, ex.getMessage());
        }
    }

    private void markRunning(Long taskId) {
        taskRepository.findById(taskId).ifPresent(task -> {
            task.markRunning();
            taskRepository.save(task);
        });
    }

    private void markSucceeded(Long taskId, Object payload) {
        taskRepository.findById(taskId).ifPresent(task -> {
            try {
                task.markSucceeded(objectMapper.writeValueAsString(payload));
            } catch (Exception ex) {
                task.markFailed("结果序列化失败：" + ex.getMessage());
            }
            taskRepository.save(task);
        });
    }

    private void markFailed(Long taskId, String message) {
        taskRepository.findById(taskId).ifPresent(task -> {
            task.markFailed(message == null ? "未知错误" : message);
            taskRepository.save(task);
        });
    }

    public AiTaskResponse poll(Long userId, Long taskId) {
        // 先过访问控制：任务必须属于当前用户可见的宝宝
        BabyEntity baby = accessService.requireBaby(userId);

        AiTaskEntity task = taskRepository.findById(taskId)
                .filter(item -> item.getBabyId().equals(baby.getId()))
                .orElseThrow(() -> BizException.notFound("任务不存在"));

        return new AiTaskResponse(task.getId(), task.getStatus(), parseResult(task), task.getError());
    }

    /** 把库里存的 JSON 还原成结构化对象返回给前端 */
    private JsonNode parseResult(AiTaskEntity task) {
        if (task.getResult() == null) {
            return null;
        }
        try {
            return objectMapper.readTree(task.getResult());
        } catch (Exception ex) {
            log.warn("任务结果无法解析 taskId={}", task.getId(), ex);
            return null;
        }
    }

    /** 启动时清理孤儿任务：上一次进程没跑完就退出的，现在也不会有结果了 */
    @EventListener(ApplicationReadyEvent.class)
    public void failOrphanedTasks() {
        List<AiTaskEntity> orphans = taskRepository.findByStatusIn(
                List.of(AiTaskEntity.STATUS_PENDING, AiTaskEntity.STATUS_RUNNING));

        if (orphans.isEmpty()) {
            return;
        }
        orphans.forEach(task -> task.markFailed("服务重启，任务已中断"));
        taskRepository.saveAll(orphans);
        log.warn("已把 {} 个中断的 AI 任务标记为失败", orphans.size());
    }
}
