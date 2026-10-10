package com.babygrow.backend.common;

import org.springframework.http.HttpStatus;

/**
 * 业务错误码。
 *
 * <p>数值本身只是内部约定（前端只判 {@code code != 0}），但每个错误码都绑定一个 HTTP 状态，
 * 便于用日志/网关做分流。
 */
public enum ErrorCode {

    OK(0, "ok", HttpStatus.OK),

    BAD_REQUEST(40000, "请求参数有误", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED(40100, "未登录或登录已过期", HttpStatus.UNAUTHORIZED),
    FORBIDDEN(40300, "无权访问该资源", HttpStatus.FORBIDDEN),
    NOT_FOUND(40400, "资源不存在", HttpStatus.NOT_FOUND),
    CONFLICT(40900, "资源状态冲突", HttpStatus.CONFLICT),

    /** 上游 AI 服务不可用。业务数据不受影响，只需重试或走降级 */
    UPSTREAM_UNAVAILABLE(50300, "AI 服务暂时不可用", HttpStatus.SERVICE_UNAVAILABLE),

    INTERNAL_ERROR(50000, "服务器内部错误", HttpStatus.INTERNAL_SERVER_ERROR);

    private final int code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }
}
