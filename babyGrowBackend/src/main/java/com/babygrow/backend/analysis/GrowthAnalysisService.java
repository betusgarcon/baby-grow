package com.babygrow.backend.analysis;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.Messages;
import com.babygrow.backend.analysis.dto.AnalysisDtos.DietLegendItem;
import com.babygrow.backend.analysis.dto.AnalysisDtos.GrowthComparisonPoint;
import com.babygrow.backend.analysis.dto.AnalysisDtos.GrowthDataPoint;
import com.babygrow.backend.analysis.dto.AnalysisDtos.GrowthMetricOverview;
import com.babygrow.backend.analysis.dto.AnalysisDtos.GrowthPageResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.GrowthTrendResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.GrowthTrendSnapshot;
import com.babygrow.backend.analysis.dto.AnalysisDtos.Insight;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MilestoneItem;
import com.babygrow.backend.analysis.dto.AnalysisDtos.Metric;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MonthlyDiet;
import com.babygrow.backend.analysis.dto.AnalysisDtos.TimeRange;
import com.babygrow.backend.analysis.dto.AnalysisDtos.TrendFooter;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.BabyMilestoneEntity;
import com.babygrow.backend.domain.FeedingEntity;
import com.babygrow.backend.domain.GrowthMeasurementEntity;
import com.babygrow.backend.repository.BabyMilestoneRepository;
import com.babygrow.backend.repository.FeedingRepository;
import com.babygrow.backend.repository.GrowthMeasurementRepository;
import com.babygrow.backend.repository.ReferenceDataRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** 生长分析。全部从投影表聚合，不解析 records.payload。 */
@Service
public class GrowthAnalysisService {

    private static final List<TimeRange> TIME_RANGES = List.of(
            new TimeRange("last3m", "Last 3 Months"),
            new TimeRange("last6m", "Last 6 Months"),
            new TimeRange("birth", "Since Birth"));

    /** 辅食构成的配色，与情绪图例同一套色板 */
    private static final List<String> CATEGORY_COLORS = List.of(
            "bg-[#CFD8C7]", "bg-[#E7C9B7]", "bg-[#C1CDD3]", "bg-[#D9CFE0]", "bg-[#E6DCC0]");

    private static final int DIET_WINDOW_DAYS = 30;

    private static final String[][] TIME_RANGE_KEYS = {
            {"last3m", "ui.growth.range.last3m"},
            {"last6m", "ui.growth.range.last6m"},
            {"birth", "ui.growth.range.birth"}};

    private final FamilyAccessService accessService;
    private final GrowthMeasurementRepository growthRepository;
    private final FeedingRepository feedingRepository;
    private final BabyMilestoneRepository milestoneRepository;
    private final ReferenceDataRepository referenceData;
    private final Messages messages;

    public GrowthAnalysisService(FamilyAccessService accessService,
                                 GrowthMeasurementRepository growthRepository,
                                 FeedingRepository feedingRepository,
                                 BabyMilestoneRepository milestoneRepository,
                                 ReferenceDataRepository referenceData,
                                 Messages messages) {
        this.accessService = accessService;
        this.growthRepository = growthRepository;
        this.feedingRepository = feedingRepository;
        this.milestoneRepository = milestoneRepository;
        this.referenceData = referenceData;
        this.messages = messages;
    }

    @Transactional(readOnly = true)
    public GrowthPageResponse page(Long userId) {
        BabyEntity baby = accessService.requireBaby(userId);
        List<GrowthMeasurementEntity> measurements = growthRepository.findByBabyIdOrderByMeasuredAtAsc(baby.getId());

        Map<String, Map<String, GrowthTrendSnapshot>> trends = new LinkedHashMap<>();
        Instant now = Instant.now();
        List<TimeRange> timeRanges = timeRanges();
        for (TimeRange range : timeRanges) {
            Instant from = switch (range.key()) {
                case "last3m" -> now.minus(java.time.Duration.ofDays(90));
                case "last6m" -> now.minus(java.time.Duration.ofDays(180));
                default -> null;
            };

            Map<String, GrowthTrendSnapshot> byMetric = new LinkedHashMap<>();
            for (Metric metric : Metric.values()) {
                byMetric.put(metric.key(), snapshot(baby, measurements, metric, from));
            }
            trends.put(range.key(), byMetric);
        }

        return new GrowthPageResponse(
                insight(measurements),
                metricOverviews(baby, measurements),
                timeRanges,
                trends,
                monthlyDiet(baby),
                milestones(baby),
                // measurements 已经是全量，直接判空即可
                !measurements.isEmpty());
    }

