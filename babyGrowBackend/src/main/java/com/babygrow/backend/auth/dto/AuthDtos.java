package com.babygrow.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** 鉴权相关的请求/响应体。 */
public final class AuthDtos {

    private AuthDtos() {
    }

    /**
     * 登录请求。
     *
     * <p>{@code code} 来自小程序 {@code Taro.login()}。dev-mode 下该值不被校验，
     * 传任意非空字符串即可。
     */
    public record LoginRequest(@NotBlank(message = "code 不能为空") String code) {
    }

    public record LoginResponse(String token, MeResponse user) {
    }

    /** 当前登录态的全貌。前端据此得知自己属于哪个家庭、看哪个宝宝。 */
    public record MeResponse(Long userId,
                             String nickname,
                             String avatarUrl,
                             Long familyId,
                             Long babyId,
                             String role) {
    }
}
