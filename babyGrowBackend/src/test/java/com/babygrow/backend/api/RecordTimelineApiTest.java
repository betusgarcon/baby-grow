package com.babygrow.backend.api;

import com.babygrow.backend.demo.DevSeedService;
import org.springframework.beans.factory.annotation.Autowired;
import com.babygrow.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RecordTimelineApiTest extends IntegrationTestBase {

    @Autowired
    private DevSeedService seedService;

    private Map<String, Object> fullRecord() {
        Map<String, Object> body = new HashMap<>();
        body.put("source", "MANUAL");
        body.put("occurredAt", Instant.now().toString());
        body.put("title", "今天的记录");
        body.put("description", "精神状态不错");
        body.put("milestones", List.of(Map.of("type", "运动", "event", "首次翻身", "isFirst", true)));
        body.put("food", List.of(Map.of("name", "苹果泥", "category", "水果", "isFirst", true)));
        body.put("milk", List.of(Map.of("type", "配方奶", "amountMl", 180, "period", "上午")));
        body.put("sleep", List.of(Map.of("durationMin", 90, "quality", "好")));
        body.put("mood", List.of(Map.of("mood", "开心")));
        body.put("growth", List.of(Map.of("heightCm", 66.5, "weightKg", 7.4, "headCm", 42.1)));
        return body;
    }

    @Test
    void commitWritesTimelineAndProjections() {
        String token = login();
        long familyId = createFiveMonthFamily(token);

        TestResponse commit = post("/api/baby/records/commit", fullRecord(), token);
        assertThat(commit.status()).as(commit.message()).isEqualTo(200);
        assertThat(commit.data().path("title").asText()).isEqualTo("今天的记录");
        assertThat(commit.data().path("type").asText()).isEqualTo("memory");

        long id = babyId(familyId);
        assertThat(count("feedings", id)).isEqualTo(2);
        assertThat(count("sleep_sessions", id)).isEqualTo(1);
        assertThat(count("growth_measurements", id)).isEqualTo(1);
        assertThat(count("mood_entries", id)).isEqualTo(1);
        assertThat(count("baby_milestones", id)).isEqualTo(1);
        assertThat(count("timeline_entries", id)).isEqualTo(1);

        TestResponse timeline = get("/api/baby/timeline", token);
        assertThat(timeline.status()).isEqualTo(200);
        assertThat(timeline.data().path("items").size()).isEqualTo(1);
        assertThat(timeline.data().path("items").get(0).path("title").asText()).isEqualTo("今天的记录");
    }

    @Test
    void appendTimelineRequiresTitle() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse missing = post("/api/baby/timeline", Map.of(
                "date", LocalDate.now().toString(),
                "time", "10:00"), token);
        assertThat(missing.status()).isEqualTo(400);

        TestResponse ok = post("/api/baby/timeline", Map.of(
                "date", LocalDate.now().toString(),
                "type", "memory",
                "filterKey", "health",
                "time", "10:00",
                "title", "手工记录"), token);
        assertThat(ok.status()).as(ok.message()).isEqualTo(200);
        assertThat(ok.data().path("title").asText()).isEqualTo("手工记录");
    }

    @Test
    void invalidOccurredAtIsRejected() {
        String token = login();
        createFiveMonthFamily(token);

        Map<String, Object> body = new HashMap<>();
        body.put("source", "MANUAL");
        body.put("occurredAt", "not-a-time");
        body.put("title", "坏时间");

        TestResponse response = post("/api/baby/records/commit", body, token);
        assertThat(response.status()).isEqualTo(400);
    }

    @Test
    void timelinePaginationAndFilters() {
        String token = login();
        long familyId = createFiveMonthFamily(token);
        seedService.seedTimeline(babyId(familyId), 12);

        YearMonth month = YearMonth.now();
        TestResponse first = get("/api/baby/timeline?limit=5&month=" + month, token);
        assertThat(first.status()).isEqualTo(200);
        assertThat(first.data().path("items").size()).isEqualTo(5);
        assertThat(first.data().path("hasMore").asBoolean()).isTrue();
        assertThat(first.data().path("nextCursor").asText()).isNotBlank();

        String cursor = first.data().path("nextCursor").asText();
        TestResponse second = get("/api/baby/timeline?limit=5&cursor=" + cursor, token);
        assertThat(second.status()).isEqualTo(200);
        assertThat(second.data().path("items").size()).isEqualTo(5);

        // 两页之间不能重复
        String firstIds = first.data().path("items").toString();
        for (var item : second.data().path("items")) {
            assertThat(firstIds).doesNotContain("\"id\":\"" + item.path("id").asText() + "\"");
        }

        TestResponse filtered = get("/api/baby/timeline?limit=20&filter=photos", token);
        for (var item : filtered.data().path("items")) {
            assertThat(item.path("filterKey").asText()).isEqualTo("photos");
        }

        TestResponse invalid = get("/api/baby/timeline?limit=5&filter=nope", token);
        assertThat(invalid.status()).isEqualTo(400);
    }

    @Test
    void committingFoodInvalidatesTodaysMenu() {
        String token = login();
        long familyId = createFiveMonthFamily(token);
        long id = babyId(familyId);

        jdbc.update("""
                INSERT INTO daily_recommendations (baby_id, date, language, status, payload)
                VALUES (?, ?, 'zh', 'ready', '[]')
                """, id, LocalDate.now());

        TestResponse commit = post("/api/baby/records/commit", Map.of(
                "source", "MANUAL",
                "occurredAt", Instant.now().toString(),
                "food", List.of(Map.of("name", "香蕉泥", "category", "水果", "isFirst", true))), token);
        assertThat(commit.status()).isEqualTo(200);

        Integer invalidated = jdbc.queryForObject("""
                SELECT COUNT(*) FROM daily_recommendations
                 WHERE baby_id = ? AND invalidated_at IS NOT NULL
                """, Integer.class, id);
        assertThat(invalidated).isEqualTo(1);
    }

    @Test
    void rebuildProjectionsRestoresDerivedTables() {
        String token = login();
        long familyId = createFiveMonthFamily(token);
        long id = babyId(familyId);

        assertThat(post("/api/baby/records/commit", fullRecord(), token).status()).isEqualTo(200);
        assertThat(count("feedings", id)).isEqualTo(2);

        // 模拟投影丢失：图表有记录来源、但投影表为空
        jdbc.update("DELETE FROM feedings WHERE baby_id = ?", id);
        jdbc.update("DELETE FROM sleep_sessions WHERE baby_id = ?", id);
        jdbc.update("DELETE FROM growth_measurements WHERE baby_id = ?", id);
        jdbc.update("DELETE FROM mood_entries WHERE baby_id = ?", id);
        jdbc.update("DELETE FROM baby_milestones WHERE baby_id = ?", id);

        TestResponse rebuilt = post("/api/baby/projections/rebuild", null, token);
        assertThat(rebuilt.status()).as(rebuilt.message()).isEqualTo(200);
        assertThat(rebuilt.data().path("records").asInt()).isEqualTo(6);

        assertThat(count("feedings", id)).isEqualTo(2);
        assertThat(count("sleep_sessions", id)).isEqualTo(1);
        assertThat(count("growth_measurements", id)).isEqualTo(1);
        assertThat(count("mood_entries", id)).isEqualTo(1);
        assertThat(count("baby_milestones", id)).isEqualTo(1);
    }

    private int count(String table, long babyId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE baby_id = ?",
                Integer.class, babyId);
    }
}
