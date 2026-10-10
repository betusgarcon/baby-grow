package com.babygrow.backend.analysis;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.analysis.dto.AnalysisDtos.CircadianSummary;
import com.babygrow.backend.analysis.dto.AnalysisDtos.DailySleepLog;
import com.babygrow.backend.analysis.dto.AnalysisDtos.DailySleepLogsResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.Insight;
import com.babygrow.backend.analysis.dto.AnalysisDtos.SleepCircadianResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.SleepEvolutionResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.SleepEvolutionRow;
import com.babygrow.backend.analysis.dto.AnalysisDtos.SleepEvolutionSegment;
import com.babygrow.backend.analysis.dto.AnalysisDtos.SleepSegment;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.SleepSessionEntity;
import com.babygrow.backend.repository.SleepSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/** 睡眠分析。 */
@Service
public class SleepAnalysisService {

    private static final String COLOR_NIGHT = "#C1CDD3";
    private static final String COLOR_NAP = "#CFD8C7";
    private static final String COLOR_AWAKE = "#EDE8E0";

    /** 一天 24 小时，昼夜节律的环形图以此为总量 */
    private static final int MINUTES_PER_DAY = 24 * 60;

    /** 「典型一天」按小时分桶；覆盖率过半即视为该时段在睡 */
    private static final int HOURS = 24;
    private static final double COVERAGE_THRESHOLD = 0.5;

    private static final List<Integer> DEFAULT_EVOLUTION_MONTHS = List.of(1, 6, 12);

    /**
     * 各月龄的睡眠时长参考（24 小时内）。
     *
     * <p>取自常见育儿建议的量级，属于量级参考而非诊断标准。若要严格可追溯，
     * 应当像 feeding_standards 一样落成表并把 source/version 一并下发。
     */
    private static final int[][] SLEEP_GOAL_HOURS = {
            {0, 3, 15},
            {4, 11, 13},
            {12, 24, 12},
            {25, 60, 11},
    };

    private final FamilyAccessService accessService;
    private final SleepSessionRepository sleepRepository;

    public SleepAnalysisService(FamilyAccessService accessService, SleepSessionRepository sleepRepository) {
        this.accessService = accessService;
        this.sleepRepository = sleepRepository;
    }

    @Transactional(readOnly = true)
    public SleepCircadianResponse circadian(Long userId, String date) {
        BabyEntity baby = accessService.requireBaby(userId);
        LocalDate day = parseDate(date);
        List<SleepSessionEntity> sessions = sessionsOn(baby.getId(), day);

        int nightMinutes = sumMinutes(sessions, SleepSessionEntity.TYPE_NIGHT);
        int napMinutes = sumMinutes(sessions, SleepSessionEntity.TYPE_NAP);
        int totalMinutes = nightMinutes + napMinutes;
        int awakeMinutes = Math.max(MINUTES_PER_DAY - totalMinutes, 0);

        int ageMonths = AnalysisSupport.ageMonthsAt(baby.getBirthday(), Instant.now());

        CircadianSummary summary = new CircadianSummary(
                AnalysisSupport.formatDuration(totalMinutes),
                "Goal " + goalHours(ageMonths) + "h",
                AnalysisSupport.formatDuration(nightMinutes),
                AnalysisSupport.formatDuration(napMinutes),
                List.of(
                        new SleepSegment("Night", minutesToHours(nightMinutes), COLOR_NIGHT),
                        new SleepSegment("Nap", minutesToHours(napMinutes), COLOR_NAP),
                        new SleepSegment("Awake", minutesToHours(awakeMinutes), COLOR_AWAKE)));

        return new SleepCircadianResponse(summary);
    }

    @Transactional(readOnly = true)
    public DailySleepLogsResponse dailyLogs(Long userId, String date) {
        BabyEntity baby = accessService.requireBaby(userId);
        LocalDate day = parseDate(date);
        List<SleepSessionEntity> sessions = sessionsOn(baby.getId(), day);

        List<DailySleepLog> logs = sessions.stream()
                .map(session -> new DailySleepLog(
                        String.valueOf(session.getId()),
                        SleepSessionEntity.TYPE_NIGHT.equals(session.getSessionType()) ? "Night Sleep" : "Nap",
                        rangeLabel(session),
                        AnalysisSupport.formatDuration(session.getDurationMin()),
                        session.getSessionType(),
                        "moon"))
                .toList();

        Insight insight = logs.isEmpty()
                ? new Insight("这天还没有睡眠记录", "记录宝宝几点睡着、几点醒来，这里会按夜觉和小睡分开统计。")
                : new Insight("Sleep",
                        "这一天共记录了 " + logs.size() + " 段睡眠，合计 "
                                + AnalysisSupport.formatDuration(sumMinutes(sessions, null)) + "。");

        return new DailySleepLogsResponse(logs, insight);
    }

