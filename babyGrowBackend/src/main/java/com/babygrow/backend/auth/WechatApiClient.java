package com.babygrow.backend.auth;

import com.babygrow.backend.common.BizException;
import com.babygrow.backend.common.ErrorCode;
import com.babygrow.backend.config.AppProperties;
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

    public WechatApiClient(AppProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        this.restClient = builder.baseUrl(ENDPOINT).build();
    }

    public String exchangeOpenid(String code) {
        AppProperties.Wechat wechat = properties.wechat();

        if (isBlank(wechat.appId()) || isBlank(wechat.appSecret())) {
            throw new BizException(ErrorCode.INTERNAL_ERROR,
                    "未配置微信凭据。请设置 WX_APPID / WX_SECRET 环境变量，"
                            + "或开启 APP_AUTH_DEV_MODE=true 使用本地直通登录。");
        }

        Map<?, ?> body = restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .queryParam("appid", wechat.appId())
                        .queryParam("secret", wechat.appSecret())
                        .queryParam("js_code", code)
                        .queryParam("grant_type", "authorization_code")
                        .build())
                .retrieve()
                .body(Map.class);

        if (body == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "微信登录失败：响应为空");
        }
        Object openid = body.get("openid");
        if (openid == null) {
            // errcode 常见：40029 code 无效、45011 频率限制
            Object errmsg = body.get("errmsg");
            log.warn("jscode2session 未返回 openid, errcode={} errmsg={}", body.get("errcode"), errmsg);
            throw new BizException(ErrorCode.UNAUTHORIZED,
                    "微信登录失败：" + (errmsg == null ? "未知原因" : errmsg.toString()));
        }
        return openid.toString();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
