package com.babygrow.backend.record;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.analysis.RecordProjectionService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.RecordEntity;
import com.babygrow.backend.domain.TimelineEntryEntity;
import com.babygrow.backend.record.dto.RecordDtos.TimelineAppendRequest;
import com.babygrow.backend.record.dto.RecordDtos.TimelineEntryResponse;
import com.babygrow.backend.repository.RecordRepository;
import com.babygrow.backend.repository.TimelineEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * 时间线的读写。
 *
 * <p>写入一律「先落 records，再生成 timeline 投影」，两者同事务。因此时间线上看得到的
 * 每一条，都能在 records 里追到出处——P2 的分析就是从这个事实来源重建的。
 */
@Service
public class TimelineService {

    private final FamilyAccessService accessService;
    private final RecordRepository recordRepository;
    private final TimelineEntryRepository timelineRepository;
    private final RecordProjectionService projectionService;

    public TimelineService(FamilyAccessService accessService,
                           RecordRepository recordRepository,
                           TimelineEntryRepository timelineRepository,
                           RecordProjectionService projectionService) {
        this.accessService = accessService;
        this.recordRepository = recordRepository;
        this.timelineRepository = timelineRepository;
        this.projectionService = projectionService;
    }

    @Transactional(readOnly = true)
    public List<TimelineEntryResponse> list(Long userId) {
        BabyEntity baby = accessService.requireBaby(userId);
        return timelineRepository.findByBabyIdOrderByDateDescSortKeyDesc(baby.getId())
                .stream()
                .map(TimelineEntries::toResponse)
                .toList();
    }

    /** 直接追加一条时间线（不经过 AI 识别的手工记录） */
    @Transactional
    public TimelineEntryResponse append(Long userId, TimelineAppendRequest request) {
        BabyEntity baby = accessService.requireWritableBaby(userId);

        if (request.title() == null || request.title().isBlank()) {
            throw BizException.badRequest("title 不能为空");
        }

        Instant occurredAt = TimelineEntries.parseOccurredAt(request.date(), request.time());
        String type = request.type() == null ? "memory" : request.type();

        RecordEntity record = recordRepository.save(RecordEntity.of(
                baby.getId(),
                mapKind(type),
                occurredAt,
                RecordEntity.SOURCE_MANUAL,
                null,
                null,
                null,
                userId));

        // 手工追加的条目同样要进分析投影，否则时间线有、图表上没有
        projectionService.rebuild(baby.getId());

        TimelineEntryEntity entry = TimelineEntryEntity.of(
                baby.getId(),
                record.getId(),
                TimelineEntries.localDateOf(occurredAt),
                type,
                request.filterKey() == null ? "health" : request.filterKey(),
                TimelineEntries.formatTime(occurredAt),
                request.badge() == null ? "LOG" : request.badge(),
                request.title(),
                request.description(),
                request.image(),
                occurredAt.toEpochMilli());

        return TimelineEntries.toResponse(timelineRepository.save(entry));
    }

    /** 时间线形态 → 记录类型。前端只区分三种卡片形态，记录侧需要更细的分类 */
    private static String mapKind(String timelineType) {
        return switch (timelineType) {
            case "feeding" -> RecordEntity.KIND_FEEDING;
            case "sleep" -> RecordEntity.KIND_SLEEP;
            default -> RecordEntity.KIND_MEMORY;
        };
    }
}
