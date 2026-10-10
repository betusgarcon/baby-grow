package com.babygrow.backend.record;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.analysis.RecordProjectionService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.menu.MenuService;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.MediaAssetEntity;
import com.babygrow.backend.domain.RecordEntity;
import com.babygrow.backend.domain.TimelineEntryEntity;
import com.babygrow.backend.record.dto.RecordDtos.CommitRequest;
import com.babygrow.backend.record.dto.RecordDtos.TimelineEntryResponse;
import com.babygrow.backend.repository.MediaAssetRepository;
import com.babygrow.backend.repository.RecordRepository;
import com.babygrow.backend.repository.TimelineEntryRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 把用户确认后的识别草稿落库。
 *
 * <p>这是记录写入的正规路径：识别结果拆成多条 {@code records}（每条一个事实），
 * 时间线上只出一张卡片。之所以不把整份识别结果塞进一条记录，是因为 P2 的分析投影
 * 要按类型聚合——一条记录一个事实，投影就是直接的字段映射。
 */
@Service
public class RecordService {

    /** 提取出的内容一条都没有时，也不该产生一条空记录 */
    private static final String DEFAULT_TITLE = "AI 记录";

    private final FamilyAccessService accessService;
    private final RecordRepository recordRepository;
    private final TimelineEntryRepository timelineRepository;
    private final MediaAssetRepository mediaRepository;
    private final RecordProjectionService projectionService;
    private final MenuService menuService;
    private final ObjectMapper objectMapper;

    public RecordService(FamilyAccessService accessService,
                         RecordRepository recordRepository,
                         TimelineEntryRepository timelineRepository,
                         MediaAssetRepository mediaRepository,
                         RecordProjectionService projectionService,
                         MenuService menuService,
                         ObjectMapper objectMapper) {
        this.accessService = accessService;
        this.recordRepository = recordRepository;
        this.timelineRepository = timelineRepository;
        this.mediaRepository = mediaRepository;
        this.projectionService = projectionService;
        this.menuService = menuService;
        this.objectMapper = objectMapper;
    }

    /** 这次提交是否新增了饮食记录——只有它才影响食谱推荐 */
    private static boolean introducesFood(CommitRequest request) {
        return notEmpty(request.food()) || notEmpty(request.milk());
    }

    private static boolean notEmpty(List<?> list) {
        return list != null && !list.isEmpty();
    }

    @Transactional
    public TimelineEntryResponse commit(Long userId, CommitRequest request) {
        BabyEntity baby = accessService.requireWritableBaby(userId);

        MediaAssetEntity media = resolveMedia(userId, request.mediaId());
        Instant occurredAt = parseOccurredAt(request.occurredAt());

        List<RecordEntity> records = new ArrayList<>();
        records.addAll(structuredRecords(baby.getId(), occurredAt, request, userId));

        String text = request.text() == null ? "" : request.text().trim();
        RecordEntity memoryRecord = null;
        if (!text.isEmpty() || media != null) {
            memoryRecord = RecordEntity.of(
                    baby.getId(),
                    RecordEntity.KIND_MEMORY,
                    occurredAt,
                    resolveSource(request.source(), media),
                    toJson(Map.of("text", text)),
                    media == null ? null : media.getId(),
                    request.taskId(),
                    userId);
            records.add(memoryRecord);
        }

        if (records.isEmpty()) {
            throw BizException.badRequest("没有可保存的内容");
        }
        // 一次落库。保存后 memoryRecord 才拿得到 id，因此顺序不能颠倒
        recordRepository.saveAll(records);
        Long memoryRecordId = memoryRecord == null ? null : memoryRecord.getId();

        // 分析投影从 records 全量重算，与写入在同一事务里——投影不会落后于事实来源
        projectionService.rebuild(baby.getId());

        // 吃了新东西，今日推荐就不再合适了，标记为过期让下次读取触发重算
        if (introducesFood(request)) {
            menuService.invalidateToday(baby.getId());
        }

        TimelineEntryEntity entry = TimelineEntryEntity.of(
                baby.getId(),
                memoryRecordId,
                TimelineEntries.localDateOf(occurredAt),
                "memory",
                media == null ? "health" : "photos",
                TimelineEntries.formatTime(occurredAt),
                "AI LOG",
                request.title() == null || request.title().isBlank() ? DEFAULT_TITLE : request.title(),
                resolveDescription(request, text),
                media == null ? null : media.getUrl(),
                occurredAt.toEpochMilli());

        return TimelineEntries.toResponse(timelineRepository.save(entry));
    }

