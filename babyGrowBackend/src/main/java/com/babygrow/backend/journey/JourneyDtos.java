package com.babygrow.backend.journey;

import java.util.List;

/**
 * Journey 模块三个接口的响应体，与前端
 * {@code journey/milestones/milestoneData.ts}、{@code journey/calendar/calendarData.ts}、
 * {@code journey/weekly-insight/weeklyInsightData.ts} 的类型对齐。
 */
public final class JourneyDtos {

    private JourneyDtos() {
    }

    // ── 里程碑列表 ──────────────────────────────────────────

    public record MilestoneTagView(String label, String tone) {
    }

    public record MilestoneView(String id,
                                String title,
                                String description,
                                String date,
                                String icon,
                                String tier,
                                List<MilestoneTagView> tags) {
    }

    // ── 日历事件 ────────────────────────────────────────────

    /**
     * @param tone  vaccine | milestone，决定日历点的颜色
     * @param route 前端路由 id。这是展示层的东西，但契约要求随数据下发——日期跳到哪里
     *              是数据的一部分，不该写死在页面里
     */
    public record CalendarEventView(String id,
                                    String date,
                                    String title,
                                    String subtitle,
                                    String tone,
                                    String route) {
    }

    // ── 每周小记 ────────────────────────────────────────────

    public record MetricSummaryView(String key,
                                    String icon,
                                    String label,
                                    String value,
                                    String unit,
                                    String delta,
                                    String tone) {
    }

    public record SleepConsistencyView(String title,
                                       String subtitle,
                                       String status,
                                       List<Double> dailyHours) {
    }

    public record DevelopmentHighlightView(String id,
                                           String title,
                                           String date,
                                           String description,
                                           String icon,
                                           String tone) {
    }

    public record AdviceView(String title, String content) {
    }

    public record WeeklyInsightView(String rangeLabel,
                                    List<MetricSummaryView> metrics,
                                    SleepConsistencyView sleep,
                                    List<DevelopmentHighlightView> highlights,
                                    AdviceView advice) {
    }
}
