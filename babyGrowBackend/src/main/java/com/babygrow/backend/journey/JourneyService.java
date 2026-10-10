package com.babygrow.backend.journey;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.BabyMilestoneEntity;
import com.babygrow.backend.domain.BabyVaccinationEntity;
import com.babygrow.backend.domain.FeedingEntity;
import com.babygrow.backend.domain.GrowthMeasurementEntity;
import com.babygrow.backend.domain.SleepSessionEntity;
import com.babygrow.backend.journey.JourneyDtos.AdviceView;
import com.babygrow.backend.journey.JourneyDtos.CalendarEventView;
import com.babygrow.backend.journey.JourneyDtos.DevelopmentHighlightView;
import com.babygrow.backend.journey.JourneyDtos.MetricSummaryView;
import com.babygrow.backend.journey.JourneyDtos.MilestoneTagView;
import com.babygrow.backend.journey.JourneyDtos.MilestoneView;
import com.babygrow.backend.journey.JourneyDtos.SleepConsistencyView;
import com.babygrow.backend.journey.JourneyDtos.WeeklyInsightView;
import com.babygrow.backend.repository.BabyMilestoneRepository;
import com.babygrow.backend.repository.BabyVaccinationRepository;
import com.babygrow.backend.repository.FeedingRepository;
import com.babygrow.backend.repository.GrowthMeasurementRepository;
import com.babygrow.backend.repository.SleepSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Journey 模块：里程碑列表、日历事件、每周小记。全部由服务端从数据推导。 */
@Service
public class JourneyService {

    private static final DateTimeFormatter RANGE_DATE = DateTimeFormatter.ofPattern("MMM d", Locale.US);
    private static final DateTimeFormatter SHORT_DATE = DateTimeFormatter.ofPattern("MMM d", Locale.US);

    /** 里程碑类型 → 分类标签。AI 抽出来的是中文四类。 */
    private static final Map<String, String[]> TYPE_TAG = Map.of(
            "语言", new String[]{"Speech", "neutral"},
            "运动", new String[]{"Physical", "tertiary"},
            "社交", new String[]{"Social", "secondary"},
            "认知", new String[]{"Cognitive", "primary"});

    private static final Map<String, String[]> TIER_TAG = Map.of(
            "gold", new String[]{"Major Leap", "secondary"},
            "silver", new String[]{"New Skill", "neutral"},
            "bronze", new String[]{"First Try", "primary"});

    private final FamilyAccessService accessService;
    private final BabyMilestoneRepository milestoneRepository;
    private final BabyVaccinationRepository vaccinationRepository;
    private final GrowthMeasurementRepository growthRepository;
    private final SleepSessionRepository sleepRepository;
    private final FeedingRepository feedingRepository;

    public JourneyService(FamilyAccessService accessService,
                          BabyMilestoneRepository milestoneRepository,
                          BabyVaccinationRepository vaccinationRepository,
                          GrowthMeasurementRepository growthRepository,
                          SleepSessionRepository sleepRepository,
                          FeedingRepository feedingRepository) {
        this.accessService = accessService;
        this.milestoneRepository = milestoneRepository;
        this.vaccinationRepository = vaccinationRepository;
        this.growthRepository = growthRepository;
        this.sleepRepository = sleepRepository;
        this.feedingRepository = feedingRepository;
    }

    // ── 里程碑列表 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MilestoneView> milestones(Long userId) {
        BabyEntity baby = accessService.requireBaby(userId);

