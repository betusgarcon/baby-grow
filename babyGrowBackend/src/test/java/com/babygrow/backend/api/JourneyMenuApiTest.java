package com.babygrow.backend.api;

import com.babygrow.backend.support.AnalysisDataFactory;
import com.babygrow.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class JourneyMenuApiTest extends IntegrationTestBase {

    private String tokenWithData() {
        String token = login();
        long familyId = createFiveMonthFamily(token);
        new AnalysisDataFactory(jdbc, babyId(familyId)).seedAll();

        put("/api/baby/vaccine", Map.of(
                "title", "Vaccine: HepB",
                "datetime", "October 1, 2026 • 10:30 AM",
                "location", "Community Clinic",
                "administeredBy", "Dr. Chen",
                "doseLabel", "2nd of 3",
                "nextAppointment", "2026-11-01",
                "nextNote", "Reminder 24h before",
                "notes", "No fever"), token);

        return token;
    }

    @Test
    void milestonesListPaginatesAndFilters() {
        String token = tokenWithData();

        TestResponse first = get("/api/baby/milestones-list?limit=3", token);
        assertThat(first.status()).isEqualTo(200);
        assertThat(first.data().path("items").size()).isEqualTo(3);
        assertThat(first.data().path("hasMore").asBoolean()).isTrue();

        String cursor = first.data().path("nextCursor").asText();
        TestResponse second = get("/api/baby/milestones-list?limit=3&cursor=" + cursor, token);
        assertThat(second.status()).isEqualTo(200);
        assertThat(second.data().path("items").size()).isEqualTo(2);

        TestResponse keyword = get("/api/baby/milestones-list?limit=20&q=翻身", token);
        assertThat(keyword.data().path("items").size()).isEqualTo(1);
        assertThat(keyword.data().path("items").get(0).path("title").asText()).isEqualTo("学会翻身");

        TestResponse year = get("/api/baby/milestones-list?limit=20&year="
                + LocalDate.now().getYear(), token);
        assertThat(year.data().path("items").size()).isEqualTo(5);

        TestResponse none = get("/api/baby/milestones-list?limit=20&year=1999", token);
        assertThat(none.data().path("items").size()).isEqualTo(0);

        TestResponse en = get("/api/baby/milestones-list?limit=5", token, "en");
        assertThat(en.data().path("items").get(0).path("tags").get(0).path("label").asText())
                .isIn("Physical", "Social", "Speech", "Cognitive");
    }

    @Test
    void calendarAndWeeklyInsight() {
        String token = tokenWithData();

        TestResponse calendar = get("/api/baby/calendar-events", token);
        assertThat(calendar.status()).isEqualTo(200);
        assertThat(calendar.data().size()).isGreaterThanOrEqualTo(6);

        boolean hasVaccine = false;
        boolean hasMilestone = false;
        for (var event : calendar.data()) {
            if ("vaccine".equals(event.path("tone").asText())) hasVaccine = true;
            if ("milestone".equals(event.path("tone").asText())) hasMilestone = true;
        }
        assertThat(hasVaccine).isTrue();
        assertThat(hasMilestone).isTrue();

        TestResponse weekly = get("/api/baby/weekly-insight", token);
        assertThat(weekly.status()).isEqualTo(200);
        assertThat(weekly.data().path("metrics").size()).isEqualTo(2);
        assertThat(weekly.data().path("sleep").path("status").asText()).isNotBlank();
        assertThat(weekly.data().path("highlights").size()).isGreaterThanOrEqualTo(1);
        assertThat(weekly.data().path("advice").path("content").asText()).isNotBlank();
    }

    @Test
    void menuTodayReadsLanguageSpecificRows() {
        String token = login();
        long familyId = createFiveMonthFamily(token);
        long id = babyId(familyId);

        insertMenu(id, "zh", "午餐", "鸡肉南瓜粥");
        insertMenu(id, "en", "Lunch", "Chicken pumpkin porridge");

        TestResponse zh = get("/api/baby/menu/today", token, "zh");
        assertThat(zh.status()).isEqualTo(200);
        assertThat(zh.data().path("items").size()).isEqualTo(1);
        assertThat(zh.data().path("items").get(0).path("title").asText()).isEqualTo("鸡肉南瓜粥");

        TestResponse en = get("/api/baby/menu/today", token, "en");
        assertThat(en.status()).isEqualTo(200);
        assertThat(en.data().path("items").get(0).path("title").asText())
                .isEqualTo("Chicken pumpkin porridge");
    }

    @Test
    void posterIncludesTemplatesAndPrivacyToggles() {
        String token = tokenWithData();

        TestResponse poster = get("/api/family/poster", token);
        assertThat(poster.status()).isEqualTo(200);
        assertThat(poster.data().path("title").asText()).isNotBlank();
        assertThat(poster.data().path("body").asText()).isNotBlank();
        assertThat(poster.data().path("templates").size()).isEqualTo(3);
        assertThat(poster.data().path("toggles").size()).isEqualTo(2);
        assertThat(poster.data().path("toggles").get(0).path("key").asText()).isEqualTo("growth");
        assertThat(poster.data().path("toggles").get(1).path("key").asText()).isEqualTo("face");
    }

    private void insertMenu(long babyId, String language, String mealType, String title) {
        String payload = "[{\"id\":\"1\",\"mealType\":\"" + mealType + "\",\"title\":\"" + title
                + "\",\"description\":\"desc\",\"icon\":\"lunch\",\"bgColor\":\"bg-card\","
                + "\"sourceChunkIds\":[]}]";
        jdbc.update("""
                INSERT INTO daily_recommendations
                    (baby_id, date, language, status, payload, reason, generated_at)
                VALUES (?, ?, ?, 'ready', ?::jsonb, 'reason', NOW())
                """, babyId, LocalDate.now(), language, payload);
    }
}