    private List<RecordEntity> structuredRecords(Long babyId, Instant occurredAt,
                                                 CommitRequest request, Long userId) {
        List<RecordEntity> records = new ArrayList<>();
        String source = request.source() == null ? RecordEntity.SOURCE_MANUAL : request.source();

        if (request.milestones() != null) {
            for (var item : request.milestones()) {
                records.add(RecordEntity.of(babyId, RecordEntity.KIND_MILESTONE,
                        occurredAt, source,
                        toJson(Map.of("type", nullSafe(item.type()),
                                "event", nullSafe(item.event()),
                                "isFirst", Boolean.TRUE.equals(item.isFirst()))),
                        null, request.taskId(), userId));
            }
        }

        if (request.food() != null) {
            for (var item : request.food()) {
                records.add(RecordEntity.of(babyId, RecordEntity.KIND_FEEDING,
                        occurredAt, source,
                        toJson(Map.of("kind", "solid",
                                "name", nullSafe(item.name()),
                                "category", nullSafe(item.category()),
                                "isFirst", Boolean.TRUE.equals(item.isFirst()))),
                        null, request.taskId(), userId));
            }
        }

        if (request.milk() != null) {
            for (var item : request.milk()) {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("kind", "milk");
                payload.put("type", nullSafe(item.type()));
                payload.put("amountMl", item.amountMl());
                payload.put("period", nullSafe(item.period()));
                records.add(RecordEntity.of(babyId, RecordEntity.KIND_FEEDING,
                        occurredAt, source, toJson(payload), null, request.taskId(), userId));
            }
        }

        if (request.sleep() != null) {
            for (var item : request.sleep()) {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("durationMin", item.durationMin());
                payload.put("quality", nullSafe(item.quality()));
                payload.put("note", nullSafe(item.note()));
                records.add(RecordEntity.of(babyId, RecordEntity.KIND_SLEEP,
                        occurredAt, source, toJson(payload), null, request.taskId(), userId));
            }
        }

        if (request.mood() != null) {
            for (var item : request.mood()) {
                records.add(RecordEntity.of(babyId, RecordEntity.KIND_MOOD,
                        occurredAt, source,
                        toJson(Map.of("mood", nullSafe(item.mood()), "trigger", nullSafe(item.trigger()))),
                        null, request.taskId(), userId));
            }
        }

        if (request.growth() != null) {
            for (var item : request.growth()) {
                if (item == null || (item.heightCm() == null && item.weightKg() == null && item.headCm() == null)) {
                    continue;
                }
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("heightCm", item.heightCm());
                payload.put("weightKg", item.weightKg());
                payload.put("headCm", item.headCm());
                records.add(RecordEntity.of(babyId, RecordEntity.KIND_GROWTH,
                        occurredAt, source, toJson(payload), null, request.taskId(), userId));
            }
        }

        return records;
    }

    private MediaAssetEntity resolveMedia(Long userId, Long mediaId) {
        if (mediaId == null) {
            return null;
        }
        MediaAssetEntity media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> BizException.notFound("媒体不存在"));

        // 只能引用自己上传的媒体，否则可以把别人的图片挂到自己的记录上
        if (!userId.equals(media.getOwnerUserId())) {
            throw BizException.forbidden("无权引用该媒体");
        }
        return media;
    }

    private static String resolveSource(String requested, MediaAssetEntity media) {
        if (requested != null && !requested.isBlank()) {
            return requested;
        }
        if (media == null) {
            return RecordEntity.SOURCE_MANUAL;
        }
        return MediaAssetEntity.KIND_IMAGE.equals(media.getKind())
                ? RecordEntity.SOURCE_IMAGE
                : RecordEntity.SOURCE_VIDEO;
    }

    private static String resolveDescription(CommitRequest request, String text) {
        if (request.description() != null && !request.description().isBlank()) {
            return request.description();
        }
        return text.isEmpty() ? null : text;
    }

    private static Instant parseOccurredAt(String raw) {
        if (raw == null || raw.isBlank()) {
            return Instant.now();
        }
        try {
            return Instant.parse(raw);
        } catch (Exception ex) {
            throw BizException.badRequest("occurredAt 应是 ISO-8601 时刻，例如 2026-10-10T12:30:00+08:00");
        }
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw BizException.badRequest("记录内容无法序列化");
        }
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
