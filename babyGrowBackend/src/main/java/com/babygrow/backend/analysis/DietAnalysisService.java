package com.babygrow.backend.analysis;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.analysis.dto.AnalysisDtos.DietBarItem;
import com.babygrow.backend.analysis.dto.AnalysisDtos.DietRatioItem;
import com.babygrow.backend.analysis.dto.AnalysisDtos.Insight;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MonthlyDietDonut;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MonthlyDietIngredients;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MonthlyDietResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.ReferenceRange;
import com.babygrow.backend.analysis.dto.AnalysisDtos.WeeklyDietResponse;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.FeedingEntity;
import com.babygrow.backend.repository.FeedingRepository;
import com.babygrow.backend.repository.ReferenceDataRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** 饮食分析。 */
@Service
public class DietAnalysisService {

    private static final String[] DAY_LABELS = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};

    private static final List<String> SLICE_COLORS = List.of(
            "bg-[#CFD8C7]", "bg-[#E7C9B7]", "bg-[#C1CDD3]", "bg-[#D9CFE0]", "bg-[#E6DCC0]");

    private final FamilyAccessService accessService;
    private final FeedingRepository feedingRepository;
    private final ReferenceDataRepository referenceData;

    public DietAnalysisService(FamilyAccessService accessService,
                               FeedingRepository feedingRepository,
                               ReferenceDataRepository referenceData) {
        this.accessService = accessService;
        this.feedingRepository = feedingRepository;
        this.referenceData = referenceData;
    }

    @Transactional(readOnly = true)
    public WeeklyDietResponse weekly(Long userId, String weekStart) {
        BabyEntity baby = accessService.requireBaby(userId);
        LocalDate start = parseWeekStart(weekStart);
        LocalDate today = LocalDate.now();

        List<FeedingEntity> feedings = feedingRepository.findByBabyIdAndOccurredAtBetweenOrderByOccurredAtAsc(
                baby.getId(),
                AnalysisSupport.startOfDay(start),
                AnalysisSupport.endOfDay(start.plusDays(6)));

        List<DietBarItem> bars = new ArrayList<>();
        List<Integer> dailyMilk = new ArrayList<>();

        for (int offset = 0; offset < 7; offset++) {
            LocalDate day = start.plusDays(offset);
            int total = feedings.stream()
                    .filter(item -> FeedingEntity.KIND_MILK.equals(item.getKind()))
                    .filter(item -> AnalysisSupport.localDateOf(item.getOccurredAt()).equals(day))
                    .mapToInt(item -> item.getAmountMl() == null ? 0 : item.getAmountMl())
                    .sum();

            dailyMilk.add(total);
            bars.add(new DietBarItem(DAY_LABELS[offset], total, day.equals(today) ? Boolean.TRUE : null));
        }

        // 只对「有记录的天」求平均：把没记录的天当作 0 会把平均值拉得毫无意义
        List<Integer> recorded = dailyMilk.stream().filter(value -> value > 0).toList();
        int average = recorded.isEmpty() ? 0 : (int) Math.round(recorded.stream().mapToInt(Integer::intValue).average().orElse(0));

        int ageMonths = AnalysisSupport.ageMonthsAt(baby.getBirthday(), Instant.now());
        var standard = referenceData.findFeedingStandard(FeedingEntity.KIND_MILK, ageMonths).orElse(null);

        String standardLabel = standard == null
                ? ""
                : "Recommended " + standard.recommendedMin() + "-" + standard.recommendedMax() + " " + standard.unit();

        String narrativeNote = recorded.isEmpty()
                ? "这一周还没有奶量记录。"
                : "已记录 " + recorded.size() + " 天，平均 " + average + " ml。";

        Insight insight = recorded.isEmpty()
                ? new Insight("还没有奶量记录", "记录每天的奶量后，这里会按天显示并与建议区间对照。")
                : new Insight("Feeding",
                        standard == null
                                ? "参考区间缺失，图表仅显示实际摄入。"
                                : "本周平均 " + average + standard.unit() + "，建议区间为 "
                                        + standard.recommendedMin() + "-" + standard.recommendedMax() + standard.unit() + "。");

        return new WeeklyDietResponse(bars, "Average " + average + " ml", standardLabel, narrativeNote, insight,
                standard == null ? null : new ReferenceRange(
                        standard.recommendedMin(), standard.recommendedMax(), standard.axisMax(),
                        standard.unit(), standard.source(), standard.version()));
    }

    @Transactional(readOnly = true)
    public MonthlyDietResponse monthly(Long userId, String month) {
        BabyEntity baby = accessService.requireBaby(userId);
        YearMonth target = parseMonth(month);

        List<FeedingEntity> feedings = feedingRepository.findByBabyIdAndOccurredAtBetweenOrderByOccurredAtAsc(
                baby.getId(),
                AnalysisSupport.startOfDay(target.atDay(1)),
                AnalysisSupport.endOfDay(target.atEndOfMonth()));

        List<FeedingEntity> solids = feedings.stream()
                .filter(item -> FeedingEntity.KIND_SOLID.equals(item.getKind()))
                .toList();

        Map<String, Long> byCategory = solids.stream()
                .collect(Collectors.groupingBy(
                        item -> item.getFoodCategory() == null || item.getFoodCategory().isBlank()
                                ? "其他" : item.getFoodCategory(),
                        LinkedHashMap::new,
                        Collectors.counting()));

        List<DietRatioItem> legends = new ArrayList<>();
        int index = 0;
        for (Map.Entry<String, Long> entry : byCategory.entrySet()) {
            legends.add(new DietRatioItem(entry.getKey(), entry.getValue(),
                    SLICE_COLORS.get(index % SLICE_COLORS.size())));
            index++;
        }

        List<String> ingredients = solids.stream()
                .map(FeedingEntity::getFoodName)
                .filter(name -> name != null && !name.isBlank())
                .distinct()
                .sorted()
                .toList();

        // donut 中心值取占比最大的类别，而不是奶——月度页展示的是辅食构成
        long total = solids.size();
        double topRatio = 0d;
        if (total > 0 && !byCategory.isEmpty()) {
            long top = byCategory.values().stream().mapToLong(Long::longValue).max().orElse(0);
            topRatio = Math.round(top * 100.0 / total) / 100d;
        }

        Insight insight = solids.isEmpty()
                ? new Insight("这个月还没有辅食记录", "记录宝宝吃了什么，这里会按类别显示构成与已尝试的食材。")
                : new Insight("Diet",
                        "本月记录了 " + total + " 次辅食，涉及 " + ingredients.size() + " 种食材。");

        return new MonthlyDietResponse(
                target.getYear() + "年" + target.getMonthValue() + "月",
                "Monthly dietary ratio summary",
                "Solids Exploring",
                new MonthlyDietDonut(topRatio, "Solids", legends),
                new MonthlyDietIngredients("Ingredients", ingredients.size() + " items", ingredients),
                insight);
    }

    /** 缺省取本周一 */
    private static LocalDate parseWeekStart(String raw) {
        if (raw != null && !raw.isBlank()) {
            try {
                return LocalDate.parse(raw);
            } catch (Exception ignored) {
                // 落到默认值
            }
        }
        return LocalDate.now().with(DayOfWeek.MONDAY);
    }

    private static YearMonth parseMonth(String raw) {
        if (raw != null && !raw.isBlank()) {
            try {
                return YearMonth.parse(raw);
            } catch (Exception ignored) {
                // 落到默认值
            }
        }
        return YearMonth.now();
    }
}
