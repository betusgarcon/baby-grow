package com.babygrow.backend.analysis;

import com.babygrow.backend.domain.BabyMilestoneEntity;
import com.babygrow.backend.domain.FeedingEntity;
import com.babygrow.backend.domain.GrowthMeasurementEntity;
import com.babygrow.backend.domain.MoodEntryEntity;
import com.babygrow.backend.domain.RecordEntity;
import com.babygrow.backend.domain.SleepSessionEntity;
import com.babygrow.backend.repository.BabyMilestoneRepository;
import com.babygrow.backend.repository.FeedingRepository;
import com.babygrow.backend.repository.GrowthMeasurementRepository;
import com.babygrow.backend.repository.MoodEntryRepository;
import com.babygrow.backend.repository.RecordRepository;
import com.babygrow.backend.repository.ReferenceDataRepository;
import com.babygrow.backend.repository.SleepSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * 把 {@code records} 摊成分析投影表。
 *
 * <p><b>采用按宝宝全量重算，而不是增量维护。</b> 写入路径与重建路径因此共用同一段代码，
 * 投影永远不会与事实来源漂移；代价是每次写入 O(该宝宝的记录数)，在这个量级可以忽略。
 * 等到记录数真的成为瓶颈，再换成增量 + 定期对账。
 *
 * <p>投影是纯派生物，随时可以从 records 重建：{@code RebuildProjections} 命令行与
 * 每次 commit 走的是同一个方法。
 */
@Service
public class RecordProjectionService {

    private static final Logger log = LoggerFactory.getLogger(RecordProjectionService.class);

    /** 超过这个时长按「夜觉」归类，否则算「小睡」。提取结果里没有入睡时间，只能按时长判断。 */
    private static final int NIGHT_SLEEP_MIN_MINUTES = 300;

    /** 情绪自由文本 → 前端三档。映射不到的**不落库**，原文仍在 records.payload 里。 */
    private static final Set<String> HAPPY_WORDS = Set.of("开心", "高兴", "愉快", "快乐", "平静", "放松", "很好", "活泼");
    private static final Set<String> CLINGY_WORDS = Set.of("黏人", "粘人", "烦躁", "不安", "难哄", "闹脾气", "依赖");
    private static final Set<String> DISCOMFORT_WORDS = Set.of("不适", "不舒服", "难受", "疼痛", "疼", "发热", "发烧", "哭闹", "闹");

    private final RecordRepository recordRepository;
    private final SleepSessionRepository sleepRepository;
    private final FeedingRepository feedingRepository;
    private final GrowthMeasurementRepository growthRepository;
    private final MoodEntryRepository moodRepository;
    private final BabyMilestoneRepository milestoneRepository;
    private final ReferenceDataRepository referenceData;
    private final ObjectMapper objectMapper;

    public RecordProjectionService(RecordRepository recordRepository,
                                   SleepSessionRepository sleepRepository,
                                   FeedingRepository feedingRepository,
                                   GrowthMeasurementRepository growthRepository,
                                   MoodEntryRepository moodRepository,
                                   BabyMilestoneRepository milestoneRepository,
                                   ReferenceDataRepository referenceData,
                                   ObjectMapper objectMapper) {
        this.recordRepository = recordRepository;
        this.sleepRepository = sleepRepository;
        this.feedingRepository = feedingRepository;
        this.growthRepository = growthRepository;
        this.moodRepository = moodRepository;
        this.milestoneRepository = milestoneRepository;
        this.referenceData = referenceData;
        this.objectMapper = objectMapper;
    }

    /** 重建某个宝宝的全部分析投影 */
    @Transactional
    public void rebuild(Long babyId) {
        sleepRepository.deleteByBabyId(babyId);
        feedingRepository.deleteByBabyId(babyId);
        growthRepository.deleteByBabyId(babyId);
        moodRepository.deleteByBabyId(babyId);
        milestoneRepository.deleteByBabyId(babyId);

        List<RecordEntity> records = recordRepository.findByBabyIdOrderByOccurredAtDesc(babyId);
        List<ReferenceDataRepository.MilestoneCatalogEntry> catalog = referenceData.findMilestoneCatalog();

        List<Object> pending = new ArrayList<>();
        for (RecordEntity record : records) {
            project(record, catalog, pending);
        }

        saveAll(pending);
        log.debug("已重建宝宝 {} 的分析投影，来源记录 {} 条", babyId, records.size());
    }

