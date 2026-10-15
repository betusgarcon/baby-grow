package com.babygrow.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * {@code app.*} 配置。
 *
 * <p>全部走环境变量占位（见 application.yml），源码里不出现任何真实凭据。
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(Auth auth, Jwt jwt, Wechat wechat, Cors cors, Media media, DemoData demoData, Wish wish) {

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

    /**
     * 演示数据。
     *
     * <p>打开时，服务启动后会给开发账号灌一套完整的演示数据（宝宝档案、几周的记录、心愿、
     * 记忆、疫苗），让前端一打开就是满的。**只有在 {@code auth.dev-mode} 也开启时才生效**，
     * 因此生产环境不可能误灌。
     *
     * <p>灌的是真实数据、走的是真实写入路径，不是响应层返回假数据——后者会把真实链路的
     * 问题掩盖掉。
     *
     * @param enabled 开关；已有记录时不会重复灌
     */
    public record DemoData(boolean enabled) {
    }

    /** 心愿相关配置。 */
    public record Wish(Cover cover) {

        /**
         * 心愿头图。
         *
         * @param enabled 新建心愿后是否异步调用文生图生成头图。**默认关闭**——出图要打外部
         *                付费接口，没配 key 的环境不该在建心愿时静默产生一堆失败任务。
         *                关闭时 {@code cover_status} 一直是 {@code none}，页面显示渐变占位，
         *                心愿本身的勾选/计数/删除完全不受影响。
         */
        public record Cover(boolean enabled) {
        }
    }
}
