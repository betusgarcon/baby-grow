package com.babygrow.backend.api;

import com.babygrow.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class FamilyContentApiTest extends IntegrationTestBase {

    private static final String ONE_PIXEL_PNG =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    @TempDir
    Path temp;

    private Path png() throws IOException {
        Path file = temp.resolve("memory.png");
        Files.write(file, Base64.getDecoder().decode(ONE_PIXEL_PNG));
        return file;
    }

    @Test
    void wishChecklistAndCounterLifecycle() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse empty = get("/api/wishes", token);
        assertThat(empty.status()).isEqualTo(200);
        assertThat(empty.data().size()).isEqualTo(0);

        TestResponse checklist = post("/api/wishes", Map.of(
                "id", "wish-check",
                "title", "学会游泳",
                "kind", "checklist",
                "goal", 1,
                "checklistTitle", "游泳清单",
                "checklist", List.of(
                        Map.of("id", "i1", "title", "熟悉水性", "note", "", "done", false),
                        Map.of("id", "i2", "title", "练习换气", "note", "", "done", false))), token);
        assertThat(checklist.status()).as(checklist.message()).isEqualTo(200);
        assertThat(checklist.data().path("checklist").size()).isEqualTo(2);

        TestResponse counter = post("/api/wishes", Map.of(
                "id", "wish-count",
                "title", "读 100 本书",
                "kind", "counter",
                "goal", 100,
                "unitLabel", "本",
                "counter", Map.of("current", 2, "target", 100, "unit", "本")), token);
        assertThat(counter.status()).as(counter.message()).isEqualTo(200);
        assertThat(counter.data().path("counter").path("current").asInt()).isEqualTo(2);

        TestResponse updatedChecklist = put("/api/wishes/checklist", Map.of(
                "id", "wish-check",
                "checklist", List.of(
                        Map.of("id", "i1", "title", "熟悉水性", "note", "", "done", true),
                        Map.of("id", "i2", "title", "练习换气", "note", "", "done", false))), token);
        assertThat(updatedChecklist.status()).isEqualTo(200);
        assertThat(updatedChecklist.data().path("checklist").get(0).path("done").asBoolean()).isTrue();

        TestResponse updatedCounter = put("/api/wishes/counter",
                Map.of("id", "wish-count", "current", 5), token);
        assertThat(updatedCounter.status()).isEqualTo(200);
        assertThat(updatedCounter.data().path("counter").path("current").asInt()).isEqualTo(5);

        TestResponse removed = delete("/api/wishes", Map.of("id", "wish-check"), token);
        assertThat(removed.status()).isEqualTo(200);

        TestResponse list = get("/api/wishes", token);
        assertThat(list.data().size()).isEqualTo(1);
        assertThat(list.data().get(0).path("id").asText()).isEqualTo("wish-count");

        TestResponse invalid = post("/api/wishes", Map.of("title", " "), token);
        assertThat(invalid.status()).isEqualTo(400);
        assertThat(invalid.message()).contains("心愿");
    }

    @Test
    void memoryWithPhotoReturnsMediaUrlAndFilters() throws IOException {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse upload = upload(token, png());
        long mediaId = upload.data().path("mediaId").asLong();
        String mediaUrl = upload.data().path("url").asText();

        TestResponse withPhoto = post("/api/family/memories", Map.of(
                "category", "Milestone",
                "title", "第一次去公园",
                "date", LocalDate.now().toString(),
                "tone", "green",
                "tags", List.of("Milestone"),
                "media", "Media",
                "mediaId", mediaId), token);
        assertThat(withPhoto.status()).as(withPhoto.message()).isEqualTo(200);
        assertThat(withPhoto.data().path("mediaUrl").asText()).isEqualTo(mediaUrl);

        post("/api/family/memories", Map.of(
                "category", "Diet",
                "title", "第一次吃香蕉",
                "date", LocalDate.now().minusDays(1).toString(),
                "tone", "peach",
                "tags", List.of("Diet"),
                "media", "Text"), token);

        TestResponse first = get("/api/family/memories?limit=1", token);
        assertThat(first.status()).isEqualTo(200);
        assertThat(first.data().path("items").size()).isEqualTo(1);
        assertThat(first.data().path("hasMore").asBoolean()).isTrue();

        TestResponse second = get("/api/family/memories?limit=1&cursor="
                + first.data().path("nextCursor").asText(), token);
        assertThat(second.data().path("items").size()).isEqualTo(1);
        assertThat(second.data().path("items").get(0).path("title").asText()).isEqualTo("第一次吃香蕉");

        TestResponse photoOnly = get("/api/family/memories?limit=10&media=Media", token);
        assertThat(photoOnly.data().path("items").size()).isEqualTo(1);
        assertThat(photoOnly.data().path("items").get(0).path("title").asText()).isEqualTo("第一次去公园");

        TestResponse dietOnly = get("/api/family/memories?limit=10&category=Diet", token);
        assertThat(dietOnly.data().path("items").size()).isEqualTo(1);
        assertThat(dietOnly.data().path("items").get(0).path("title").asText()).isEqualTo("第一次吃香蕉");

        TestResponse keyword = get("/api/family/memories?limit=10&q=香蕉", token);
        assertThat(keyword.data().path("items").size()).isEqualTo(1);

        TestResponse poster = get("/api/family/poster", token);
        assertThat(poster.status()).isEqualTo(200);
        assertThat(poster.data().path("body").asText()).contains("第一次去公园");
    }

    @Test
    void memoryRejectsAnotherUsersMedia() throws IOException {
        String owner = login();
        createFiveMonthFamily(owner);
        long mediaId = upload(owner, png()).data().path("mediaId").asLong();

        long otherUser = insertUser("memory-media-other-" + System.nanoTime());
        String otherToken = tokenFor(otherUser);
        createFiveMonthFamily(otherToken);

        TestResponse response = post("/api/family/memories", Map.of(
                "category", "Milestone",
                "title", "挂别人的图",
                "date", LocalDate.now().toString(),
                "media", "Media",
                "mediaId", mediaId), otherToken);

        assertThat(response.status()).isEqualTo(403);
        assertThat(response.message()).contains("媒体");
    }

    @Test
    void memoryValidation() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse missingTitle = post("/api/family/memories", Map.of(
                "category", "Milestone",
                "title", " ",
                "date", LocalDate.now().toString()), token);
        assertThat(missingTitle.status()).isEqualTo(400);
        assertThat(missingTitle.message()).contains("标题");

        TestResponse longTitle = post("/api/family/memories", Map.of(
                "category", "Milestone",
                "title", "x".repeat(200),
                "date", LocalDate.now().toString()), token);
        assertThat(longTitle.status()).isEqualTo(400);
        assertThat(longTitle.message()).contains("128");
    }

    @Test
    void vaccineLifecycle() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse empty = get("/api/baby/vaccine", token);
        assertThat(empty.status()).isEqualTo(200);
        assertThat(empty.data().path("title").asText()).isEmpty();

        TestResponse updated = put("/api/baby/vaccine", Map.of(
                "title", "Vaccine: HepB",
                "datetime", "October 1, 2026 • 10:30 AM",
                "location", "Community Clinic",
                "administeredBy", "Dr. Chen",
                "doseLabel", "2nd of 3",
                "nextAppointment", "2026-11-01",
                "notes", "No fever"), token);
        assertThat(updated.status()).as(updated.message()).isEqualTo(200);
        assertThat(updated.data().path("title").asText()).contains("HepB");
        assertThat(updated.data().path("doseProgress").asDouble()).isBetween(0.6, 0.7);

        TestResponse read = get("/api/baby/vaccine", token);
        assertThat(read.data().path("location").asText()).isEqualTo("Community Clinic");
        assertThat(read.data().path("doseLabel").asText()).isEqualTo("2nd of 3");

        TestResponse badTime = put("/api/baby/vaccine",
                Map.of("datetime", "not-a-time"), token);
        assertThat(badTime.status()).isEqualTo(400);
        assertThat(badTime.message()).contains("时间");

        TestResponse deleted = delete("/api/baby/vaccine", null, token);
        assertThat(deleted.status()).isEqualTo(200);

        TestResponse afterDelete = get("/api/baby/vaccine", token);
        assertThat(afterDelete.data().path("title").asText()).isEmpty();
    }
}
