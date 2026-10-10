package com.babygrow.backend.vaccine;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 接种进度由展示文案派生。
 *
 * <p>这个判断错了不会报错，只会让进度条默默停在 0——第一版的正则就漏了序数后缀，
 * 「2nd of 3」解析不出来，页面上进度条一直不动。
 */
class DoseProgressTest {

    @Test
    void parsesOrdinalSuffixes() {
        assertThat(VaccineService.parseDoseProgress("2nd of 3")).isEqualTo(2d / 3);
        assertThat(VaccineService.parseDoseProgress("1st of 3")).isEqualTo(1d / 3);
        assertThat(VaccineService.parseDoseProgress("3rd of 3")).isEqualTo(1d);
        assertThat(VaccineService.parseDoseProgress("4th of 5")).isEqualTo(0.8d);
    }

    @Test
    void parsesPlainNumbers() {
        assertThat(VaccineService.parseDoseProgress("2 of 4")).isEqualTo(0.5d);
    }

    @Test
    void capsAtOne() {
        assertThat(VaccineService.parseDoseProgress("5 of 3")).isEqualTo(1d);
    }

    @Test
    void returnsNullWhenNotParseable() {
        assertThat(VaccineService.parseDoseProgress("加强针")).isNull();
        assertThat(VaccineService.parseDoseProgress("of 3")).isNull();
        assertThat(VaccineService.parseDoseProgress("")).isNull();
    }
}
