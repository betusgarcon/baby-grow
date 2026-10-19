package com.babygrow.backend.record;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.analysis.RecordProjectionService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.common.Cursor;
import com.babygrow.backend.common.Messages;
import com.babygrow.backend.common.PageResponse;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.RecordEntity;
import com.babygrow.backend.domain.TimelineEntryEntity;
import com.babygrow.backend.record.dto.RecordDtos.TimelineAppendRequest;
import com.babygrow.backend.record.dto.RecordDtos.TimelineEntryResponse;
import com.babygrow.backend.repository.RecordRepository;
import com.babygrow.backend.repository.TimelineEntryRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

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
    private final Messages messages;

    public TimelineService(FamilyAccessService accessService,
                           RecordRepository recordRepository,
                           TimelineEntryRepository timelineRepository,
                           RecordProjectionService projectionService,
                           Messages messages) {
        this.accessService = accessService;
        this.recordRepository = recordRepository;
        this.timelineRepository = timelineRepository;
        this.projectionService = projectionService;
        this.messages = messages;
    }

    private static final Set<String> TIMELINE_FILTERS = Set.of("milestones", "photos", "health");

    /**
     * 时间线分页。月份与事件类型都在服务端过滤：若先分页再在前端筛，
     * 第一页被筛空时用户会误以为「这个月没有记录」。
     */
    @Transactional(readOnly = true)
    public PageResponse<TimelineEntryResponse> list(Long userId, String month, String filterKey,
                                                    Integer limit, String cursor) {
        BabyEntity baby = accessService.requireBaby(userId);
        int size = PageResponse.limit(limit);

        LocalDate from = null;
        LocalDate to = null;
        if (month != null && !month.isBlank()) {
            try {
                YearMonth target = YearMonth.parse(month);
                from = target.atDay(1);
                to = target.atEndOfMonth();
            } catch (Exception ex) {
                throw BizException.badRequestKey("error.invalidMonth");
            }
        }

        String normalizedFilter = null;
        if (filterKey != null && !filterKey.isBlank() && !"all".equals(filterKey)) {
            if (!TIMELINE_FILTERS.contains(filterKey)) {
                throw BizException.badRequestKey("error.invalidFilter");
            }
            normalizedFilter = filterKey;
        }

        String[] parts = Cursor.decode(cursor, 3);
        LocalDate cursorDate = null;
        Long cursorSortKey = null;
        Long cursorId = null;
        if (parts != null) {
            try {
                cursorDate = LocalDate.parse(parts[0]);
                cursorSortKey = Long.parseLong(parts[1]);
                cursorId = Long.parseLong(parts[2]);
            } catch (Exception ex) {
                throw BizException.badRequestKey("error.invalidCursor");
            }
        }

        final LocalDate rangeFrom = from;
        final LocalDate rangeTo = to;
        final String filter = normalizedFilter;
        final LocalDate cursorDay = cursorDate;
        final Long cursorSort = cursorSortKey;
        final Long cursorPk = cursorId;
        Specification<TimelineEntryEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("babyId"), baby.getId()));
            if (rangeFrom != null) predicates.add(cb.greaterThanOrEqualTo(root.get("date"), rangeFrom));
            if (rangeTo != null) predicates.add(cb.lessThanOrEqualTo(root.get("date"), rangeTo));
            if (filter != null) predicates.add(cb.equal(root.get("filterKey"), filter));
            if (cursorDay != null) {
                predicates.add(cb.or(
                        cb.lessThan(root.get("date"), cursorDay),
                        cb.and(cb.equal(root.get("date"), cursorDay),
                                cb.lessThan(root.get("sortKey"), cursorSort)),
                        cb.and(cb.equal(root.get("date"), cursorDay),
                                cb.equal(root.get("sortKey"), cursorSort),
                                cb.lessThan(root.get("id"), cursorPk))));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        List<TimelineEntryEntity> fetched = timelineRepository.findAll(spec,
                PageRequest.of(0, size + 1, Sort.by(
                        Sort.Order.desc("date"), Sort.Order.desc("sortKey"), Sort.Order.desc("id"))))
                .getContent();

        return PageResponse.of(fetched, size,
                entity -> Cursor.encode(entity.getDate().toString(),
                        String.valueOf(entity.getSortKey()), String.valueOf(entity.getId())),
                TimelineEntries::toResponse);
    }

    /** 直接追加一条时间线（不经过 AI 识别的手工记录） */
    @Transactional
    public TimelineEntryResponse append(Long userId, TimelineAppendRequest request) {
        BabyEntity baby = accessService.requireWritableBaby(userId);

        if (request.title() == null || request.title().isBlank()) {
            throw BizException.badRequestKey("error.titleRequired");
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
                request.badge() == null ? messages.get("ui.record.badge.log") : request.badge(),
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
