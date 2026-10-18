package com.babygrow.backend.config;

import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;

import java.util.Locale;

/**
 * 文案资源。
 *
 * <p>必须显式声明：Boot 的 {@code MessageSourceAutoConfiguration} 会先用
 * {@link java.util.ResourceBundle} 探测基名，而仓库里只有 {@code messages_zh} /
 * {@code messages_en}、没有默认的 {@code messages.properties}，探测条件不成立。
 * 结果是容器注入一个空的 {@code DelegatingMessageSource}，任何
 * {@code messages.get(...)} 都会抛 {@code NoSuchMessageException}——
 * 鉴权失败时连 401 的 JSON 都写不出来。
 *
 * <p>请求语言由 {@code LocaleFilter} 限制为 zh / en，后台线程显式用中文，
 * 因此不需要再放一份默认 bundle。
 */
@Configuration
public class MessageConfig {

    @Bean
    public MessageSource messageSource() {
        ResourceBundleMessageSource source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        source.setDefaultLocale(Locale.SIMPLIFIED_CHINESE);
        return source;
    }
}
