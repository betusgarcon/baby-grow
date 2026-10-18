package com.babygrow.backend.common;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 文案解析的两条硬约束：缺省中文，以及带参数的英文里单引号不能吞掉占位符。
 *
 * <p>后者是 MessageFormat 的坑：{@code Couldn't ... {0}} 里那个单引号会开启
 * 引用段，导致 {@code {0}} 原样输出。英文文案里的撇号必须写成两个。
 */
class MessagesTest {

    private final Messages messages = new Messages(messageSource());

    private static ResourceBundleMessageSource messageSource() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return source;
    }

    @AfterEach
    void clearLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    void defaultsToChineseWithoutRequestContext() {
        LocaleContextHolder.resetLocaleContext();

        assertThat(messages.get("error.bad_request")).isEqualTo("请求参数有误");
    }

    @Test
    void resolvesEnglishFromContext() {
        LocaleContextHolder.setLocale(Locale.ENGLISH);

        assertThat(messages.get("error.bad_request")).isEqualTo("Invalid request");
    }

    @Test
    void substitutesPlaceholdersInEnglishMessagesWithApostrophes() {
        LocaleContextHolder.setLocale(Locale.ENGLISH);

        assertThat(messages.get("error.dateUnparseable", "2026-10-10"))
                .isEqualTo("Couldn't read that date — please write it like 2026-10-10");
    }

    @Test
    void bothLanguagesResolveCoreKeys() {
        for (String key : java.util.List.of(
                "error.bad_request", "ui.mood.legend.happy", "ui.diet.averageLabel",
                "ui.journey.vaccine.done", "ui.food.category.vegetable")) {
            LocaleContextHolder.setLocale(Locale.SIMPLIFIED_CHINESE);
            assertThat(messages.get(key, 1)).as(key + " (zh)").isNotBlank();

            LocaleContextHolder.setLocale(Locale.ENGLISH);
            assertThat(messages.get(key, 1)).as(key + " (en)")
                    .isNotBlank()
                    .isNotEqualTo(key);
        }
    }
}
