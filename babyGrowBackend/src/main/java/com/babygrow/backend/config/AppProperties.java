package com.babygrow.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * {@code app.*} 配置。
 *
 * <p>全部走环境变量占位（见 application.yml），源码里不出现任何真实凭据。
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Auth auth, Jwt jwt, Wechat wechat, Cors cors, Media media) {

    public record Auth(boolean devMode) {
    }

    public record Jwt(String secret, long ttlHours) {
    }

    /** 微信小程序凭据。dev-mode 为 true 时不需要填。 */
    public record Wechat(String appId, String appSecret) {
    }

    public record Cors(String allowedOriginPatterns) {

        /** yml 里写成逗号分隔字符串，这里拆成列表；空值兜底为空列表（即不允许任何跨域） */
        public List<String> origins() {
            if (allowedOriginPatterns == null || allowedOriginPatterns.isBlank()) {
                return List.of();
            }
            return List.of(allowedOriginPatterns.split(",")).stream()
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
    }

    /**
     * 媒体存储。
     *
     * @param root        本地存储根目录
     * @param publicBase  对外可访问的地址前缀，用于拼出绝对 URL。小程序渲染图片需要绝对地址；
     *                    生产环境需改成真实域名。
     */
    public record Media(String root, String publicBase) {
    }
}
