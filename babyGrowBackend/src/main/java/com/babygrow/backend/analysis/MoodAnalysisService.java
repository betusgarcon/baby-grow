package com.babygrow.backend.analysis;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.analysis.dto.AnalysisDtos.Insight;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MoodCalendarDay;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MoodCalendarResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MoodCheckinOption;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MoodCheckinOptionsResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MoodCheckinRequest;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MoodCheckinResponse;
import com.babygrow.backend.analysis.dto.AnalysisDtos.MoodLegendItem;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.MoodEntryEntity;
import com.babygrow.backend.repository.MoodEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** 情绪分析。 */
@Service
public class MoodAnalysisService {

    /** 连续同种情绪达到这个天数才算「一段」，用于高亮——单天波动不值得标记 */
    private static final int PATTERN_RUN_DAYS = 3;

    /** mood_entries.note 是 VARCHAR(255)，超了会在写库时才炸成 409 */
    private static final int NOTE_MAX_LENGTH = 255;

    /** 打卡允许的三档，与 ck_mood_entries_mood 约束、以及下发给前端的选项一致 */
    private static final Set<String> CHECKIN_MOODS = Set.of(
            MoodEntryEntity.MOOD_HAPPY, MoodEntryEntity.MOOD_CLINGY, MoodEntryEntity.MOOD_DISCOMFORT);

    private static final List<MoodLegendItem> LEGENDS = List.of(
            new MoodLegendItem("开心", "bg-[#CFD8C7]"),
            new MoodLegendItem("黏人烦躁", "bg-[#E7C9B7]"),
            new MoodLegendItem("身体不适", "bg-[#C1CDD3]"));

    /**
     * 打卡选项。
     *
     * <p>配色与 emoji 属于展示层，本应留在前端；这里随接口下发是为了不改动
     * 前端既有契约（{@code MoodCheckinOption} 要求这些字段）。与宝宝画像的
     * icon/circleClass 是同一处已知耦合，后续统一收拢。
     */
    private static final List<MoodCheckinOption> CHECKIN_OPTIONS = List.of(
            new MoodCheckinOption("happy", "开心能量", "☺", "happy-mood",
                    "#68825f", "#edf5e7", "#f4f2ee"),
            new MoodCheckinOption("clingy", "黏人烦躁", "☹", "unhappy-mood",
                    "#9a6947", "#f5e3d8", "#f4f2ee"),
            new MoodCheckinOption("discomfort", "身体不适", "☹", "uncomfortable-mood",
                    "#68828d", "#e8eff2", "#f4f2ee"));

    private final FamilyAccessService accessService;
    private final MoodEntryRepository moodRepository;

    public MoodAnalysisService(FamilyAccessService accessService, MoodEntryRepository moodRepository) {
        this.accessService = accessService;
        this.moodRepository = moodRepository;
    }

    @Transactional(readOnly = true)
    public MoodCalendarResponse calendar(Long userId, Integer year, Integer month) {
        BabyEntity baby = accessService.requireBaby(userId);
        YearMonth target = resolveMonth(year, month);

        List<MoodEntryEntity> entries = moodRepository.findByBabyIdAndOccurredAtBetweenOrderByOccurredAtAsc(
                baby.getId(),
                AnalysisSupport.startOfDay(target.atDay(1)),
                AnalysisSupport.endOfDay(target.atEndOfMonth()));

        Map<Integer, String> moodByDay = new HashMap<>();
        for (MoodEntryEntity entry : entries) {
            int day = AnalysisSupport.localDateOf(entry.getOccurredAt()).getDayOfMonth();
            // 一天多条时以最后一条为准：情绪是随时间变化的，取最新更贴近当下的状态
            moodByDay.put(day, entry.getMood());
        }

        List<MoodCalendarDay> days = buildGrid(target, moodByDay);

        return new MoodCalendarResponse(days, LEGENDS, insight(target, moodByDay),
                moodRepository.existsByBabyId(baby.getId()));
    }

    @Transactional(readOnly = true)
    public MoodCheckinOptionsResponse checkinOptions() {
        return new MoodCheckinOptionsResponse(CHECKIN_OPTIONS);
    }

