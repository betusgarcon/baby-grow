package com.babygrow.backend.profile;

import java.time.LocalDate;

/**
 * 由生日推算年龄展示文案。与前端 {@code store/profile.ts} 的 computeAgeLabel 保持同一口径。
 *
 * <p>统一用短格式（6M / 1Y2M）：这个值主要出现在头像底部那枚很窄的徽章里，
 * 「6 Months」会被圆形容器裁掉两侧。改动此处必须同步改前端，反之亦然。
 */
public final class AgeLabelCalculator {

    private AgeLabelCalculator() {
    }

    /**
     * 整月数。生日缺失时返回 0——调用方（AI 的月龄参数）需要一个具体数字，
     * 且 0 会让规则引擎走「月龄过小」的保守分支，是安全的缺省。
     */
    public static int monthsBetween(LocalDate birthday, LocalDate today) {
        if (birthday == null) {
            return 0;
        }

        int months = (today.getYear() - birthday.getYear()) * 12
                + (today.getMonthValue() - birthday.getMonthValue());
        if (today.getDayOfMonth() < birthday.getDayOfMonth()) {
            months--;
        }
        return Math.max(months, 0);
    }

    public static String compute(LocalDate birthday, LocalDate today) {
        if (birthday == null) {
            return "";
        }

        int months = monthsBetween(birthday, today);
        if (months < 12) {
            return months + "M";
        }

        int years = months / 12;
        int rest = months % 12;
        return rest == 0 ? years + "Y" : years + "Y" + rest + "M";
    }
}
