package com.babygrow.backend.common;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContext;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * 取界面文案。
 *
 * <p>语言由 {@code LocaleFilter} 从请求头写进 {@link LocaleContextHolder}，
 * 缺省中文；因此这里**必须**从上下文取，不能用系统默认 locale——容器里通常是 en。
 * 后台线程（定时任务、异步生成）没有请求上下文，同样落到中文。
 */
@Component
public class Messages {

    private static final Locale DEFAULT_LOCALE = Locale.SIMPLIFIED_CHINESE;

    private final MessageSource source;

    public Messages(MessageSource source) {
        this.source = source;
    }

    /** 当前请求语言；后台线程落到中文。 */
    public Locale locale() {
        LocaleContext context = LocaleContextHolder.getLocaleContext();
        return context == null || context.getLocale() == null ? DEFAULT_LOCALE : context.getLocale();
    }

    public String get(String key, Object... args) {
        return source.getMessage(key, args, locale());
    }
}
