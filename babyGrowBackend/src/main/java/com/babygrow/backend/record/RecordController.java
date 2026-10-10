package com.babygrow.backend.record;

import com.babygrow.backend.ai.AiTaskService;
import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.record.dto.RecordDtos.AiTaskResponse;
import com.babygrow.backend.record.dto.RecordDtos.CommitRequest;
import com.babygrow.backend.record.dto.RecordDtos.RecognizeRequest;
import com.babygrow.backend.record.dto.RecordDtos.RecognizeResponse;
import com.babygrow.backend.record.dto.RecordDtos.TimelineAppendRequest;
import com.babygrow.backend.record.dto.RecordDtos.TimelineEntryResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 记录闭环。
 *
 * <p>典型链路：
 * <pre>
 *   文本  → POST /records/extract   （Java 转发 Python，同步）
 *   图片  → POST /media → POST /records/recognize（异步）→ 轮询 /ai-tasks/{id}
 *                                    ↓
 *                          用户确认/编辑识别结果
 *                                    ↓
 *                        POST /records/commit → 落库 + 时间线
 * </pre>
 *
 * <p>recognize 与 commit 刻意分开：识别有错，必须留一道人工确认，否则错误会直接
 * 污染时间线与后续的分析投影。
 */
@RestController
@RequestMapping("/api/baby")
public class RecordController {

    private final TimelineService timelineService;
    private final RecordService recordService;
    private final AiTaskService aiTaskService;

    public RecordController(TimelineService timelineService,
                            RecordService recordService,
                            AiTaskService aiTaskService) {
        this.timelineService = timelineService;
        this.recordService = recordService;
        this.aiTaskService = aiTaskService;
    }

    @GetMapping("/timeline")
    public ApiResponse<List<TimelineEntryResponse>> timeline(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(timelineService.list(userId));
    }

    @PostMapping("/timeline")
    public ApiResponse<TimelineEntryResponse> append(@AuthenticationPrincipal Long userId,
                                                     @RequestBody TimelineAppendRequest request) {
        return ApiResponse.ok(timelineService.append(userId, request));
    }

    /** 提交媒体识别。立即返回 task_id，识别在后台线程池里跑。 */
    @PostMapping("/records/recognize")
    public ApiResponse<RecognizeResponse> recognize(@AuthenticationPrincipal Long userId,
                                                    @RequestBody RecognizeRequest request) {
        return ApiResponse.ok(aiTaskService.submitRecognize(userId, request));
    }

    @GetMapping("/ai-tasks/{taskId}")
    public ApiResponse<AiTaskResponse> pollTask(@AuthenticationPrincipal Long userId,
                                                @PathVariable Long taskId) {
        return ApiResponse.ok(aiTaskService.poll(userId, taskId));
    }

    /** 用户确认后落库 */
    @PostMapping("/records/commit")
    public ApiResponse<TimelineEntryResponse> commit(@AuthenticationPrincipal Long userId,
                                                     @RequestBody CommitRequest request) {
        return ApiResponse.ok(recordService.commit(userId, request));
    }
}
