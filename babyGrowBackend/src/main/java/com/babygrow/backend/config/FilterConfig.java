package com.babygrow.backend.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 语言过滤器只注册在 Spring Security 链里（见 {@code SecurityConfig}）。
 *
 * <p>它是一个 {@code @Component} 的 {@code OncePerRequestFilter}，Boot 默认还会把它
 * 再注册成 servlet 过滤器——那条路径排在安全链之后，等于白跑一次。这里关掉自动注册，
 * 保留唯一一次、且在鉴权之前执行。
 */
@Configuration
public class FilterConfig {

    @Bean
    public FilterRegistrationBean<LocaleFilter> localeFilterRegistration(LocaleFilter filter) {
        FilterRegistrationBean<LocaleFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }
}
