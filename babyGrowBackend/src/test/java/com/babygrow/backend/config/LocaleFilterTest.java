package com.babygrow.backend.config;

import org.junit.jupiter.api.Test;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

/** 语言解析：缺省与无法识别一律中文，只有 en 开头才走英文。 */
class LocaleFilterTest {

    @Test
    void usesChineseWhenHeaderIsMissing() {
        assertThat(LocaleFilter.resolve(null)).isEqualTo(Locale.SIMPLIFIED_CHINESE);
        assertThat(LocaleFilter.resolve("  ")).isEqualTo(Locale.SIMPLIFIED_CHINESE);
    }

    @Test
    void readsOnlyThePrimaryTag() {
        assertThat(LocaleFilter.resolve("en-US,en;q=0.9")).isEqualTo(Locale.ENGLISH);
        assertThat(LocaleFilter.resolve("zh-CN,zh;q=0.9")).isEqualTo(Locale.SIMPLIFIED_CHINESE);
    }

    @Test
    void fallsBackToChineseForWildcardAndUnknown() {
        assertThat(LocaleFilter.resolve("*")).isEqualTo(Locale.SIMPLIFIED_CHINESE);
        assertThat(LocaleFilter.resolve("fr-FR")).isEqualTo(Locale.SIMPLIFIED_CHINESE);
    }
}