    /**
     * 睡眠演变：每个目标月龄画一行「典型一天」。
     *
     * <p>不是取某一天，而是把该月龄窗口内所有记录按小时分桶、取覆盖率过半的时段——
     * 否则单看某一天很容易被一次异常夜醒带偏。
     */
    @Transactional(readOnly = true)
    public SleepEvolutionResponse evolution(Long userId, List<Integer> months) {
        BabyEntity baby = accessService.requireBaby(userId);
        List<Integer> targets = months == null || months.isEmpty() ? DEFAULT_EVOLUTION_MONTHS : months;

        List<SleepEvolutionRow> rows = new ArrayList<>();
        for (Integer target : targets) {
            rows.add(evolutionRow(baby, target));
        }

        boolean empty = rows.stream().allMatch(row -> row.segments().isEmpty());
        Insight insight = empty
                ? new Insight("还没有睡眠记录", "记录几天的入睡与醒来时间后，这里会按月龄对比睡眠节律的变化。")
                : new Insight("Sleep Rhythm", "每一行是该月龄段内所有记录的典型一天，按小时覆盖统计得出。");

        return new SleepEvolutionResponse(rows, insight);
    }

    private SleepEvolutionRow evolutionRow(BabyEntity baby, int ageMonths) {
        LocalDate start = baby.getBirthday() == null
                ? LocalDate.now().minusMonths(ageMonths)
                : baby.getBirthday().plusMonths(ageMonths);
        LocalDate end = start.plusMonths(1);

        List<SleepSessionEntity> sessions = sleepRepository
                .findByBabyIdAndStartAtBetweenOrderByStartAtAsc(
                        baby.getId(), AnalysisSupport.startOfDay(start), AnalysisSupport.endOfDay(end.minusDays(1)));

        int[] coverage = new int[HOURS];
        String[] dominant = new String[HOURS];

        for (SleepSessionEntity session : sessions) {
            int startHour = session.getStartAt().atZone(ZoneId.systemDefault()).getHour();
            int durationMinutes = session.getDurationMin() == null ? 1 : Math.max(session.getDurationMin(), 1);
            int coveredHours = Math.max(1, (int) Math.ceil(durationMinutes / 60.0));

            for (int offset = 0; offset < coveredHours; offset++) {
                int hour = (startHour + offset) % HOURS;
                coverage[hour]++;
                if (dominant[hour] == null) {
                    dominant[hour] = session.getSessionType();
                }
            }
        }

        int recordedDays = (int) sessions.stream()
                .map(item -> AnalysisSupport.localDateOf(item.getStartAt()))
                .distinct()
                .count();

        /*
         * 覆盖率的基准是「有记录的天」而不是窗口里的日历天。
         * 否则刚用几天时，一周内只记了两天，任何时段都到不了 50%，图表会一直是空的——
         * 那会让人以为功能坏了，而不是数据还少。
         */
        double threshold = Math.max(1, recordedDays * COVERAGE_THRESHOLD);
        int totalMinutes = sessions.stream()
                .mapToInt(item -> item.getDurationMin() == null ? 0 : item.getDurationMin())
                .sum();

        List<SleepEvolutionSegment> segments = new ArrayList<>();
        int hour = 0;
        while (hour < HOURS) {
            if (coverage[hour] < threshold) {
                hour++;
                continue;
            }
            int runStart = hour;
            String type = dominant[hour] == null ? SleepSessionEntity.TYPE_NIGHT : dominant[hour];
            while (hour < HOURS && coverage[hour] >= threshold) {
                hour++;
            }
            segments.add(new SleepEvolutionSegment(runStart, hour - runStart, type));
        }

        // 平均同样只除以「有记录的天」，不然稀疏数据会被日历天稀释成毫无意义的极小值
        String summary = recordedDays == 0
                ? "暂无记录"
                : "平均 " + Math.round(totalMinutes / (double) recordedDays / 60.0 * 10) / 10.0 + " h/天";

        return new SleepEvolutionRow(ageMonths + "M", summary, segments);
    }

    private List<SleepSessionEntity> sessionsOn(Long babyId, LocalDate day) {
        return sleepRepository.findByBabyIdAndStartAtBetweenOrderByStartAtAsc(
                babyId, AnalysisSupport.startOfDay(day), AnalysisSupport.endOfDay(day));
    }

    private static int sumMinutes(List<SleepSessionEntity> sessions, String type) {
        return sessions.stream()
                .filter(item -> type == null || type.equals(item.getSessionType()))
                .mapToInt(item -> item.getDurationMin() == null ? 0 : item.getDurationMin())
                .sum();
    }

    private static double minutesToHours(int minutes) {
        return Math.round(minutes / 6.0) / 10.0;
    }

    /** "8:00 PM - 6:30 AM"；没有时长的退化为单个起点 */
    private static String rangeLabel(SleepSessionEntity session) {
        if (session.getDurationMin() == null) {
            return AnalysisSupport.formatClock(session.getStartAt());
        }
        Instant end = session.getStartAt().plusSeconds(session.getDurationMin() * 60L);
        return AnalysisSupport.formatClock(session.getStartAt()) + " - " + AnalysisSupport.formatClock(end);
    }

    private static int goalHours(int ageMonths) {
        for (int[] band : SLEEP_GOAL_HOURS) {
            if (ageMonths >= band[0] && ageMonths <= band[1]) {
                return band[2];
            }
        }
        return 12;
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(raw);
        } catch (Exception ex) {
            return LocalDate.now();
        }
    }
}