    @Transactional(readOnly = true)
    public GrowthTrendResponse trend(Long userId, String metricKey, String rangeKey) {
        BabyEntity baby = accessService.requireBaby(userId);
        Metric metric = Metric.fromKey(metricKey);
        List<GrowthMeasurementEntity> measurements = growthRepository.findByBabyIdOrderByMeasuredAtAsc(baby.getId());

        Instant from = switch (rangeKey == null ? "" : rangeKey) {
            case "last3m" -> Instant.now().minus(java.time.Duration.ofDays(90));
            case "last6m" -> Instant.now().minus(java.time.Duration.ofDays(180));
            default -> null;
        };

        List<GrowthDataPoint> metricPoints = measurements.stream()
                .filter(item -> valueOf(item, metric) != null)
                .map(item -> new GrowthDataPoint(
                        AnalysisSupport.ageMonthsAt(baby.getBirthday(), item.getMeasuredAt()) + "M",
                        AnalysisSupport.toDouble(valueOf(item, metric))))
                .toList();

        return new GrowthTrendResponse(snapshot(baby, measurements, metric, from), metricPoints, insight(measurements));
    }

    private List<TimeRange> timeRanges() {
        List<TimeRange> ranges = new ArrayList<>();
        for (String[] entry : TIME_RANGE_KEYS) {
            ranges.add(new TimeRange(entry[0], messages.get(entry[1])));
        }
        return ranges;
    }

    private String metricLabel(Metric metric) {
        return messages.get("ui.metric." + metric.key());
    }

    private String metricChartLabel(Metric metric) {
        return messages.get("ui.metric.chart." + metric.key());
    }

    private String bandLabel(double value, Double p3, Double p50, Double p97) {
        String key = AnalysisSupport.percentileBandKey(value, p3, p50, p97);
        return key.isEmpty() ? "" : messages.get(key);
    }

    private GrowthTrendSnapshot snapshot(BabyEntity baby, List<GrowthMeasurementEntity> measurements,
                                         Metric metric, Instant from) {
        List<GrowthComparisonPoint> points = measurements.stream()
                .filter(item -> from == null || !item.getMeasuredAt().isBefore(from))
                .filter(item -> valueOf(item, metric) != null)
                .map(item -> {
                    int ageMonths = AnalysisSupport.ageMonthsAt(baby.getBirthday(), item.getMeasuredAt());
                    return new GrowthComparisonPoint(
                            ageMonths + "M",
                            AnalysisSupport.toDouble(valueOf(item, metric)),
                            referenceValue(baby, metric, ageMonths));
                })
                .toList();

        if (points.isEmpty()) {
            return new GrowthTrendSnapshot(List.of(), metricChartLabel(metric),
                    comparisonLabel(baby, metric), new TrendFooter("", "", ""));
        }

        GrowthMeasurementEntity latest = measurements.stream()
                .filter(item -> valueOf(item, metric) != null)
                .max(Comparator.comparing(GrowthMeasurementEntity::getMeasuredAt))
                .orElseThrow();

        int latestAge = AnalysisSupport.ageMonthsAt(baby.getBirthday(), latest.getMeasuredAt());
        double latestValue = AnalysisSupport.toDouble(valueOf(latest, metric));

        return new GrowthTrendSnapshot(
                points,
                metricChartLabel(metric),
                comparisonLabel(baby, metric),
                new TrendFooter(
                        messages.get("ui.growth.latestAge", latestAge),
                        formatNumber(latestValue) + " " + metric.unit(),
                        bandLabel(latestValue,
                                boundValue(baby, metric, latestAge, "p3"),
                                boundValue(baby, metric, latestAge, "p50"),
                                boundValue(baby, metric, latestAge, "p97"))));
    }

