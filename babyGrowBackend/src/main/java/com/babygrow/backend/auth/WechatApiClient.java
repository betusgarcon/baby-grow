package com.babygrow.backend.auth;

import com.babygrow.backend.common.BizException;
import com.babygrow.backend.common.ErrorCode;
import com.babygrow.backend.common.Messages;
import com.babygrow.backend.config.AppProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * 微信 {@code jscode2session}：用小程序 code 换 openid。
 *
 * <p>凭据只从配置读，源码与仓库里没有真实值。未配置凭据时直接给出可执行的提示，
 * 而不是让请求打到微信再报一个含义不明的错误。
 */
@Component
public class WechatApiClient {

    private static final Logger log = LoggerFactory.getLogger(WechatApiClient.class);
    private static final String ENDPOINT = "https://api.weixin.qq.com/sns/jscode2session";

    private final AppProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Messages messages;

    public WechatApiClient(AppProperties properties, RestClient.Builder builder,
                           ObjectMapper objectMapper, Messages messages) {
        this.properties = properties;
        this.restClient = builder.baseUrl(ENDPOINT).build();
        this.objectMapper = objectMapper;
        this.messages = messages;
    }

    public String exchangeOpenid(String code) {
        AppProperties.Wechat wechat = properties.wechat();

        if (isBlank(wechat.appId()) || isBlank(wechat.appSecret())) {
            throw new BizException(ErrorCode.INTERNAL_ERROR,
                    messages.get("error.wechatNotConfigured"));
        }

        // **先取字符串，再自己解析，不要直接 .body(Map.class)。**
        //
        // 微信在部分错误响应上把 Content-Type 标成 text/plain，而 Spring 的
        // HttpMessageConverter 不为 text/plain 提供 Map 转换器，于是
        //   UnknownContentTypeException: no suitable HttpMessageConverter found
        //   for response type [interface java.util.Map] and content type [text/plain]
        // 被全局兜底成 500「服务器内部错误」。前端拿到 500 就没有 token，
        // 后续每个接口都 401 —— 现象是整站空白，但根因离现场很远。
        //
        // 这条路以前只跑过 dev-mode（短路到固定 openid），所以直到真机首次登录才暴露。
        String raw = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .queryParam("appid", wechat.appId())
                        .queryParam("secret", wechat.appSecret())
                        .queryParam("js_code", code)
                        .queryParam("grant_type", "authorization_code")
                        .build())
                .retrieve()
                .body(String.class);

        if (raw == null || raw.isBlank()) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "微信登录失败：响应为空");
        }

        Map<?, ?> body;
        try {
            body = objectMapper.readValue(raw, Map.class);
        } catch (Exception ex) {
            // 只截断后记日志：正常响应里含 session_key，不该原样落盘
            log.warn("jscode2session 返回了无法解析的内容：{}", raw.substring(0, Math.min(raw.length(), 200)));
            throw new BizException(ErrorCode.UNAUTHORIZED,
                    messages.get("error.wechatLoginUnparseable"));
        }

        Object openid = body.get("openid");
        if (openid == null) {
            // errcode 常见：40029 code 无效、45011 频率限制
            Object errmsg = body.get("errmsg");
            log.warn("jscode2session 未返回 openid, errcode={} errmsg={}", body.get("errcode"), errmsg);
            throw new BizException(ErrorCode.UNAUTHORIZED,
                    messages.get("error.wechatLoginFailed",
                            errmsg == null ? messages.get("error.wechatUnknownReason") : errmsg.toString()));
        }
        return openid.toString();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