    private void project(RecordEntity record,
                         List<ReferenceDataRepository.MilestoneCatalogEntry> catalog,
                         List<Object> pending) {
        JsonNode payload = readPayload(record.getPayload());

        switch (record.getKind()) {
            case RecordEntity.KIND_FEEDING -> projectFeeding(record, payload, pending);
            case RecordEntity.KIND_SLEEP -> projectSleep(record, payload, pending);
            case RecordEntity.KIND_MOOD -> projectMood(record, payload, pending);
            case RecordEntity.KIND_MILESTONE -> projectMilestone(record, payload, catalog, pending);
            case RecordEntity.KIND_GROWTH -> projectGrowth(record, payload, pending);
            default -> {
                // memory 等不参与分析
            }
        }
    }

    private void projectFeeding(RecordEntity record, JsonNode payload, List<Object> pending) {
        String kind = text(payload, "kind");
        if (FeedingEntity.KIND_MILK.equals(kind)) {
            pending.add(FeedingEntity.milk(record.getBabyId(), record.getId(),
                    record.getOccurredAt(), integer(payload, "amountMl")));
            return;
        }
        // 无 kind 字段时按辅食处理：AI 的食物提取就是这个形状
        pending.add(FeedingEntity.solid(record.getBabyId(), record.getId(), record.getOccurredAt(),
                text(payload, "name"), text(payload, "category"), bool(payload, "isFirst")));
    }

    private void projectSleep(RecordEntity record, JsonNode payload, List<Object> pending) {
        Integer durationMin = integer(payload, "durationMin");
        String sessionType = durationMin != null && durationMin >= NIGHT_SLEEP_MIN_MINUTES
                ? SleepSessionEntity.TYPE_NIGHT
                : SleepSessionEntity.TYPE_NAP;

        pending.add(SleepSessionEntity.of(record.getBabyId(), record.getId(),
                record.getOccurredAt(), durationMin, sessionType, text(payload, "quality")));
    }

    private void projectMood(RecordEntity record, JsonNode payload, List<Object> pending) {
        String raw = text(payload, "mood");
        String mood = mapMood(raw);
        if (mood == null) {
            // 映射不到就跳过，而不是猜一个档位——猜错比缺失更糟
            return;
        }
        pending.add(MoodEntryEntity.of(record.getBabyId(), record.getId(), record.getOccurredAt(),
                mood, raw, text(payload, "trigger"), null));
    }

    /**
     * 匹配里程碑目录时先去掉这些修饰词。
     *
     * <p>AI 抽出来的是「首次翻身」，目录里写的是「学会翻身」——直接做子串比较会对不上，
     * 于是同一个里程碑被当成两条：一条解锁、一条凭空多出来的自定义项。去掉修饰词后
     * 两边都归一到「翻身」，才能对上。
     */
    private static final List<String> MILESTONE_NOISE = List.of(
            "第一次", "首次", "学会", "会", "能", "可以", "开始", "成功", "自己", "已经", "了");

    private void projectMilestone(RecordEntity record, JsonNode payload,
                                  List<ReferenceDataRepository.MilestoneCatalogEntry> catalog,
                                  List<Object> pending) {
        String event = text(payload, "event");
        if (event == null || event.isBlank()) {
            return;
        }

        var matched = catalog.stream()
                .filter(entry -> matchesMilestone(event, entry.title()))
                .findFirst();

        String key;
        String tier;
        String icon;
        String description;
        if (matched.isPresent()) {
            key = matched.get().key();
            tier = matched.get().tier();
            icon = matched.get().icon();
            // 目录里有这个里程碑的说明，带过来给列表页用
            description = matched.get().description();
        } else {
            // 命不中目录也要落库，否则 AI 抽出来的事件就丢了
            key = customKey(event);
            tier = Boolean.TRUE.equals(bool(payload, "isFirst")) ? "gold" : "silver";
            icon = "star";
            description = null;
        }

        BabyMilestoneEntity milestone = BabyMilestoneEntity.of(record.getBabyId(), record.getId(), key, event,
                description, record.getOccurredAt(), tier, icon);
        // 类型要留在投影上：里程碑列表页按它生成分类标签
        milestone.setType(text(payload, "type"));
        pending.add(milestone);
    }

