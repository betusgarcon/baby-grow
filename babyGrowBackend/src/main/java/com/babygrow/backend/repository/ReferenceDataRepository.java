package com.babygrow.backend.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * 参考基准与里程碑目录的读取。
 *
 * <p>这三张表是只读的种子数据，用 JdbcTemplate 直接查，不建实体——为只读数据维护
 * 三份 ORM 映射除了样板代码以外没有收益。
 */
@Repository
public class ReferenceDataRepository {

    private final JdbcTemplate jdbc;

    public ReferenceDataRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 某一指标 + 性别下的全部分位值（当前种子最多 4 个年龄点，一次取回后在内存里按年龄取用） */
    public record GrowthStandard(int ageMonth, BigDecimal p3, BigDecimal p50, BigDecimal p97,
                                 String source, String version) {
    }

    public record FeedingStandard(int ageMonthMin, int ageMonthMax, Integer recommendedMin,
                                  Integer recommendedMax, Integer axisMax, String unit,
                                  String source, String version) {
    }

    public record MilestoneCatalogEntry(String key, String title, String description, String icon,
                                        String tier, Integer expectedAgeMinMonth,
                                        Integer expectedAgeMaxMonth, int sort) {
    }

    public List<GrowthStandard> findGrowthStandards(String metric, String gender) {
        return jdbc.query(
                """
                SELECT age_month, p3, p50, p97, source, version
                  FROM growth_standards
                 WHERE metric = ? AND gender = ?
                 ORDER BY age_month
                """,
                (rs, rowNum) -> new GrowthStandard(
                        rs.getInt("age_month"),
                        rs.getBigDecimal("p3"),
                        rs.getBigDecimal("p50"),
                        rs.getBigDecimal("p97"),
                        rs.getString("source"),
                        rs.getString("version")),
                metric, gender);
    }

    /**
     * 取覆盖指定月龄的喂养建议区间。
     *
     * <p>区间是 [min, max)，最后一档（24 月+）用闭区间兜底，避免超出种子范围时拿不到基准。
     */
    public Optional<FeedingStandard> findFeedingStandard(String kind, int ageMonth) {
        // 区间是 (min, max]：月龄作为参数参与比较，表里没有 age_month 这一列
        List<FeedingStandard> matches = jdbc.query(
                """
                SELECT age_month_min, age_month_max, recommended_min, recommended_max,
                       axis_max, unit, source, version
                  FROM feeding_standards
                 WHERE kind = ?
                   AND ? > age_month_min
                   AND ? <= age_month_max
                 ORDER BY age_month_min DESC
                 LIMIT 1
                """,
                (rs, rowNum) -> new FeedingStandard(
                        rs.getInt("age_month_min"),
                        rs.getInt("age_month_max"),
                        (Integer) rs.getObject("recommended_min"),
                        (Integer) rs.getObject("recommended_max"),
                        (Integer) rs.getObject("axis_max"),
                        rs.getString("unit"),
                        rs.getString("source"),
                        rs.getString("version")),
                kind, ageMonth, ageMonth);

        if (!matches.isEmpty()) {
            return Optional.of(matches.get(0));
        }

        // 月龄超出种子范围（比如 0 月龄或 2 岁以上）：取最近的一档，宁可粗略也不要没有基准
        return jdbc.query(
                """
                SELECT age_month_min, age_month_max, recommended_min, recommended_max,
                       axis_max, unit, source, version
                  FROM feeding_standards
                 WHERE kind = ?
                 ORDER BY abs((age_month_min + age_month_max) / 2 - ?)
                 LIMIT 1
                """,
                (rs, rowNum) -> new FeedingStandard(
                        rs.getInt("age_month_min"),
                        rs.getInt("age_month_max"),
                        (Integer) rs.getObject("recommended_min"),
                        (Integer) rs.getObject("recommended_max"),
                        (Integer) rs.getObject("axis_max"),
                        rs.getString("unit"),
                        rs.getString("source"),
                        rs.getString("version")),
                kind, ageMonth).stream().findFirst();
    }

    public List<MilestoneCatalogEntry> findMilestoneCatalog() {
        return jdbc.query(
                """
                SELECT key, title, description, icon, tier,
                       expected_age_min_month, expected_age_max_month, sort
                  FROM milestone_catalog
                 ORDER BY sort
                """,
                (rs, rowNum) -> new MilestoneCatalogEntry(
                        rs.getString("key"),
                        rs.getString("title"),
                        rs.getString("description"),
                        rs.getString("icon"),
                        rs.getString("tier"),
                        (Integer) rs.getObject("expected_age_min_month"),
                        (Integer) rs.getObject("expected_age_max_month"),
                        rs.getInt("sort")));
    }
}
