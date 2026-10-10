package com.babygrow.backend.analysis;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.analysis.dto.AnalysisDtos.DailySleepLogsResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.GrowthPageResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.GrowthTrendResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MonthlyDietResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MoodCalendarResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MoodCheckinOptionsResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.SleepCircadianResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.SleepEvolutionResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.WeeklyDietResponse;
import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.repository.RecordRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 分析模块。
 *
 * <p>全部由服务端从投影表聚合，返回**图表就绪**的结构——前端 {@code analysisChartOptions.ts}
 * 拿到就能画，不需要在客户端再做一遍聚合。
 *
 * <p>这些接口无条件返回完整结构（空数据时给空数组），因为分析页会直接解引用嵌套字段，
 * 返回 null 会让页面崩掉而不是显示空态。
 */
@RestController
@RequestMapping("/api/baby")
public class AnalysisController {

    private final GrowthAnalysisService growthService;
    private final SleepAnalysisService sleepService;
    private final DietAnalysisService dietService;
    private final MoodAnalysisService moodService;
    private final RecordProjectionService projectionService;
    private final FamilyAccessService accessService;
    private final RecordRepository recordRepository;

    public AnalysisController(GrowthAnalysisService growthService,
                              SleepAnalysisService sleepService,
                              DietAnalysisService dietService,
                              MoodAnalysisService moodService,
                              RecordProjectionService projectionService,
                              FamilyAccessService accessService,
                              RecordRepository recordRepository) {
        this.growthService = growthService;
        this.sleepService = sleepService;
        this.dietService = dietService;
        this.moodService = moodService;
        this.projectionService = projectionService;
        this.accessService = accessService;
        this.recordRepository = recordRepository;
    }

    // ── 生长 ──────────────────────────────────────────────

    @GetMapping("/growth")
    public ApiResponse<GrowthPageResponse> growth(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(growthService.page(userId));
    }

    @GetMapping("/growth/trend")
    public ApiResponse<GrowthTrendResponse> growthTrend(@AuthenticationPrincipal Long userId,
                                                        @RequestParam(defaultValue = "weight") String metric,
                                                        @RequestParam(defaultValue = "last3m") String range) {
        return ApiResponse.ok(growthService.trend(userId, metric, range));
    }

    // ── 睡眠 ──────────────────────────────────────────────

    @GetMapping("/sleep/circadian")
    public ApiResponse<SleepCircadianResponse> sleepCircadian(@AuthenticationPrincipal Long userId,
                                                              @RequestParam(required = false) String date) {
        return ApiResponse.ok(sleepService.circadian(userId, date));
    }

    @GetMapping("/sleep/logs")
    public ApiResponse<DailySleepLogsResponse> sleepLogs(@AuthenticationPrincipal Long userId,
                                                         @RequestParam(required = false) String date) {
        return ApiResponse.ok(sleepService.dailyLogs(userId, date));
    }

    @GetMapping("/sleep/evolution")
    public ApiResponse<SleepEvolutionResponse> sleepEvolution(@AuthenticationPrincipal Long userId,
                                                              @RequestParam(required = false) List<Integer> months) {
        return ApiResponse.ok(sleepService.evolution(userId, months));
    }

    // ── 饮食 ──────────────────────────────────────────────

    @GetMapping("/diet/weekly")
    public ApiResponse<WeeklyDietResponse> weeklyDiet(@AuthenticationPrincipal Long userId,
                                                      @RequestParam(required = false) String weekStart) {
        return ApiResponse.ok(dietService.weekly(userId, weekStart));
    }

    @GetMapping("/diet/monthly")
    public ApiResponse<MonthlyDietResponse> monthlyDiet(@AuthenticationPrincipal Long userId,
                                                        @RequestParam(required = false) String month) {
        return ApiResponse.ok(dietService.monthly(userId, month));
    }

    // ── 情绪 ──────────────────────────────────────────────

    @GetMapping("/mood/calendar")
    public ApiResponse<MoodCalendarResponse> moodCalendar(@AuthenticationPrincipal Long userId,
                                                          @RequestParam(required = false) Integer year,
                                                          @RequestParam(required = false) Integer month) {
        return ApiResponse.ok(moodService.calendar(userId, year, month));
    }

    @GetMapping("/mood/checkin-options")
    public ApiResponse<MoodCheckinOptionsResponse> moodCheckinOptions() {
        return ApiResponse.ok(moodService.checkinOptions());
    }

    // ── 维护 ──────────────────────────────────────────────

    /**
     * 重建当前用户宝宝的分析投影。
     *
     * <p>正常不需要手工触发（每次写入都会重算）。这个入口用于：改了投影规则后回灌历史，
     * 或排查「时间线有、图表没有」时把两侧对齐。
     */
    @PostMapping("/projections/rebuild")
    public ApiResponse<Map<String, Object>> rebuildProjections(@AuthenticationPrincipal Long userId) {
        BabyEntity baby = accessService.requireWritableBaby(userId);
        projectionService.rebuild(baby.getId());

        return ApiResponse.ok(Map.of(
                "babyId", baby.getId(),
                "records", recordRepository.findByBabyIdOrderByOccurredAtDesc(baby.getId()).size()));
    }
}