        return milestoneRepository.findByBabyIdOrderByUnlockedAtDesc(baby.getId()).stream()
                .map(this::toMilestoneView)
                .toList();
    }

    private MilestoneView toMilestoneView(BabyMilestoneEntity milestone) {
        List<MilestoneTagView> tags = new ArrayList<>();

        String[] typeTag = TYPE_TAG.get(milestone.getType() == null ? "" : milestone.getType().trim());
        if (typeTag != null) {
            tags.add(new MilestoneTagView(typeTag[0], typeTag[1]));
        }

        String[] tierTag = TIER_TAG.get(milestone.getTier() == null ? "" : milestone.getTier());
        if (tierTag != null) {
            tags.add(new MilestoneTagView(tierTag[0], tierTag[1]));
        }

        return new MilestoneView(
                milestone.getMilestoneKey(),
                milestone.getTitle(),
                nullSafe(milestone.getDescription()),
                localDateOf(milestone.getUnlockedAt()).toString(),
                milestone.getIcon() == null ? "star" : milestone.getIcon(),
                milestone.getTier() == null ? "silver" : milestone.getTier(),
                tags);
    }

    // ── 日历事件 ────────────────────────────────────────────

    /**
     * 日历上的事件由两类数据投影而来：接种计划与已达成的里程碑。
     *
     * <p>同一天可能有多条，按日期倒序返回；页面自己按月筛。
     */
    @Transactional(readOnly = true)
    public List<CalendarEventView> calendarEvents(Long userId) {
        BabyEntity baby = accessService.requireBaby(userId);
        List<CalendarEventView> events = new ArrayList<>();

        for (BabyVaccinationEntity vaccination : vaccinationRepository.findByBabyId(baby.getId())) {
            LocalDate date = vaccination.getAdministeredAt() != null
                    ? localDateOf(vaccination.getAdministeredAt())
                    : vaccination.getNextAppointment();
            if (date == null) {
                continue;
            }

            boolean done = vaccination.getAdministeredAt() != null;
            events.add(new CalendarEventView(
                    "vaccine-" + vaccination.getId(),
                    date.toString(),
                    vaccination.getName() == null ? "Vaccination" : vaccination.getName(),
                    done
                            ? (nullSafe(vaccination.getDoseLabel()).isBlank()
                                    ? "已接种" : "已接种 · " + vaccination.getDoseLabel())
                            : "待接种",
                    "vaccine",
                    "journey-vaccine"));
        }

        for (BabyMilestoneEntity milestone : milestoneRepository.findByBabyIdOrderByUnlockedAtDesc(baby.getId())) {
            events.add(new CalendarEventView(
                    "milestone-" + milestone.getId(),
                    localDateOf(milestone.getUnlockedAt()).toString(),
                    milestone.getTitle(),
                    milestone.getTier() == null ? "" : milestone.getTier(),
                    "milestone",
                    // 里程碑没有单独详情页，落到列表页
                    "journey-milestones"));
        }

        return events.stream()
                .sorted(Comparator.comparing(CalendarEventView::date).reversed())
                .toList();
    }

    // ── 每周小记 ────────────────────────────────────────────

    /**
     * 最近七天的小结。
     *
     * <p>指标、睡眠柱、亮点全部由数据推导；建议文案也是**从数据里读出来的**，不是让模型
     * 凭空发挥——没有数据支撑时宁可少说，也不编一句听起来很懂的话。
     */
    @Transactional(readOnly = true)
    public WeeklyInsightView weeklyInsight(Long userId) {
        BabyEntity baby = accessService.requireBaby(userId);

        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(6);
        Instant from = startOfDay(weekStart);
        Instant to = endOfDay(today);

        List<GrowthMeasurementEntity> measurements =
                growthRepository.findByBabyIdOrderByMeasuredAtAsc(baby.getId());
        List<SleepSessionEntity> weekSleep = sleepRepository
                .findByBabyIdAndStartAtBetweenOrderByStartAtAsc(baby.getId(), from, to);
        List<FeedingEntity> weekFeedings = feedingRepository
                .findByBabyIdAndOccurredAtBetweenOrderByOccurredAtAsc(baby.getId(), from, to);
        List<BabyMilestoneEntity> weekMilestones =
                milestoneRepository.findByBabyIdOrderByUnlockedAtDesc(baby.getId()).stream()
                        .filter(item -> !localDateOf(item.getUnlockedAt()).isBefore(weekStart))
                        .toList();

        return new WeeklyInsightView(
                RANGE_DATE.format(weekStart) + " - " + RANGE_DATE.format(today),
                metrics(measurements, weekStart, today),
                sleep(weekSleep, weekStart),
                highlights(weekMilestones),
                advice(weekSleep, weekFeedings, weekMilestones));
    }

    private List<MetricSummaryView> metrics(List<GrowthMeasurementEntity> measurements,
                                            LocalDate weekStart, LocalDate today) {
        List<MetricSummaryView> result = new ArrayList<>();
        result.add(metric(measurements, "weight", "Weight", "metric-weight", "kg",
                GrowthMeasurementEntity::getWeightKg, weekStart, today));
        result.add(metric(measurements, "height", "Height", "metric-height", "cm",
                GrowthMeasurementEntity::getHeightCm, weekStart, today));
        return result;
    }

    private MetricSummaryView metric(List<GrowthMeasurementEntity> measurements,
                                     String key, String label, String icon, String unit,
                                     java.util.function.Function<GrowthMeasurementEntity, BigDecimal> getter,
                                     LocalDate weekStart, LocalDate today) {
        var inWeek = measurements.stream()
                .filter(item -> getter.apply(item) != null)
                .filter(item -> {
                    LocalDate date = localDateOf(item.getMeasuredAt());
                    return !date.isBefore(weekStart) && !date.isAfter(today);
                })
                .max(Comparator.comparing(GrowthMeasurementEntity::getMeasuredAt));

        if (inWeek.isEmpty()) {
            // 这周没量就没有值。给空串而不是拿上一次的数据冒充——那是在编造本周的事实
            return new MetricSummaryView(key, icon, label, "", unit, "", "tertiary");
        }

        GrowthMeasurementEntity latest = inWeek.get();
        BigDecimal current = getter.apply(latest);

        BigDecimal previous = measurements.stream()
                .filter(item -> getter.apply(item) != null)
                .filter(item -> item.getMeasuredAt().isBefore(latest.getMeasuredAt()))
                .max(Comparator.comparing(GrowthMeasurementEntity::getMeasuredAt))
                .map(getter)
                .orElse(null);

        String delta = previous == null ? ""
                : formatSigned(current.subtract(previous));

        return new MetricSummaryView(
                key, icon, label, trim(current), unit, delta,
                previous != null && current.compareTo(previous) >= 0 ? "tertiary" : "secondary");
    }

    private SleepConsistencyView sleep(List<SleepSessionEntity> weekSleep, LocalDate weekStart) {
        List<Double> dailyHours = new ArrayList<>();
        for (int offset = 0; offset < 7; offset++) {
            LocalDate day = weekStart.plusDays(offset);
            int minutes = weekSleep.stream()
                    .filter(item -> localDateOf(item.getStartAt()).equals(day))
                    .mapToInt(item -> item.getDurationMin() == null ? 0 : item.getDurationMin())
                    .sum();
            dailyHours.add(Math.round(minutes / 6.0) / 10.0);
        }

        long recordedDays = dailyHours.stream().filter(hours -> hours > 0).count();
        double average = recordedDays == 0 ? 0
                : dailyHours.stream().mapToDouble(Double::doubleValue).sum() / recordedDays;

        String status = recordedDays == 0
                ? "还没有睡眠记录"
                : String.format(Locale.US, "平均 %.1f 小时/天（%d 天有记录）", average, recordedDays);

        return new SleepConsistencyView(
                "Sleep Consistency",
                "过去七天的每日睡眠时长",
                status,
                dailyHours);
    }

    private List<DevelopmentHighlightView> highlights(List<BabyMilestoneEntity> weekMilestones) {
        return weekMilestones.stream()
                .map(item -> new DevelopmentHighlightView(
                        item.getMilestoneKey(),
                        item.getTitle(),
                        SHORT_DATE.format(localDateOf(item.getUnlockedAt())),
                        item.getType() == null ? "" : item.getType(),
                        item.getIcon() == null ? "star" : item.getIcon(),
                        "gold".equals(item.getTier()) ? "secondary" : "tertiary"))
                .toList();
    }

    /** 建议只陈述数据里读得出来的事，不做医学判断，也不替家长下结论。 */
    private AdviceView advice(List<SleepSessionEntity> weekSleep,
                              List<FeedingEntity> weekFeedings,
                              List<BabyMilestoneEntity> weekMilestones) {
        List<String> points = new ArrayList<>();

        long sleepDays = weekSleep.stream()
                .map(item -> localDateOf(item.getStartAt()))
                .distinct()
                .count();
        if (sleepDays > 0) {
            int totalMinutes = weekSleep.stream()
                    .mapToInt(item -> item.getDurationMin() == null ? 0 : item.getDurationMin())
                    .sum();
            points.add(String.format(Locale.US, "这周记录了 %d 天睡眠，平均每天 %.1f 小时",
                    sleepDays, totalMinutes / (double) sleepDays / 60.0));
        }

        List<String> newFoods = weekFeedings.stream()
                .filter(item -> FeedingEntity.KIND_SOLID.equals(item.getKind()) && item.isFirst())
                .map(FeedingEntity::getFoodName)
                .filter(name -> name != null && !name.isBlank())
                .distinct()
                .toList();
        if (!newFoods.isEmpty()) {
            points.add("新尝试了 " + String.join("、", newFoods));
        }

        if (!weekMilestones.isEmpty()) {
            points.add("达成了 " + weekMilestones.size() + " 个里程碑");
        }

        if (points.isEmpty()) {
            return new AdviceView("This Week",
                    "这周还没有足够的数据可以总结。随手记几次，下周这里就会有内容。");
        }

        return new AdviceView("This Week", String.join("；", points) + "。这里只做记录汇总，不构成建议。");
    }

    // ── 共用 ────────────────────────────────────────────────

    private static LocalDate localDateOf(Instant instant) {
        return instant.atZone(ZoneId.systemDefault()).toLocalDate();
    }

    private static Instant startOfDay(LocalDate date) {
        return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    private static Instant endOfDay(LocalDate date) {
        return date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    /** "8.0" → "8"，"7.95" → "7.95" */
    private static String trim(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() <= 0 ? stripped.toPlainString()
                : stripped.setScale(Math.min(stripped.scale(), 2), RoundingMode.HALF_UP).toPlainString();
    }

    private static String formatSigned(BigDecimal delta) {
        BigDecimal rounded = delta.setScale(Math.min(Math.max(delta.scale(), 1), 2), RoundingMode.HALF_UP)
                .stripTrailingZeros();
        String text = rounded.toPlainString();
        return delta.signum() > 0 ? "+" + text : text;
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