    private void projectGrowth(RecordEntity record, JsonNode payload, List<Object> pending) {
        BigDecimal height = decimal(payload, "heightCm");
        BigDecimal weight = decimal(payload, "weightKg");
        BigDecimal head = decimal(payload, "headCm");

        if (height == null && weight == null && head == null) {
            return;
        }
        pending.add(GrowthMeasurementEntity.of(record.getBabyId(), record.getId(),
                record.getOccurredAt(), height, weight, head));
    }

    /** 按类型分桶后落库。Java 17 的 switch 模式匹配仍是预览特性，这里用 instanceof 链。 */
    private void saveAll(List<Object> pending) {
        List<SleepSessionEntity> sleeps = new ArrayList<>();
        List<FeedingEntity> feedings = new ArrayList<>();
        List<GrowthMeasurementEntity> growths = new ArrayList<>();
        List<MoodEntryEntity> moods = new ArrayList<>();
        List<BabyMilestoneEntity> milestones = new ArrayList<>();

        for (Object item : pending) {
            if (item instanceof SleepSessionEntity entity) {
                sleeps.add(entity);
            } else if (item instanceof FeedingEntity entity) {
                feedings.add(entity);
            } else if (item instanceof GrowthMeasurementEntity entity) {
                growths.add(entity);
            } else if (item instanceof MoodEntryEntity entity) {
                moods.add(entity);
            } else if (item instanceof BabyMilestoneEntity entity) {
                addMilestone(milestones, entity);
            }
        }

        sleepRepository.saveAll(sleeps);
        feedingRepository.saveAll(feedings);
        growthRepository.saveAll(growths);
        moodRepository.saveAll(moods);
        milestoneRepository.saveAll(milestones);
    }

    /** 同一个 key 只保留最早达成的那次——重复记录同一里程碑不该覆盖首次达成时间 */
    private void addMilestone(List<BabyMilestoneEntity> milestones, BabyMilestoneEntity candidate) {
        boolean alreadyPresent = milestones.stream()
                .anyMatch(existing -> existing.getMilestoneKey().equals(candidate.getMilestoneKey())
                        && !existing.getUnlockedAt().isAfter(candidate.getUnlockedAt()));
        if (!alreadyPresent) {
            milestones.removeIf(existing -> existing.getMilestoneKey().equals(candidate.getMilestoneKey()));
            milestones.add(candidate);
        }
    }

    private static String mapMood(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim();
        if (containsAny(value, DISCOMFORT_WORDS)) {
            return MoodEntryEntity.MOOD_DISCOMFORT;
        }
        if (containsAny(value, CLINGY_WORDS)) {
            return MoodEntryEntity.MOOD_CLINGY;
        }
        if (containsAny(value, HAPPY_WORDS)) {
            return MoodEntryEntity.MOOD_HAPPY;
        }
        return null;
    }

    private static boolean containsAny(String value, Set<String> words) {
        return words.stream().anyMatch(value::contains);
    }

    private static String customKey(String event) {
        String slug = event.trim().replaceAll("\\s+", "_");
        String key = "custom-" + slug;
        return key.length() <= 64 ? key : key.substring(0, 64);
    }

    /** 去修饰词后双向包含即认为同一个里程碑；归一化后为空则不匹配，避免误吞。包级可见以便单测。 */
    static boolean matchesMilestone(String event, String title) {
        String normalizedEvent = normalizeMilestone(event);
        String normalizedTitle = normalizeMilestone(title);

        if (normalizedEvent.isEmpty() || normalizedTitle.isEmpty()) {
            return false;
        }
        return normalizedEvent.contains(normalizedTitle) || normalizedTitle.contains(normalizedEvent);
    }

    static String normalizeMilestone(String text) {
        String result = text;
        for (String noise : MILESTONE_NOISE) {
            result = result.replace(noise, "");
        }
        return result.trim();
    }

    private JsonNode readPayload(String payload) {
        if (payload == null || payload.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(payload);
        } catch (Exception ex) {
            log.warn("记录 payload 无法解析，跳过投影：{}", payload);
            return objectMapper.createObjectNode();
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private static Integer integer(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() || !value.isNumber() ? null : value.asInt();
    }

    private static BigDecimal decimal(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() || !value.isNumber() ? null : value.decimalValue();
    }

    private static Boolean bool(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asBoolean();
    }
}
