package com.babygrow.backend.menu;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 组装推荐上下文时需要的业务数据。
 *
 * <p>用 JdbcTemplate 直查而不是建实体：{@code baby_allergens} 只是一列字符串，
 * 为它维护一份 ORM 映射得不偿失。真正需要实体的是会被写入的表。
 */
@Repository
public class MenuContextRepository {

    private final JdbcTemplate jdbc;

    public MenuContextRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 过敏原，直接作为 AI 的 avoid 上下文传入 */
    public List<String> findAllergens(Long babyId) {
        return jdbc.queryForList(
                "SELECT allergen FROM baby_allergens WHERE baby_id = ? ORDER BY allergen",
                String.class, babyId);
    }

    /** 近 N 天某一天吃过的辅食 */
    public record RecentFoodRow(String day, String foodName) {
    }

    /**
     * 近 N 天吃过的辅食，按天倒序。
     *
     * <p>只取辅食不取奶：推荐的是辅食食谱，把奶量算进「最近吃过」会让模型误以为
     * 已经吃过某些食材而重复推荐。
     */
    public List<RecentFoodRow> findRecentSolidFoods(Long babyId, int days) {
        return jdbc.query(
                """
                SELECT to_char(occurred_at AT TIME ZONE current_setting('TIMEZONE'), 'YYYY-MM-DD') AS day,
                       food_name
                  FROM feedings
                 WHERE baby_id = ?
                   AND kind = 'solid'
                   AND food_name IS NOT NULL
                   AND occurred_at >= now() - (? * INTERVAL '1 day')
                 ORDER BY day DESC, food_name
                """,
                (rs, rowNum) -> new RecentFoodRow(rs.getString("day"), rs.getString("food_name")),
                babyId, days);
    }
}
