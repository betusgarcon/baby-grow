package com.babygrow.backend.analysis;

import com.babygrow.backend.access.FamilyAccessService;
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

    private final FamilyAccessService accessService;
    private final GrowthMeasurementRepository growthRepository;
    private final FeedingRepository feedingRepository;
    private final BabyMilestoneRepository milestoneRepository;
    private final ReferenceDataRepository referenceData;

    public GrowthAnalysisService(FamilyAccessService accessService,
                                 GrowthMeasurementRepository growthRepository,
                                 FeedingRepository feedingRepository,
                                 BabyMilestoneRepository milestoneRepository,
                                 ReferenceDataRepository referenceData) {
        this.accessService = accessService;
        this.growthRepository = growthRepository;
        this.feedingRepository = feedingRepository;
        this.milestoneRepository = milestoneRepository;
        this.referenceData = referenceData;
    }

    @Transactional(readOnly = true)
    public GrowthPageResponse page(Long userId) {
        BabyEntity baby = accessService.requireBaby(userId);
        List<GrowthMeasurementEntity> measurements = growthRepository.findByBabyIdOrderByMeasuredAtAsc(baby.getId());

        Map<String, Map<String, GrowthTrendSnapshot>> trends = new LinkedHashMap<>();
        Instant now = Instant.now();
        for (TimeRange range : TIME_RANGES) {
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
                TIME_RANGES,
                trends,
                monthlyDiet(baby),
                milestones(baby));
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
            return new GrowthTrendSnapshot(List.of(), metric.chartLabel(),
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
                metric.chartLabel(),
                comparisonLabel(baby, metric),
                new TrendFooter(
                        latestAge + " mo",
                        formatNumber(latestValue) + " " + metric.unit(),
                        AnalysisSupport.percentileBand(latestValue,
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
                overviews.add(new GrowthMetricOverview(metric.key(), metric.label(), "", metric.unit(), "", null));
                continue;
            }

            double value = AnalysisSupport.toDouble(valueOf(latest.get(), metric));
            int ageMonths = AnalysisSupport.ageMonthsAt(baby.getBirthday(), latest.get().getMeasuredAt());

            overviews.add(new GrowthMetricOverview(
                    metric.key(),
                    metric.label(),
                    formatNumber(value),
                    metric.unit(),
                    AnalysisSupport.percentileBand(value,
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
                                ? "其他" : item.getFoodCategory(),
                        LinkedHashMap::new,
                        Collectors.counting()));

        long milkCount = feedings.stream().filter(item -> FeedingEntity.KIND_MILK.equals(item.getKind())).count();
        long solidCount = feedings.size() - milkCount;

        List<DietLegendItem> legends = new ArrayList<>();
        if (milkCount > 0) {
            legends.add(new DietLegendItem("奶", milkCount, CATEGORY_COLORS.get(0)));
        }
        int colorIndex = 1;
        for (Map.Entry<String, Long> entry : byCategory.entrySet()) {
            legends.add(new DietLegendItem(entry.getKey(), entry.getValue(),
                    CATEGORY_COLORS.get(colorIndex % CATEGORY_COLORS.size())));
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
                "Milk",
                legends,
                ingredients,
                ingredients.size(),
                ingredients.isEmpty() ? "还没有食材记录" : "已尝试 " + ingredients.size() + " 种食材");
    }

    private List<MilestoneItem> milestones(BabyEntity baby) {
        List<ReferenceDataRepository.MilestoneCatalogEntry> catalog = referenceData.findMilestoneCatalog();
        List<BabyMilestoneEntity> unlocked = milestoneRepository.findByBabyIdOrderByUnlockedAtDesc(baby.getId());

        Set<String> unlockedKeys = unlocked.stream()
                .map(BabyMilestoneEntity::getMilestoneKey)
                .collect(Collectors.toSet());

        List<MilestoneItem> items = new ArrayList<>();
        for (ReferenceDataRepository.MilestoneCatalogEntry entry : catalog) {
            items.add(new MilestoneItem(entry.title(), unlockedKeys.contains(entry.key()),
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
            return new Insight("还没有生长记录",
                    "在「记录」里写下身高体重，例如「今天量了体重 8 公斤、身高 68 厘米」，这里就会出现生长曲线。");
        }

        GrowthMeasurementEntity latest = measurements.stream()
                .max(Comparator.comparing(GrowthMeasurementEntity::getMeasuredAt))
                .orElseThrow();

        return new Insight("Growth",
                "已记录 " + measurements.size() + " 次测量，最近一次在 "
                        + AnalysisSupport.localDateOf(latest.getMeasuredAt())
                        + "。曲线上的参考值来自标准表，仅供对照，不构成医学判断。");
    }

    private String comparisonLabel(BabyEntity baby, Metric metric) {
        if (BabyEntity.GENDER_FEMALE.equals(baby.getGender())) {
            return "WHO Girl " + metric.label();
        }
        return "WHO Boy " + metric.label();
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
