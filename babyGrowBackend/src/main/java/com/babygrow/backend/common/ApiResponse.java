package com.babygrow.backend.common;

/**
 * 全站统一响应包。
 *
 * <p>与前端 {@code src/api/request.ts} 的解析完全一致：{@code code == 0} 为成功，
 * 非 0 时前端会抛出 {@code message}。因此任何失败路径都必须返回这个结构，
 * 包括 Spring Security 在过滤器里直接拒绝的情况（见 SecurityConfig 的 entry point）。
 */
public record ApiResponse<T>(int code, T data, String message) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(ErrorCode.OK.getCode(), data, ErrorCode.OK.getMessage());
    }

    public static <T> ApiResponse<T> fail(ErrorCode errorCode) {
        return new ApiResponse<>(errorCode.getCode(), null, errorCode.getMessage());
    }

    public static <T> ApiResponse<T> fail(ErrorCode errorCode, String message) {
        return new ApiResponse<>(errorCode.getCode(), null, message);
    }
}
