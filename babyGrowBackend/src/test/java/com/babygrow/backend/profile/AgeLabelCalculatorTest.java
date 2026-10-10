package com.babygrow.backend.profile;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 年龄文案的口径必须与前端 {@code store/profile.ts#computeAgeLabel} 完全一致，
 * 否则同一个生日在编辑前后会显示成两个值。这里把边界钉住。
 */
class AgeLabelCalculatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 10);

    @Test
    void returnsEmptyWhenBirthdayMissing() {
        assertThat(AgeLabelCalculator.compute(null, TODAY)).isEmpty();
    }

    @Test
    void countsWholeMonths() {
        assertThat(AgeLabelCalculator.compute(LocalDate.of(2026, 4, 10), TODAY)).isEqualTo("6 Months");
    }

    @Test
    void rollsBackAMonthWhenDayOfMonthNotReached() {
        // 4-11 出生，到 10-10 还差一天才满 6 个月
        assertThat(AgeLabelCalculator.compute(LocalDate.of(2026, 4, 11), TODAY)).isEqualTo("5 Months");
    }

    @Test
    void usesYearsAndMonthsOnceOverOne() {
        assertThat(AgeLabelCalculator.compute(LocalDate.of(2024, 6, 15), TODAY)).isEqualTo("2Y3M");
    }

    @Test
    void omitsZeroMonths() {
        assertThat(AgeLabelCalculator.compute(LocalDate.of(2025, 10, 10), TODAY)).isEqualTo("1Y");
    }

    @Test
    void clampsFutureBirthdayToZero() {
        assertThat(AgeLabelCalculator.compute(LocalDate.of(2027, 1, 1), TODAY)).isEqualTo("0 Months");
    }
}
