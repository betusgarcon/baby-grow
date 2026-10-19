package com.babygrow.backend.api;

import com.babygrow.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** 跨家庭隔离与只读角色的写权限。 */
class AuthorizationApiTest extends IntegrationTestBase {

    @Test
    void viewerCannotWriteAnything() {
        String admin = login();
        createFiveMonthFamily(admin);
        String viewer = inviteAndAccept(admin, "viewer");

        assertThat(put("/api/baby/profile-detail", Map.of("name", "改名"), viewer).status())
                .isEqualTo(403);

        assertThat(post("/api/baby/records/commit", Map.of(
                "source", "MANUAL",
                "occurredAt", Instant.now().toString(),
                "title", "只读提交"), viewer).status()).isEqualTo(403);

        assertThat(post("/api/wishes", Map.of("title", "只读心愿"), viewer).status())
                .isEqualTo(403);

        assertThat(put("/api/baby/vaccine", Map.of("title", "Vaccine: HepB"), viewer).status())
                .isEqualTo(403);

        assertThat(post("/api/family/memories", Map.of(
                "category", "Milestone",
                "title", "只读记忆"), viewer).status()).isEqualTo(403);
    }

    @Test
    void contributorCanWrite() {
        String admin = login();
        createFiveMonthFamily(admin);
        String contributor = inviteAndAccept(admin, "contributor");

        TestResponse commit = post("/api/baby/records/commit", Map.of(
                "source", "MANUAL",
                "occurredAt", Instant.now().toString(),
                "title", "协作者提交",
                "milk", List.of(Map.of("type", "配方奶", "amountMl", 180))), contributor);
        assertThat(commit.status()).as(commit.message()).isEqualTo(200);

        TestResponse memory = post("/api/family/memories", Map.of(
                "category", "Milestone",
                "title", "协作者记忆",
                "date", java.time.LocalDate.now().toString()), contributor);
        assertThat(memory.status()).as(memory.message()).isEqualTo(200);
    }

    @Test
    void twoFamiliesDoNotSeeEachOtherData() {
        // 家庭 A
        String tokenA = login();
        long familyA = createFiveMonthFamily(tokenA);
        post("/api/baby/records/commit", Map.of(
                "source", "MANUAL",
                "occurredAt", Instant.now().toString(),
                "title", "A 家的记录"), tokenA);

        // 家庭 B：换一个账号
        long userB = insertUser("family-b-" + System.nanoTime());
        String tokenB = tokenFor(userB);
        long familyB = createFamily(tokenB, "B 宝宝", java.time.LocalDate.now().minusMonths(4));

        TestResponse timelineB = get("/api/baby/timeline", tokenB);
        assertThat(timelineB.status()).isEqualTo(200);
        assertThat(timelineB.data().path("items").size()).isZero();

        TestResponse profileB = get("/api/baby/profile", tokenB);
        assertThat(profileB.data().path("profile").path("name").asText()).isEqualTo("B 宝宝");

        assertThat(familyA).isNotEqualTo(familyB);
        assertThat(babyId(familyA)).isNotEqualTo(babyId(familyB));
    }

    @Test
    void unknownWishOperationsAreNotFound() {
        String token = login();
        createFiveMonthFamily(token);

        assertThat(put("/api/wishes/checklist",
                Map.of("id", "missing", "checklist", List.of()), token).status()).isEqualTo(404);

        assertThat(put("/api/wishes/counter",
                Map.of("id", "missing", "current", 1), token).status()).isEqualTo(404);

        assertThat(delete("/api/wishes", Map.of("id", "missing"), token).status()).isEqualTo(404);

        assertThat(post("/api/wishes/cover", Map.of("id", "missing"), token).status()).isEqualTo(404);
    }

    @Test
    void coverDisabledForExistingWish() {
        String token = login();
        createFiveMonthFamily(token);

        post("/api/wishes", Map.of(
                "id", "wish-cover",
                "title", "带图心愿",
                "kind", "checklist"), token);

        TestResponse response = post("/api/wishes/cover", Map.of("id", "wish-cover"), token);
        // 默认 WISH_COVER_ENABLED=false；开关打开时是 200 并进入 pending
        assertThat(response.status()).isIn(200, 400);
        if (response.status() == 400) {
            assertThat(response.message()).contains("未开启");
        }
    }
}
