package com.babygrow.backend.analysis.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 分析接口的响应体。
 *
 * <p>字段与前端 {@code src/types/{growth,sleep,diet,mood}.ts} 逐一对齐——那批类型是既有契约，
 * 后端按它实现。
 *
 * <p><b>所有嵌套对象都必须返回完整结构，即便没有数据也要给空数组。</b>
 * 分析页会直接解引用（例如 {@code pageData.trends[range][metric].points}），返回 null 会让
 * 页面崩掉而不是显示空态。这是本组接口最重要的约束。
 */
public final class AnalysisDtos {

    private AnalysisDtos() {
    }

    // ── 通用 ──────────────────────────────────────────────

    /** 页面上的洞察卡：一句话标题 + 一段说明 */
    public record Insight(String title, String content) {
    }

    /**
     * 参考基准。前端据此画参考线与 Y 轴上限；缺省时回退到原本写死的常量。
     *
     * @param source 出处，例如「婴幼儿辅食添加营养指南」；占位数据会明确标出
     */
    public record ReferenceRange(Integer min, Integer max, Integer axisMax,
                                 String unit, String source, String version) {
    }

    // ── 生长 ──────────────────────────────────────────────

    public record GrowthDataPoint(String label, double value) {
    }

    /** 含同月龄参考值（取自 growth_standards 的 P50） */
    public record GrowthComparisonPoint(String label, double value, double referenceValue) {
    }

    public record TrendFooter(String age, String value, String badge) {
    }

    public record GrowthTrendSnapshot(List<GrowthComparisonPoint> points,
                                      String chartLabel,
                                      String comparisonLabel,
                                      TrendFooter footer) {
    }

    public record GrowthMetricOverview(String key, String label, String value, String unit,
                                       String percentile, Boolean active) {
    }

    public record TimeRange(String key, String label) {
    }

    public record MilestoneItem(String label, boolean unlocked, String icon) {
    }

    public record DietLegendItem(String label, double value, String colorClass) {
    }

    public record MonthlyDiet(double ratio, String title, List<DietLegendItem> legends,
                              List<String> ingredients, int ingredientCount, String badge) {
    }

    /**
     * {@code trends} 是 3 个区间 × 3 个指标的完整矩阵，缺一个前端就会解引用失败。
     *
     * <p>这里没有 referenceRange：生长的参考值已经逐点放在 {@code GrowthComparisonPoint.referenceValue}
     * 里了（同月龄 P50），再给一个区间反而语义重复。
     */
    public record GrowthPageResponse(Insight insight,
                                     List<GrowthMetricOverview> metrics,
                                     List<TimeRange> timeRanges,
                                     Map<String, Map<String, GrowthTrendSnapshot>> trends,
                                     MonthlyDiet monthlyDiet,
                                     List<MilestoneItem> milestones) {
    }

    public record GrowthTrendResponse(GrowthTrendSnapshot snapshot,
                                      List<GrowthDataPoint> metrics,
                                      Insight insight) {
    }

    // ── 睡眠 ──────────────────────────────────────────────

    public record SleepSegment(String label, double value, String color) {
    }

    public record CircadianSummary(String totalSleepLabel, String goalLabel,
                                   String nightLabel, String napLabel,
                                   List<SleepSegment> segments) {
    }

    public record SleepCircadianResponse(CircadianSummary summary) {
    }

    public record DailySleepLog(String id, String title, String range, String duration,
                                String type, String icon) {
    }

    public record DailySleepLogsResponse(List<DailySleepLog> logs, Insight insight) {
    }

    /** startHour 是 0-24 的浮点数，duration 单位小时——图表按 24 小时横轴摆放 */
    public record SleepEvolutionSegment(double startHour, double duration, String type) {
    }

    public record SleepEvolutionRow(String label, String summary, List<SleepEvolutionSegment> segments) {
    }

    public record SleepEvolutionResponse(List<SleepEvolutionRow> rows, Insight insight) {
    }

    // ── 饮食 ──────────────────────────────────────────────

    public record DietBarItem(String label, double value, Boolean highlighted) {
    }

    public record WeeklyDietResponse(List<DietBarItem> bars, String averageLabel,
                                     String standardLabel, String narrativeNote,
                                     Insight insight, ReferenceRange referenceRange) {
    }

    public record DietRatioItem(String label, double value, String colorClass) {
    }

    public record MonthlyDietDonut(double ratio, String title, List<DietRatioItem> legends) {
    }

    public record MonthlyDietIngredients(String title, String badge, List<String> list) {
    }

    public record MonthlyDietResponse(String title, String subtitle, String extra,
                                      MonthlyDietDonut donut, MonthlyDietIngredients ingredients,
                                      Insight insight) {
    }

    // ── 情绪 ──────────────────────────────────────────────

    public record MoodCalendarDay(int day, String type, Boolean highlighted) {
    }

    public record MoodLegendItem(String label, String colorClass) {
    }

    public record MoodCalendarResponse(List<MoodCalendarDay> days,
                                       List<MoodLegendItem> legends,
                                       Insight insight) {
    }

    public record MoodCheckinOption(String key, String label, String emoji, String icon,
                                    String activeColor, String activeBg, String inactiveBg) {
    }

    public record MoodCheckinOptionsResponse(List<MoodCheckinOption> options) {
    }

    /** 生长指标的量纲，供服务内部使用 */
    public enum Metric {
        HEIGHT("height", "Height", "cm", "Height (cm)"),
        WEIGHT("weight", "Weight", "kg", "Weight (kg)"),
        HEAD("head", "Head", "cm", "Head Circ. (cm)");

        private final String key;
        private final String label;
        private final String unit;
        private final String chartLabel;

        Metric(String key, String label, String unit, String chartLabel) {
            this.key = key;
            this.label = label;
            this.unit = unit;
            this.chartLabel = chartLabel;
        }

        public String key() {
            return key;
        }

        public String label() {
            return label;
        }

        public String unit() {
            return unit;
        }

        public String chartLabel() {
            return chartLabel;
        }

        public static Metric fromKey(String key) {
            for (Metric metric : values()) {
                if (metric.key.equals(key)) {
                    return metric;
                }
            }
            return WEIGHT;
        }
    }
}
