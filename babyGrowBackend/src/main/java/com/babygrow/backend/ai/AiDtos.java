package com.babygrow.backend.ai;

/** AI 相关接口的请求体。 */
public final class AiDtos {

    private AiDtos() {
    }

    /**
     * 文本提取请求。
     *
     * <p>不含 baby_id / 月龄：这两项由服务端从登录态与档案解析。让客户端传，
     * 既不安全（可以伪造别的宝宝 id），也把内部标识泄漏给了前端。
     */
    public record ExtractRequest(String text) {
    }
}
