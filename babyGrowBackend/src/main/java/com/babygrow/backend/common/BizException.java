package com.babygrow.backend.common;

/**
 * 可预期的业务失败。由 {@link GlobalExceptionHandler} 转成统一响应包。
 *
 * <p>两种构造方式：
 * <ul>
 *   <li>{@link #badRequestKey} 等：带**文案键**与参数，由处理器按请求语言翻译；</li>
 *   <li>{@code message} 字面量：第三方返回的可读错误（如微信的 errmsg）直接透出。</li>
 * </ul>
 * 让异常携带键而不是在这里翻译，是为了让调用点不必注入 {@code Messages}。
 */
public class BizException extends RuntimeException {

    private final ErrorCode errorCode;
    private final String messageKey;
    private final transient Object[] messageArgs;

    public BizException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.messageKey = null;
        this.messageArgs = null;
    }

    public BizException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.messageKey = null;
        this.messageArgs = null;
    }

    private BizException(ErrorCode errorCode, String messageKey, Object... args) {
        super(messageKey);
        this.errorCode = errorCode;
        this.messageKey = messageKey;
        this.messageArgs = args;
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    /** 文案键；为 null 时说明 message 本身就是最终文本 */
    public String getMessageKey() {
        return messageKey;
    }

    public Object[] getMessageArgs() {
        return messageArgs;
    }

    public static BizException notFound(String message) {
        return new BizException(ErrorCode.NOT_FOUND, message);
    }

    public static BizException badRequest(String message) {
        return new BizException(ErrorCode.BAD_REQUEST, message);
    }

    public static BizException forbidden(String message) {
        return new BizException(ErrorCode.FORBIDDEN, message);
    }

    public static BizException conflict(String message) {
        return new BizException(ErrorCode.CONFLICT, message);
    }

    public static BizException badRequestKey(String key, Object... args) {
        return new BizException(ErrorCode.BAD_REQUEST, key, args);
    }

    public static BizException notFoundKey(String key, Object... args) {
        return new BizException(ErrorCode.NOT_FOUND, key, args);
    }

    public static BizException forbiddenKey(String key, Object... args) {
        return new BizException(ErrorCode.FORBIDDEN, key, args);
    }

    public static BizException conflictKey(String key, Object... args) {
        return new BizException(ErrorCode.CONFLICT, key, args);
    }
}
