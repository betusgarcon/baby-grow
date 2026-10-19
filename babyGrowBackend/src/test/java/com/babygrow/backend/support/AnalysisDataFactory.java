package com.babygrow.backend.support;

import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * 5 月龄宝宝的分析数据集。
 *
 * <p>直接写入投影表：这些表本来就是 records 的派生读模型，只读接口的用例不需要
 * 为了造数据把几百次 commit 都走一遍。写入链路本身由 RecordApiTest 覆盖。
 *
 * <p>数据覆盖出生至今 150 天：每周一次生长测量、每天 4 次奶、4.5 月龄起辅食、
 * 每天夜觉 + 2 次小睡、120 天情绪、5 个里程碑。
 */
public class AnalysisDataFactory {

    private static final ZoneId ZONE = ZoneId.systemDefault();

    private static final String[][] SOLIDS = {
            {"南瓜泥", "蔬菜"}, {"米粉", "谷物"}, {"蛋黄泥", "蛋类"}, {"苹果泥", "水果"},
            {"红薯泥", "蔬菜"}, {"西兰花泥", "蔬菜"}, {"鸡肉泥", "肉类"}, {"小米粥", "谷物"},
    };

    private final JdbcTemplate jdbc;
    private final long babyId;
    private final LocalDate birthday;

    public AnalysisDataFactory(JdbcTemplate jdbc, long babyId) {
        this.jdbc = jdbc;
        this.babyId = babyId;
        this.birthday = jdbc.queryForObject(
                "SELECT birthday FROM babies WHERE id = ?", LocalDate.class, babyId);
    }

    /** 一次性灌满所有分析域，返回覆盖天数 */
    public int seedAll() {
        int days = 150;
        seedFeedings(days);
        seedSleep(days);
        seedGrowth();
        seedMood(120);
        seedMilestones();
        return days;
    }

    public void seedFeedings(int days) {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = new ArrayList<>();

        for (int ago = days - 1; ago >= 0; ago--) {
            LocalDate date = today.minusDays(ago);

            int total = 760 + (days - ago) / 3;
            int perFeed = total / 4;
            int[] hours = {8, 11, 15, 19};
            for (int hour : hours) {
                rows.add(new Object[]{
                        babyId, ts(date.atTime(hour, 0)), "milk", null, null, perFeed, false});
            }

            // 4.5 月龄开始辅食：从第 120 天起每天一顿
            if (ago <= 120) {
                String[] food = SOLIDS[(120 - ago) % SOLIDS.length];
                boolean first = (120 - ago) < SOLIDS.length;
                rows.add(new Object[]{
                        babyId, ts(date.atTime(12, 30)), "solid", food[0], food[1], null, first});
            }
        }

        jdbc.batchUpdate("""
                INSERT INTO feedings (baby_id, occurred_at, kind, food_name, food_category, amount_ml, is_first)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, rows);
    }

    public void seedSleep(int days) {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = new ArrayList<>();

        for (int ago = days - 1; ago >= 0; ago--) {
            LocalDate date = today.minusDays(ago);
            rows.add(sleepRow(date.atTime(20, 0), 570 + (ago % 5) * 15, "night"));
            rows.add(sleepRow(date.plusDays(1).atTime(9, 30), 75, "nap"));
            rows.add(sleepRow(date.plusDays(1).atTime(14, 0), 80, "nap"));
        }

        jdbc.batchUpdate("""
                INSERT INTO sleep_sessions (baby_id, start_at, end_at, duration_min, session_type, quality)
                VALUES (?, ?, ?, ?, ?, ?)
                """, rows);
    }

    private Object[] sleepRow(java.time.LocalDateTime start, int minutes, String type) {
        Instant from = start.atZone(ZONE).toInstant();
        return new Object[]{
                babyId, Timestamp.from(from), Timestamp.from(from.plusSeconds(minutes * 60L)),
                minutes, type, "好"};
    }

    public void seedGrowth() {
        List<Object[]> rows = new ArrayList<>();
        int months = 5;

        for (int month = 0; month <= months; month++) {
            for (int week = 0; week < 4; week++) {
                LocalDate date = birthday.plusMonths(month).plusWeeks(week);
                if (date.isAfter(LocalDate.now())) {
                    continue;
                }
                double age = month + week / 4.0;
                rows.add(new Object[]{
                        babyId, ts(date.atTime(9, 0)),
                        BigDecimal.valueOf(50 + age * 3.2).setScale(2, java.math.RoundingMode.HALF_UP),
                        BigDecimal.valueOf(3.3 + age * 0.6).setScale(3, java.math.RoundingMode.HALF_UP),
                        BigDecimal.valueOf(35 + age * 1.1).setScale(2, java.math.RoundingMode.HALF_UP)});
            }
        }

        jdbc.batchUpdate("""
                INSERT INTO growth_measurements (baby_id, measured_at, height_cm, weight_kg, head_cm)
                VALUES (?, ?, ?, ?, ?)
                """, rows);
    }

    public void seedMood(int days) {
        LocalDate today = LocalDate.now();
        List<Object[]> rows = new ArrayList<>();

        for (int ago = days - 1; ago >= 0; ago--) {
            LocalDate date = today.minusDays(ago);
            // 每 20 天里造一段连续 4 天的黏人/不适，用来验证高亮
            int phase = ago % 20;
            String mood;
            // 必须是同一种情绪连续 ≥3 天，markPatterns 才会高亮
            mood = phase >= 4 && phase <= 7 ? "clingy" : "happy";
            rows.add(new Object[]{babyId, ts(date.atTime(10, 0)), mood});
        }

        jdbc.batchUpdate("""
                INSERT INTO mood_entries (baby_id, occurred_at, mood) VALUES (?, ?, ?)
                """, rows);
    }

    public void seedMilestones() {
        List<Object[]> rows = List.of(
                milestone("first_smile", "第一次微笑", "社交", 110, "silver"),
                milestone("head_control", "抬头稳定", "运动", 95, "silver"),
                milestone("roll_over", "学会翻身", "运动", 45, "gold"),
                milestone("reach_grasp", "主动抓握", "运动", 30, "silver"),
                milestone("sit_supported", "扶坐", "运动", 2, "silver"));

        jdbc.batchUpdate("""
                INSERT INTO baby_milestones
                    (baby_id, milestone_key, title, description, unlocked_at, tier, type, icon)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'star')
                """, rows);
    }

    private Object[] milestone(String key, String title, String type, int daysAgo, String tier) {
        return new Object[]{
                babyId, key, title, title, ts(LocalDate.now().minusDays(daysAgo).atTime(10, 0)), tier, type};
    }

    public void seedTimeline(int count) {
        List<Object[]> rows = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (int index = 0; index < count; index++) {
            LocalDate date = today.minusDays(index / 3L);
            String filter = index % 3 == 0 ? "health" : index % 3 == 1 ? "photos" : "milestones";
            rows.add(new Object[]{
                    babyId, date, "memory", filter, "10:00", "LOG",
                    "记录 " + index, "description " + index, date.atTime(10, 0).atZone(ZONE).toInstant().toEpochMilli()});
        }

        jdbc.batchUpdate("""
                INSERT INTO timeline_entries
                    (baby_id, date, type, filter_key, time, badge, title, description, sort_key)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, rows);
    }

    private static Timestamp ts(java.time.LocalDateTime time) {
        return Timestamp.from(time.atZone(ZONE).toInstant());
    }
}
