package com.babygrow.backend.common;

import java.util.List;
import java.util.function.Function;

/**
 * 游标分页的返回结构。
 *
 * <p>用游标而不是页码：列表按时间倒序，翻页期间新增一条记录会让 offset 整体错位，
 * 用户会看到重复或漏掉的数据。游标绑定「上一页最后一条」的排序键，天然稳定。
 */
public record PageResponse<T>(List<T> items, String nextCursor, boolean hasMore) {

    /**
     * 从「多取一条」的结果里裁出当前页。
     *
     * @param fetched 已按 limit + 1 查询的结果
     * @param limit   本页上限
     * @param cursor  由最后一条生成下一页游标
     */
    public static <T> PageResponse<T> of(List<T> fetched, int limit, Function<T, String> cursor) {
        boolean hasMore = fetched.size() > limit;
        List<T> items = hasMore ? fetched.subList(0, limit) : fetched;
        String next = hasMore && !items.isEmpty() ? cursor.apply(items.get(items.size() - 1)) : null;
        return new PageResponse<>(List.copyOf(items), next, hasMore);
    }

    /** 实体与响应分离时用这个：游标从实体取，响应只负责展示。 */
    public static <E, T> PageResponse<T> of(List<E> fetched, int limit,
                                            Function<E, String> cursor, Function<E, T> mapper) {
        boolean hasMore = fetched.size() > limit;
        List<E> page = hasMore ? fetched.subList(0, limit) : fetched;
        String next = hasMore && !page.isEmpty() ? cursor.apply(page.get(page.size() - 1)) : null;
        return new PageResponse<>(page.stream().map(mapper).toList(), next, hasMore);
    }

    /** 统一的分页大小：缺省 20，最大 100，避免一次拉爆。 */
    public static int limit(Integer requested) {
        if (requested == null) {
            return 20;
        }
        return Math.max(1, Math.min(requested, 100));
    }
}
