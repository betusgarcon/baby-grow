package com.babygrow.backend.common;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

/**
 * 取界面文案。
 *
 * <p>语言由 {@code LocaleFilter} 从请求头写进 {@link LocaleContextHolder}，
 * 缺省中文；因此这里**必须**从上下文取，不能用系统默认 locale——容器里通常是 en。
 */
@Component
public class Messages {

    private final MessageSource source;

    public Messages(MessageSource source) {
        this.source = source;
    }

    public String get(String key, Object... args) {
        return source.getMessage(key, args, LocaleContextHolder.getLocale());
    }
}
