package com.babygrow.backend.analysis;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.Messages;
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

    private static final String[] DAY_KEYS = {
            "ui.diet.day.mon", "ui.diet.day.tue", "ui.diet.day.wed", "ui.diet.day.thu",
            "ui.diet.day.fri", "ui.diet.day.sat", "ui.diet.day.sun"};

    private static final List<String> SLICE_COLORS = List.of(
            "bg-[#CFD8C7]", "bg-[#E7C9B7]", "bg-[#C1CDD3]", "bg-[#D9CFE0]", "bg-[#E6DCC0]");

    private final FamilyAccessService accessService;
    private final FeedingRepository feedingRepository;
    private final ReferenceDataRepository referenceData;
    private final Messages messages;

    public DietAnalysisService(FamilyAccessService accessService,
                               FeedingRepository feedingRepository,
                               ReferenceDataRepository referenceData,
                               Messages messages) {
        this.accessService = accessService;
        this.feedingRepository = feedingRepository;
        this.referenceData = referenceData;
        this.messages = messages;
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
            bars.add(new DietBarItem(messages.get(DAY_KEYS[offset]), total, day.equals(today) ? Boolean.TRUE : null));
        }

        // 只对「有记录的天」求平均：把没记录的天当作 0 会把平均值拉得毫无意义
        List<Integer> recorded = dailyMilk.stream().filter(value -> value > 0).toList();
        int average = recorded.isEmpty() ? 0 : (int) Math.round(recorded.stream().mapToInt(Integer::intValue).average().orElse(0));

        int ageMonths = AnalysisSupport.ageMonthsAt(baby.getBirthday(), Instant.now());
        var standard = referenceData.findFeedingStandard(FeedingEntity.KIND_MILK, ageMonths).orElse(null);

        String standardLabel = standard == null
                ? ""
                : messages.get("ui.diet.standard",
                        String.valueOf(standard.recommendedMin()),
                        String.valueOf(standard.recommendedMax()), standard.unit());

        String narrativeNote = recorded.isEmpty()
                ? messages.get("ui.diet.week.note.empty")
                : messages.get("ui.diet.week.note.recorded",
                        recorded.size(), String.valueOf(average));

        Insight insight = recorded.isEmpty()
                ? new Insight(messages.get("ui.diet.week.emptyTitle"), messages.get("ui.diet.week.emptyContent"))
                : new Insight(messages.get("ui.diet.week.title"),
                        standard == null
                                ? messages.get("ui.diet.week.noStandard")
                                : messages.get("ui.diet.week.content",
                                        String.valueOf(average), standard.unit(),
                                        String.valueOf(standard.recommendedMin()),
                                        String.valueOf(standard.recommendedMax())));

        return new WeeklyDietResponse(bars, messages.get("ui.diet.averageLabel", String.valueOf(average)),
                standardLabel, narrativeNote, insight,
                standard == null ? null : new ReferenceRange(
                        standard.recommendedMin(), standard.recommendedMax(), standard.axisMax(),
                        standard.unit(), standard.source(), standard.version()),
                feedingRepository.existsByBabyId(baby.getId()));
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
                                ? messages.get("ui.common.other") : item.getFoodCategory(),
                        LinkedHashMap::new,
                        Collectors.counting()));

        List<DietRatioItem> legends = new ArrayList<>();
        int index = 0;
        for (Map.Entry<String, Long> entry : byCategory.entrySet()) {
            legends.add(new DietRatioItem(AnalysisSupport.foodCategoryLabel(messages, entry.getKey()),
                    entry.getValue(), SLICE_COLORS.get(index % SLICE_COLORS.size())));
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
                ? new Insight(messages.get("ui.diet.month.emptyTitle"), messages.get("ui.diet.month.emptyContent"))
                : new Insight(messages.get("ui.diet.month.title"),
                        messages.get("ui.diet.month.content", total, ingredients.size()));

        return new MonthlyDietResponse(
                // 年份按字符串传：MessageFormat 会把 {0} 当数字加千分位，2026 会变成 2,026
                messages.get("ui.monthYear", String.valueOf(target.getYear()), target.getMonthValue()),
                messages.get("ui.diet.month.subtitle"),
                messages.get("ui.diet.month.badge"),
                new MonthlyDietDonut(topRatio, messages.get("ui.diet.month.donutCenter"), legends),
                new MonthlyDietIngredients(messages.get("ui.diet.month.ingredientsLabel"),
                        messages.get("ui.diet.month.items", ingredients.size()), ingredients),
                insight,
                feedingRepository.existsByBabyId(baby.getId()));
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
