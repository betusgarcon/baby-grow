package com.babygrow.backend.wish;

import java.util.List;

/**
 * 心愿接口的请求/响应体，与前端 {@code store/wishes.ts} 的 {@code Wish} 对齐。
 *
 * <p>{@code id} 是前端生成的 client_key——它同时被嵌进详情页路径里，必须原样返回。
 */
public final class WishDtos {

    private WishDtos() {
    }

    public record ChecklistItemView(String id, String title, String note, boolean done) {
    }

    public record CounterView(int current, int target, String unit) {
    }

    public record WishView(String id,
                           String icon,
                           String circleClass,
                           String title,
                           String description,
                           String detailSubtitle,
                           int goal,
                           String unitLabel,
                           String checklistTitle,
                           String path,
                           String kind,
                           String badge,
                           List<ChecklistItemView> checklist,
                           CounterView counter,
                           String expertTip) {
    }

    /** 新建心愿。字段一律可空——前端只填自己关心的那几项。 */
    public record WishRequest(String id,
                              String icon,
                              String circleClass,
                              String title,
                              String description,
                              String detailSubtitle,
                              Integer goal,
                              String unitLabel,
                              String checklistTitle,
                              String path,
                              String kind,
                              String badge,
                              List<ChecklistItemView> checklist,
                              CounterView counter,
                              String expertTip) {
    }

    /** 删除只要一个 id。前端把参数放在 DELETE 的请求体里。 */
    public record WishIdRequest(String id) {
    }

    public record ChecklistUpdateRequest(String id, List<ChecklistItemView> checklist) {
    }

    public record CounterUpdateRequest(String id, Integer current) {
    }

    public record IdResponse(String id) {
    }
}
