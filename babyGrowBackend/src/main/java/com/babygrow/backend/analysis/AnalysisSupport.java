package com.babygrow.backend.analysis;

import com.babygrow.backend.common.Messages;
import com.babygrow.backend.profile.AgeLabelCalculator;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** 分析服务共用的换算与格式化。 */
public final class AnalysisSupport {

    private static final DateTimeFormatter CLOCK =
            DateTimeFormatter.ofPattern("h:mm a", Locale.US);

    private AnalysisSupport() {
    }

    /** 某个时刻时宝宝多大（整月）。生日缺失时返回 0，规则侧会走保守分支。 */
    public static int ageMonthsAt(LocalDate birthday, Instant at) {
        if (birthday == null) {
            return 0;
        }
        return AgeLabelCalculator.monthsBetween(birthday, at.atZone(ZoneId.systemDefault()).toLocalDate());
    }

    public static LocalDate localDateOf(Instant at) {
        return at.atZone(ZoneId.systemDefault()).toLocalDate();
    }

    /** 分钟 → "10h 30m"；不足一小时只显示分钟 */
    public static String formatDuration(Integer minutes) {
        if (minutes == null || minutes <= 0) {
            return "";
        }
        int hours = minutes / 60;
        int rest = minutes % 60;
        if (hours == 0) {
            return rest + "m";
        }
        return rest == 0 ? hours + "h" : hours + "h " + rest + "m";
    }

    /**
     * 食物类别的展示文案。
     *
     * <p>AI 输出的类别是规范中文值（见提示词），落库与分组都用它；英文界面只在
     * 展示时翻译，不能把翻译后的值写回数据。
     */
    public static String foodCategoryLabel(Messages messages, String category) {
        if (category == null) {
            return "";
        }
        String key = switch (category) {
            case "蔬菜" -> "ui.food.category.vegetable";
            case "水果" -> "ui.food.category.fruit";
            case "谷物" -> "ui.food.category.grain";
            case "蛋类" -> "ui.food.category.egg";
            case "肉类" -> "ui.food.category.meat";
            case "豆制品" -> "ui.food.category.soy";
            case "奶制品" -> "ui.food.category.dairy";
            default -> null;
        };
        return key == null ? category : messages.get(key);
    }

    /** 分钟 → 小时数（保留一位小数），供图表用 */
    public static double minutesToHours(Integer minutes) {
        return minutes == null ? 0d : Math.round(minutes / 6.0) / 10.0;
    }

    public static String formatClock(Instant at) {
        return CLOCK.format(at.atZone(ZoneId.systemDefault()));
    }

    /**
     * 分位区间标签。
     *
     * <p>刻意只说落在哪一段，不给任何医学判断——参考值本身还是占位数据，
     * 在这种基础上给结论是不负责任的。
     */
    public static String percentileBandKey(double value, Double p3, Double p50, Double p97) {
        if (p3 == null || p50 == null || p97 == null) {
            return "";
        }
        if (value < p3) {
            return "ui.percentile.low";
        }
        if (value < p50) {
            return "ui.percentile.stableLow";
        }
        if (value < p97) {
            return "ui.percentile.stableHigh";
        }
        return "ui.percentile.high";
    }

    /** 当前时间往前推 n 个月 */
    public static Instant monthsAgo(int months) {
        return LocalDate.now().minusMonths(months).atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    public static Instant startOfDay(LocalDate date) {
        return date.atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    public static Instant endOfDay(LocalDate date) {
        return date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
    }

    /** BigDecimal → double，null 视为 0（图表上就是缺一个点，而不是崩掉） */
    public static double toDouble(BigDecimal value) {
        return value == null ? 0d : value.doubleValue();
    }
}
