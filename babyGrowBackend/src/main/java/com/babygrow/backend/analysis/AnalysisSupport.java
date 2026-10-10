package com.babygrow.backend.analysis;

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
    public static String percentileBand(double value, Double p3, Double p50, Double p97) {
        if (p3 == null || p50 == null || p97 == null) {
            return "";
        }
        if (value < p3) {
            return "Low (<3%)";
        }
        if (value < p50) {
            return "Stable (3%~50%)";
        }
        if (value < p97) {
            return "Stable (50%~97%)";
        }
        return "High (>97%)";
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
