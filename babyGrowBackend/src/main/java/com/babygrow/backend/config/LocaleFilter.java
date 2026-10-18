package com.babygrow.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Locale;

/**
 * 从 {@code Accept-Language} 解析请求语言，写入 {@link LocaleContextHolder}。
 *
 * <p>注册在 JWT 过滤器**之前**：鉴权失败时由安全链直接写响应，那条路径也要能拿到语言。
 *
 * <p>缺省与未知一律回落中文。这一点必须写死：Spring 默认会跟系统 locale 走，
 * 而容器里的 JVM locale 往往是 en——漏配一个头就会让中文用户看到英文。
 */
@Component
public class LocaleFilter extends OncePerRequestFilter {

    public static final Locale DEFAULT_LOCALE = Locale.SIMPLIFIED_CHINESE;

    private static final String HEADER = "Accept-Language";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        LocaleContextHolder.setLocale(resolve(request.getHeader(HEADER)));

        try {
            chain.doFilter(request, response);
        } finally {
            // 线程池复用：不清理会把上一位用户的语言带给下一位
            LocaleContextHolder.resetLocaleContext();
        }
    }

    /** 只看第一段主语言标签；`*` 与无法识别的值都按中文处理 */
    static Locale resolve(String header) {
        if (header == null || header.isBlank()) {
            return DEFAULT_LOCALE;
        }

        String primary = header.split(",")[0].trim().toLowerCase(Locale.ROOT);

        if (primary.startsWith("en")) {
            return Locale.ENGLISH;
        }
        if (primary.startsWith("zh")) {
            return DEFAULT_LOCALE;
        }

        return DEFAULT_LOCALE;
    }
}