    /**
     * 情绪打卡：直接写一条情绪记录。
     *
     * <p>与「AI 从记录里抽出的情绪」共用同一张 {@code mood_entries}，区别只在
     * {@code record_id}——打卡没有来源记录，所以留空。日历是按 {@code occurred_at}
     * 落在哪一天聚合的，因此打卡默认写「此刻」，也允许指定日期补记。
     */
    @Transactional
    public MoodCheckinResponse checkin(Long userId, MoodCheckinRequest request) {
        // 用 requireWritableBaby 而不是 requireBaby：viewer 是只读角色，不该能写。
        // 宝宝也从登录态解析——请求体里刻意没有 babyId（见 MoodCheckinRequest 的说明）。
        BabyEntity baby = accessService.requireWritableBaby(userId);

        String mood = request.mood() == null ? "" : request.mood().trim();
        if (!CHECKIN_MOODS.contains(mood)) {
            throw BizException.badRequest("请选择一种情绪：开心 / 黏人烦躁 / 身体不适");
        }

        LocalDate day = parseDay(request.date());

        String note = request.note() == null ? null : request.note().trim();
        if (note != null && note.isEmpty()) {
            note = null;
        }
        if (note != null && note.length() > NOTE_MAX_LENGTH) {
            throw BizException.badRequest("备注最多 " + NOTE_MAX_LENGTH + " 个字");
        }

        // 今天用「此刻」而不是当天 0 点：日历只按天聚合，两者落在同一格，
        // 但记下真实时刻更贴近「刚打卡」这件事。补记过去则取那一天的开始。
        Instant occurredAt = day.equals(LocalDate.now())
                ? Instant.now()
                : AnalysisSupport.startOfDay(day);

        moodRepository.save(MoodEntryEntity.of(baby.getId(), null, occurredAt, mood, null, null, note));

        return new MoodCheckinResponse(day.toString(), mood);
    }

    private static LocalDate parseDay(String value) {
        if (value == null || value.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw BizException.badRequest("日期格式应为 YYYY-MM-DD");
        }
    }

    /**
     * 组装日历网格。
     *
     * <p><b>必须补前导空位</b>：前端是 {@code grid-cols-7} 平铺渲染，且表头以周一开头。
     * 少了补位，整个月的日期都会错位一格起。补位格用上月的末尾日期，与设计稿一致。
     */
    private List<MoodCalendarDay> buildGrid(YearMonth target, Map<Integer, String> moodByDay) {
        List<MoodCalendarDay> cells = new ArrayList<>();

        LocalDate first = target.atDay(1);
        int leading = first.getDayOfWeek().getValue() - 1; // 周一=1 → 补 0 格
        if (leading > 0) {
            YearMonth previous = target.minusMonths(1);
            int previousLength = previous.lengthOfMonth();
            for (int i = leading; i > 0; i--) {
                cells.add(new MoodCalendarDay(previousLength - i + 1, "empty", null));
            }
        }

        for (int day = 1; day <= target.lengthOfMonth(); day++) {
            String mood = moodByDay.get(day);
            cells.add(new MoodCalendarDay(day, mood == null ? "empty" : mood, null));
        }

        markPatterns(cells);
        return cells;
    }

    /** 把连续 ≥3 天同一种（非开心的）情绪标为高亮，便于一眼看出那段时期 */
    private void markPatterns(List<MoodCalendarDay> cells) {
        int runStart = -1;
        String runType = null;

        for (int index = 0; index <= cells.size(); index++) {
            String type = index < cells.size() ? cells.get(index).type() : null;
            boolean continues = type != null && !"empty".equals(type) && !"happy".equals(type)
                    && type.equals(runType);

            if (!continues) {
                if (runStart >= 0 && index - runStart >= PATTERN_RUN_DAYS) {
                    for (int mark = runStart; mark < index; mark++) {
                        MoodCalendarDay cell = cells.get(mark);
                        cells.set(mark, new MoodCalendarDay(cell.day(), cell.type(), Boolean.TRUE));
                    }
                }
                runStart = type != null && !"empty".equals(type) && !"happy".equals(type) ? index : -1;
                runType = runStart >= 0 ? type : null;
            }
        }
    }

    private Insight insight(YearMonth target, Map<Integer, String> moodByDay) {
        if (moodByDay.isEmpty()) {
            return new Insight("这个月还没有情绪记录",
                    "打卡或记录宝宝当天的状态后，这里会显示一整个月的情绪分布。");
        }

        long discomfort = moodByDay.values().stream().filter(MoodEntryEntity.MOOD_DISCOMFORT::equals).count();
        long clingy = moodByDay.values().stream().filter(MoodEntryEntity.MOOD_CLINGY::equals).count();

        return new Insight("Mood",
                target.getMonthValue() + " 月共记录 " + moodByDay.size() + " 天，其中身体不适 "
                        + discomfort + " 天、黏人烦躁 " + clingy + " 天。这里只做分布统计，不做任何判断。");
    }

    private static YearMonth resolveMonth(Integer year, Integer month) {
        if (year == null || month == null || month < 1 || month > 12) {
            return YearMonth.now();
        }
        return YearMonth.of(year, month);
    }
}
