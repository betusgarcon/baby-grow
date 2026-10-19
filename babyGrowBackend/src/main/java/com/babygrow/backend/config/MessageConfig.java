package com.babygrow.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.web.servlet.LocaleResolver;

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

    /**
     * DispatcherServlet 会用 LocaleResolver 重写 LocaleContextHolder。
     * 默认的 AcceptHeaderLocaleResolver 在请求没有 Accept-Language 时取
     * {@code request.getLocale()}，也就是 JVM 默认语言——容器里通常是 en。
     * 于是控制器抛出的错误会变成英文，而安全链里的 401 仍是中文。
     * 这里让它与 LocaleFilter 使用同一套规则，缺省始终中文。
     */
    @Bean
    public LocaleResolver localeResolver() {
        return new LocaleResolver() {
            @Override
            public Locale resolveLocale(HttpServletRequest request) {
                return LocaleFilter.resolve(request.getHeader("Accept-Language"));
            }

            @Override
            public void setLocale(HttpServletRequest request, HttpServletResponse response, Locale locale) {
                // 语言只由请求头决定，不支持通过响应改变
            }
        };
    }

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
