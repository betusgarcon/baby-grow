package com.babygrow.backend.common;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * 不透明游标。
 *
 * <p>对客户端来说只是一个字符串，避免它们依赖「日期 + 排序键」这种内部结构。
 * 解析失败按 400 处理，而不是悄悄退回第一页——那会让客户端陷入无限翻页。
 */
public final class Cursor {

    private static final String SEPARATOR = "\u0001";

    private Cursor() {
    }

    public static String encode(String... parts) {
        String raw = String.join(SEPARATOR, parts);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    /** 空串返回 null（第一页）；格式错误抛 400。 */
    public static String[] decode(String cursor, int expectedParts) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        try {
            String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            String[] parts = raw.split(SEPARATOR, -1);
            if (parts.length != expectedParts) {
                throw new IllegalArgumentException("parts");
            }
            return parts;
        } catch (IllegalArgumentException ex) {
            throw BizException.badRequestKey("error.invalidCursor");
        }
    }
}