    private List<GrowthMetricOverview> metricOverviews(BabyEntity baby, List<GrowthMeasurementEntity> measurements) {
        List<GrowthMetricOverview> overviews = new ArrayList<>();

        for (Metric metric : Metric.values()) {
            var latest = measurements.stream()
                    .filter(item -> valueOf(item, metric) != null)
                    .max(Comparator.comparing(GrowthMeasurementEntity::getMeasuredAt));

            if (latest.isEmpty()) {
                overviews.add(new GrowthMetricOverview(metric.key(), metricLabel(metric), "", metric.unit(), "", null));
                continue;
            }

            double value = AnalysisSupport.toDouble(valueOf(latest.get(), metric));
            int ageMonths = AnalysisSupport.ageMonthsAt(baby.getBirthday(), latest.get().getMeasuredAt());

            overviews.add(new GrowthMetricOverview(
                    metric.key(),
                    metricLabel(metric),
                    formatNumber(value),
                    metric.unit(),
                    bandLabel(value,
                            boundValue(baby, metric, ageMonths, "p3"),
                            boundValue(baby, metric, ageMonths, "p50"),
                            boundValue(baby, metric, ageMonths, "p97")),
                    null));
        }

        return overviews;
    }

    private MonthlyDiet monthlyDiet(BabyEntity baby) {
        Instant from = Instant.now().minus(java.time.Duration.ofDays(DIET_WINDOW_DAYS));
        List<FeedingEntity> feedings = feedingRepository
                .findByBabyIdAndOccurredAtBetweenOrderByOccurredAtAsc(baby.getId(), from, Instant.now());

        Map<String, Long> byCategory = feedings.stream()
                .filter(item -> FeedingEntity.KIND_SOLID.equals(item.getKind()))
                .collect(Collectors.groupingBy(
                        item -> item.getFoodCategory() == null || item.getFoodCategory().isBlank()
                                ? messages.get("ui.common.other") : item.getFoodCategory(),
                        LinkedHashMap::new,
                        Collectors.counting()));

        long milkCount = feedings.stream().filter(item -> FeedingEntity.KIND_MILK.equals(item.getKind())).count();
        long solidCount = feedings.size() - milkCount;

        List<DietLegendItem> legends = new ArrayList<>();
        if (milkCount > 0) {
            legends.add(new DietLegendItem(messages.get("ui.growth.diet.milk"), milkCount, CATEGORY_COLORS.get(0)));
        }
        int colorIndex = 1;
        for (Map.Entry<String, Long> entry : byCategory.entrySet()) {
            legends.add(new DietLegendItem(AnalysisSupport.foodCategoryLabel(messages, entry.getKey()),
                    entry.getValue(), CATEGORY_COLORS.get(colorIndex % CATEGORY_COLORS.size())));
            colorIndex++;
        }

        List<String> ingredients = feedings.stream()
                .filter(item -> FeedingEntity.KIND_SOLID.equals(item.getKind()))
                .map(FeedingEntity::getFoodName)
                .filter(name -> name != null && !name.isBlank())
                .distinct()
                .sorted()
                .toList();

        double ratio = feedings.isEmpty() ? 0d : round2((double) milkCount / feedings.size());

        return new MonthlyDiet(
                ratio,
                messages.get("ui.growth.diet.milk"),
                legends,
                ingredients,
                ingredients.size(),
                ingredients.isEmpty()
                        ? messages.get("ui.growth.diet.none")
                        : messages.get("ui.growth.diet.tried", ingredients.size()));
    }

