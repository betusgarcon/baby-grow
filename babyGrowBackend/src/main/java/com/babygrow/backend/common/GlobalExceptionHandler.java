package com.babygrow.backend.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.stream.Collectors;

/**
 * 把异常统一折成 {@link ApiResponse}。
 *
 * <p>注意：前端用 {@code Taro.request}，HTTP 4xx/5xx 默认不会 reject，它只看响应体的
 * {@code code} 字段。所以这里既设 HTTP 状态码（给日志和网关看），也保证响应体是标准包。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final Messages messages;

    public GlobalExceptionHandler(Messages messages) {
        this.messages = messages;
    }

    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiResponse<Void>> handleBiz(BizException ex) {
        ErrorCode errorCode = ex.getErrorCode();
        String message = ex.getMessageKey() != null
                ? messages.get(ex.getMessageKey(), ex.getMessageArgs())
                : resolveMessage(ex.getMessage(), errorCode);

        log.warn("业务异常 code={} message={}", errorCode.getCode(), message);
        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.fail(errorCode, message));
    }

    /**
     * 异常里带的是**文案键**（约定以 {@code error.} 开头）或已经拼好的人话。
     *
     * <p>第三方返回的错误（例如微信的 errmsg）本身就带可读信息，直接透出比换成
     * 一句笼统的「请求失败」更有用，所以只有键才查表。
     */
    private String resolveMessage(String raw, ErrorCode errorCode) {
        if (raw != null && raw.startsWith("error.")) {
            return messages.get(raw);
        }
        // BizException 只用错误码构造时，getMessage() 是枚举里的中文默认值；
        // 它同样要按请求语言翻译，而不是原样透出。
        if (raw == null || raw.isBlank() || raw.equals(errorCode.getMessage())) {
            return messages.get(errorKey(errorCode));
        }
        return raw;
    }

    private static String errorKey(ErrorCode errorCode) {
        return "error." + errorCode.name().toLowerCase(java.util.Locale.ROOT);
    }

    /** @Valid 校验失败：把字段名带上，便于前端定位 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(field -> field.getField() + ": " + defaultMessage(field))
                .collect(Collectors.joining("; "));
        log.warn("参数校验失败 {}", detail);
        return ResponseEntity.status(ErrorCode.BAD_REQUEST.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.BAD_REQUEST,
                        detail.isEmpty() ? messages.get(errorKey(ErrorCode.BAD_REQUEST)) : detail));
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception ex) {
        log.warn("请求参数有误 {}", ex.getMessage());
        return ResponseEntity.status(ErrorCode.BAD_REQUEST.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.BAD_REQUEST, messages.get(errorKey(ErrorCode.BAD_REQUEST))));
    }

    /**
     * 唯一约束 / 外键 / 非空约束被违反。
     *
     * <p>不接这个的话会落到下面的兜底，对外是 500——但这类失败几乎都是可预期的：
     * 要么是「先查后插」的两个请求撞在了一起（{@code MenuService.today} 的
     * {@code (baby_id, date)}、心愿的 {@code (baby_id, client_key)}），要么是某一列
     * 的长度比校验允许的更长（{@code memories.title} 是 128）。这两类都该是 409/400
     * 语义，而不是「服务器内部错误」——后者既误导排查，又让客户端以为重试无用。
     *
     * <p>冲突详情只进日志：异常消息里会带上表名、列名甚至行内容。
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("数据完整性约束冲突", ex);
        return ResponseEntity.status(ErrorCode.CONFLICT.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.CONFLICT, messages.get(errorKey(ErrorCode.CONFLICT))));
    }

    /** 兜底。对外不暴露堆栈，详情只进日志 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("未预期异常", ex);
        return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getHttpStatus())
                .body(ApiResponse.fail(ErrorCode.INTERNAL_ERROR,
                        messages.get(errorKey(ErrorCode.INTERNAL_ERROR))));
    }

    private String defaultMessage(FieldError field) {
        String raw = field.getDefaultMessage();
        if (raw == null || raw.isBlank()) {
            return messages.get("error.invalidValue");
        }
        // 校验注解里写的是文案键（约定 error. 前缀），这里统一翻译
        return raw.startsWith("error.") ? messages.get(raw) : raw;
    }
}
