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

class ProfileMediaApiTest extends IntegrationTestBase {

    private static final String ONE_PIXEL_PNG =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    @TempDir
    Path temp;

    private Path pngFile() throws IOException {
        Path file = temp.resolve("avatar.png");
        Files.write(file, Base64.getDecoder().decode(ONE_PIXEL_PNG));
        return file;
    }

    @Test
    void profileAndDetail() {
        String token = login();
        long familyId = createFiveMonthFamily(token);

        TestResponse profile = get("/api/baby/profile", token);
        assertThat(profile.status()).isEqualTo(200);
        assertThat(profile.data().path("profile").path("name").asText()).isEqualTo("测试宝宝");
        assertThat(profile.data().path("profile").path("ageLabel").asText()).isNotBlank();
        assertThat(profile.data().path("profile").path("id").asLong()).isEqualTo(babyId(familyId));

        TestResponse detail = get("/api/baby/profile-detail", token);
        assertThat(detail.status()).isEqualTo(200);
        assertThat(detail.data().path("info").isArray()).isTrue();
        assertThat(detail.data().path("info").size()).isEqualTo(3);
        assertThat(detail.data().path("preferences").isArray()).isTrue();
    }

    @Test
    void updateProfileFields() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse updated = put("/api/baby/profile-detail", Map.of(
                "name", "小满",
                "birthday", LocalDate.now().minusMonths(5).toString(),
                "info", List.of(
                        Map.of("key", "gender", "value", "Boy"),
                        Map.of("key", "constellation", "value", "Leo")),
                "preferences", List.of(
                        Map.of("icon", "profile-toy", "label", "Favorite Toy", "value", "Blocks"))), token);

        assertThat(updated.status()).as(updated.message()).isEqualTo(200);
        assertThat(updated.data().path("name").asText()).isEqualTo("小满");
        assertThat(updated.data().path("preferences").size()).isEqualTo(1);

        TestResponse detail = get("/api/baby/profile-detail", token);
        String gender = detail.data().path("info").get(1).path("value").asText();
        assertThat(gender).isEqualTo("Boy");
    }

    @Test
    void invalidBirthdayIsRejected() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse response = put("/api/baby/profile-detail",
                Map.of("birthday", "2026-13-40"), token);
        assertThat(response.status()).isEqualTo(400);
        assertThat(response.message()).contains("YYYY-MM-DD");
    }

    @Test
    void avatarMustComeFromOwnUpload() throws IOException {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse upload = upload(token, pngFile());
        assertThat(upload.status()).as(upload.message()).isEqualTo(200);
        String url = upload.data().path("url").asText();
        assertThat(url).contains("/api/media/");

        TestResponse updated = put("/api/baby/profile-detail",
                Map.of("avatarUrl", url), token);
        assertThat(updated.status()).isEqualTo(200);

        TestResponse profile = get("/api/baby/profile", token);
        assertThat(profile.data().path("profile").path("avatar").asText()).isEqualTo(url);

        // 另一个账号不能把别人的图设成自己的头像
        long otherUser = insertUser("avatar-other-" + System.nanoTime());
        String otherToken = tokenFor(otherUser);
        createFiveMonthFamily(otherToken);

        TestResponse denied = put("/api/baby/profile-detail",
                Map.of("avatarUrl", url), otherToken);
        assertThat(denied.status()).isEqualTo(400);
        assertThat(denied.message()).contains("上传");
    }

    @Test
    void uploadIsReadableWithoutToken() throws IOException {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse upload = upload(token, pngFile());
        String url = upload.data().path("url").asText();
        String objectKey = url.substring(url.indexOf("/api/media/") + "/api/media/".length());

        TestResponse read = get("/api/media/" + objectKey, null);
        assertThat(read.status()).isEqualTo(200);
        assertThat(read.headers().getContentType().toString()).startsWith("image/");
    }

    @Test
    void unsupportedFileTypeIsRejected() throws IOException {
        String token = login();
        createFiveMonthFamily(token);

        Path text = temp.resolve("note.txt");
        Files.writeString(text, "not an image");

        TestResponse response = upload(token, text);
        assertThat(response.status()).isEqualTo(400);
        assertThat(response.message()).contains("不支持");
    }

    @Test
    void anotherUsersMediaCannotBeCommitted() throws IOException {
        String owner = login();
        createFiveMonthFamily(owner);
        TestResponse upload = upload(owner, pngFile());
        long mediaId = upload.data().path("mediaId").asLong();

        long otherUser = insertUser("media-other-" + System.nanoTime());
        String otherToken = tokenFor(otherUser);
        createFiveMonthFamily(otherToken);

        TestResponse commit = post("/api/baby/records/commit", Map.of(
                "source", "MANUAL",
                "mediaId", mediaId,
                "occurredAt", java.time.Instant.now().toString(),
                "title", "偷用别人的图",
                "milestones", List.of()), otherToken);

        assertThat(commit.status()).isEqualTo(403);
    }
}