    private List<MilestoneItem> milestones(BabyEntity baby) {
        List<ReferenceDataRepository.MilestoneCatalogEntry> catalog = referenceData.findMilestoneCatalog();
        List<BabyMilestoneEntity> unlocked = milestoneRepository.findByBabyIdOrderByUnlockedAtDesc(baby.getId());

        Set<String> unlockedKeys = unlocked.stream()
                .map(BabyMilestoneEntity::getMilestoneKey)
                .collect(Collectors.toSet());

        boolean english = messages.locale().getLanguage().equals(java.util.Locale.ENGLISH.getLanguage());

        List<MilestoneItem> items = new ArrayList<>();
        for (ReferenceDataRepository.MilestoneCatalogEntry entry : catalog) {
            String title = english && entry.titleEn() != null && !entry.titleEn().isBlank()
                    ? entry.titleEn() : entry.title();
            items.add(new MilestoneItem(title, unlockedKeys.contains(entry.key()),
                    entry.icon() == null ? "star" : entry.icon()));
        }

        // 目录之外自发记录的里程碑也要出现，否则会给人「没记录上」的错觉
        Set<String> catalogKeys = catalog.stream()
                .map(ReferenceDataRepository.MilestoneCatalogEntry::key)
                .collect(Collectors.toSet());

        unlocked.stream()
                .filter(item -> !catalogKeys.contains(item.getMilestoneKey()))
                .forEach(item -> items.add(new MilestoneItem(item.getTitle(), true,
                        item.getIcon() == null ? "star" : item.getIcon())));

        return items;
    }

    private Insight insight(List<GrowthMeasurementEntity> measurements) {
        if (measurements.isEmpty()) {
            return new Insight(messages.get("ui.growth.insight.emptyTitle"),
                    messages.get("ui.growth.insight.emptyContent"));
        }

        GrowthMeasurementEntity latest = measurements.stream()
                .max(Comparator.comparing(GrowthMeasurementEntity::getMeasuredAt))
                .orElseThrow();

        return new Insight(messages.get("ui.growth.insight.title"),
                messages.get("ui.growth.insight.content",
                        measurements.size(),
                        AnalysisSupport.localDateOf(latest.getMeasuredAt())));
    }

    private String comparisonLabel(BabyEntity baby, Metric metric) {
        if (BabyEntity.GENDER_FEMALE.equals(baby.getGender())) {
            return messages.get("ui.growth.reference.girl", metricLabel(metric));
        }
        return messages.get("ui.growth.reference.boy", metricLabel(metric));
    }

    /** 该月龄的 P50。没有备份性别或超出标准表范围时返回 0（图表不画参考线） */
    private double referenceValue(BabyEntity baby, Metric metric, int ageMonths) {
        Double p50 = boundValue(baby, metric, ageMonths, "p50");
        return p50 == null ? 0d : p50;
    }

    /** 取最接近该月龄的标准行；性别未填时不给参考值，避免套用错误性别的标准 */
    private Double boundValue(BabyEntity baby, Metric metric, int ageMonths, String bound) {
        String gender = genderKey(baby);
        if (gender == null) {
            return null;
        }

        return referenceData.findGrowthStandards(metric.key(), gender).stream()
                .min(Comparator.comparingInt(row -> Math.abs(row.ageMonth() - ageMonths)))
                .map(row -> switch (bound) {
                    case "p3" -> toDoubleOrNull(row.p3());
                    case "p97" -> toDoubleOrNull(row.p97());
                    default -> toDoubleOrNull(row.p50());
                })
                .orElse(null);
    }

    private static String genderKey(BabyEntity baby) {
        if (BabyEntity.GENDER_MALE.equals(baby.getGender())) {
            return "male";
        }
        if (BabyEntity.GENDER_FEMALE.equals(baby.getGender())) {
            return "female";
        }
        return null;
    }

    private static BigDecimal valueOf(GrowthMeasurementEntity entity, Metric metric) {
        return switch (metric) {
            case HEIGHT -> entity.getHeightCm();
            case WEIGHT -> entity.getWeightKg();
            case HEAD -> entity.getHeadCm();
        };
    }

    private static Double toDoubleOrNull(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }

    private static double round2(double value) {
        return Math.round(value * 100) / 100d;
    }

    /** 8.0 → "8"，7.95 → "7.95"，避免图表上出现一堆无意义的 ".0" */
    private static String formatNumber(double value) {
        if (value == Math.rint(value)) {
            return String.valueOf((long) value);
        }
        return String.valueOf(Math.round(value * 100) / 100d);
    }
}
