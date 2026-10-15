package com.babygrow.backend.menu;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.ZoneId;
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
     *
     * <p>「哪一天」用一个**显式传入的时区**来切，不用 {@code current_setting('TIMEZONE')}。
     * 那个值是 Postgres 会话的时区，来自 initdb 时写进 postgresql.conf 的 timezone，
     * 与 JVM 的时区是两套互不相干的配置——实测（2026-10-16）容器里 TZ=Asia/Shanghai
     * 已生效、系统时间是 CST，但 GUC 仍是 Etc/UTC。而 Java 侧所有「今天」都出自
     * LocalDate.now()，取的是 JVM 时区。两边不同源，国内用户在 00:00–08:00 之间
     * 就会被切到不同的「天」上。
     *
     * <p>传 JVM 的 ZoneId 进来，是让「天」只有一个来源，而不是靠两处配置碰巧一致。
     * {@code occurred_at} 是 TIMESTAMPTZ，{@code AT TIME ZONE z} 得到的正是该时区的
     * 墙上时间，切天用它是正确的。
     */
    public List<RecentFoodRow> findRecentSolidFoods(Long babyId, int days) {
        return jdbc.query(
                """
                SELECT to_char(occurred_at AT TIME ZONE CAST(? AS text), 'YYYY-MM-DD') AS day,
                       food_name
                  FROM feedings
                 WHERE baby_id = ?
                   AND kind = 'solid'
                   AND food_name IS NOT NULL
                   AND occurred_at >= now() - (? * INTERVAL '1 day')
                 ORDER BY day DESC, food_name
                """,
                (rs, rowNum) -> new RecentFoodRow(rs.getString("day"), rs.getString("food_name")),
                ZoneId.systemDefault().getId(), babyId, days);
    }
}
