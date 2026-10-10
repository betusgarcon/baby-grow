package com.babygrow.backend.menu;

import java.util.List;

/**
 * 首页食谱推荐接口的响应体。
 *
 * <p>{@code items} 的字段与前端 {@code types/journey.ts} 的 {@code MenuItem} 对齐；
 * {@code sourceChunkIds} 是额外给出的，供「依据来自哪本指南」这类展开用。
 *
 * <p>{@code stale} 很关键：它是 true 时表示这次返回的是上一次的结果（可能已经过时，
 * 后台正在重新生成）。前端可以据此给出提示，而不是让首页空着。
 */
public final class MenuDtos {

    private MenuDtos() {
    }

    public record MenuTodayResponse(String date,
                                    String generatedAt,
                                    boolean stale,
                                    List<MenuItemView> items,
                                    String reason,
                                    List<String> avoidItems,
                                    String error) {

        /** 生成还没跑完时的占位结构。宁可给空列表也不给 null——首页会直接遍历它 */
        public static MenuTodayResponse empty(String date, String error) {
            return new MenuTodayResponse(date, null, true, List.of(), null, List.of(), error);
        }
    }

    public record MenuItemView(String id,
                               String mealType,
                               String title,
                               String description,
                               String icon,
                               String bgColor,
                               List<Integer> sourceChunkIds) {
    }
}
