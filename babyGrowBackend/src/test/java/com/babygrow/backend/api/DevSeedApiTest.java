package com.babygrow.backend.api;

import com.babygrow.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DevSeedApiTest extends IntegrationTestBase {

    @Test
    void seedCreatesFiveMonthsOfDataAndIsRepeatable() {
        String token = login();

        TestResponse first = post("/api/dev/seed",
                Map.of("days", 150, "ageMonths", 5, "reset", true), token);
        assertThat(first.status()).as(first.message()).isEqualTo(200);
        assertThat(first.data().path("ageMonths").asInt()).isEqualTo(5);
        assertThat(first.data().path("timelineEntries").asInt()).isEqualTo(450);
        assertThat(first.data().path("memories").asInt()).isEqualTo(40);
        assertThat(first.data().path("wishes").asInt()).isEqualTo(2);
        assertThat(first.data().path("milestones").asInt()).isEqualTo(5);
        assertThat(first.data().path("growthMeasurements").asInt()).isGreaterThan(15);

        TestResponse profile = get("/api/baby/profile", token);
        assertThat(profile.data().path("profile").path("name").asText()).isEqualTo("小满");
        assertThat(profile.data().path("profile").path("ageLabel").asText()).isNotBlank();

        TestResponse growth = get("/api/baby/growth", token);
        assertThat(growth.data().path("hasData").asBoolean()).isTrue();
        assertThat(growth.data().path("trends").path("birth").path("weight").path("points").size())
                .isGreaterThan(10);

        TestResponse timeline = get("/api/baby/timeline?limit=20", token);
        assertThat(timeline.data().path("items").size()).isEqualTo(20);
        assertThat(timeline.data().path("hasMore").asBoolean()).isTrue();

        TestResponse memories = get("/api/family/memories?limit=20", token);
        assertThat(memories.data().path("items").size()).isEqualTo(20);
        assertThat(memories.data().path("hasMore").asBoolean()).isTrue();

        TestResponse wishes = get("/api/wishes", token);
        assertThat(wishes.data().size()).isEqualTo(2);

        // 再灌一次：清空后重建，数量不能翻倍
        TestResponse second = post("/api/dev/seed",
                Map.of("days", 150, "ageMonths", 5, "reset", true), token);
        assertThat(second.status()).isEqualTo(200);
        assertThat(second.data().path("timelineEntries").asInt()).isEqualTo(450);
        assertThat(second.data().path("memories").asInt()).isEqualTo(40);
    }

    @Test
    void seedUsesExplicitSmallerVolume() {
        String token = login();

        TestResponse response = post("/api/dev/seed",
                Map.of("days", 30, "ageMonths", 4, "timelineCount", 30, "memories", 5, "reset", true),
                token);
        assertThat(response.status()).as(response.message()).isEqualTo(200);
        assertThat(response.data().path("timelineEntries").asInt()).isEqualTo(30);
        assertThat(response.data().path("memories").asInt()).isEqualTo(5);
    }
}
