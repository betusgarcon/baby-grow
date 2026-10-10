package com.babygrow.backend.memory;

import java.util.List;

/**
 * 记忆接口的请求/响应体，与前端 {@code memoriesData.ts} 的 {@code MemoryItem} 对齐。
 *
 * <p>{@code date} 是展示串（"Oct 12, 2023"）——这是前端契约要求的形状；数据库里存的是
 * 真实日期，返回时再格式化。
 */
public final class MemoryDtos {

    private MemoryDtos() {
    }

    public record MemoryView(String id,
                             String category,
                             String title,
                             String date,
                             String tone,
                             List<String> tags,
                             String media) {
    }

    /** 新建记忆。date 收 ISO 日期，tone/media 缺省时给保守值。 */
    public record MemoryCreateRequest(String category,
                                      String title,
                                      String date,
                                      String tone,
                                      List<String> tags,
                                      String media,
                                      Long mediaId) {
    }

    public record IdResponse(String id) {
    }
}
