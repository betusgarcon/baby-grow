package com.babygrow.backend.api;

import com.babygrow.backend.ai.AiClient;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.common.ErrorCode;
import com.babygrow.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import org.mockito.ArgumentCaptor;
import static org.mockito.Mockito.when;

/** AI 相关接口用桩替换 Python 服务：验证转发、异步任务与失败处理，不依赖真实模型。 */
class AiProxyApiTest extends IntegrationTestBase {

    private static final String ONE_PIXEL_PNG =
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

    @MockBean
    private AiClient aiClient;

    @TempDir
    Path temp;

    private Path png() throws IOException {
        Path file = temp.resolve("recognize.png");
        Files.write(file, Base64.getDecoder().decode(ONE_PIXEL_PNG));
        return file;
    }

    @Test
    void extractForwardsToAiAndReturnsPayload() {
        String token = login();
        createFiveMonthFamily(token);

        // 显式 Map：深层嵌套的 Map.of 会让 javac 在推断失败时打印巨大的类型而 OOM
        Map<String, Object> milestone = new java.util.HashMap<>();
        milestone.put("type", "运动");
        milestone.put("event", "首次翻身");
        milestone.put("is_first", true);

        Map<String, Object> data = new java.util.HashMap<>();
        data.put("milestones", List.of(milestone));

        Map<String, Object> aiResponse = new java.util.HashMap<>();
        aiResponse.put("status", "ok");
        aiResponse.put("data", data);
        aiResponse.put("raw_text", "今天第一次翻身");
        aiResponse.put("confidence", 0.9);
        aiResponse.put("model_name", "stub");
        aiResponse.put("elapsed_ms", 12);

        when(aiClient.extractText(anyLong(), anyInt(), eq("今天第一次翻身")))
                .thenReturn(aiResponse);

        TestResponse response = post("/api/baby/records/extract",
                Map.of("text", "今天第一次翻身"), token);
        assertThat(response.status()).as(response.message()).isEqualTo(200);
        assertThat(response.data().path("status").asText()).isEqualTo("ok");
        assertThat(response.data().path("data").path("milestones").size()).isEqualTo(1);
    }

    @Test
    void extractRejectsBlankText() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse response = post("/api/baby/records/extract", Map.of("text", " "), token);
        assertThat(response.status()).isEqualTo(400);
    }

    @Test
    void extractFailureReturnsUpstreamUnavailable() {
        String token = login();
        createFiveMonthFamily(token);

        when(aiClient.extractText(anyLong(), anyInt(), anyString()))
                .thenThrow(new BizException(ErrorCode.UPSTREAM_UNAVAILABLE, "stub down"));

        TestResponse response = post("/api/baby/records/extract", Map.of("text", "记录"), token);
        assertThat(response.status()).isEqualTo(503);
    }

    @Test
    void recognizeRunsAsyncAndPollReturnsResult() throws Exception {
        String token = login();
        createFiveMonthFamily(token);
        long mediaId = upload(token, png()).data().path("mediaId").asLong();

        Map<String, Object> mood = new java.util.HashMap<>();
        mood.put("mood", "开心");
        Map<String, Object> mediaData = new java.util.HashMap<>();
        mediaData.put("mood", List.of(mood));

        Map<String, Object> mediaResponse = new java.util.HashMap<>();
        mediaResponse.put("status", "ok");
        mediaResponse.put("data", mediaData);
        mediaResponse.put("model_name", "stub");
        mediaResponse.put("elapsed_ms", 5);

        when(aiClient.extractMedia(anyLong(), anyInt(), anyString(), any(), anyString(), any()))
                .thenReturn(mediaResponse);

        TestResponse submitted = post("/api/baby/records/recognize",
                Map.of("mediaId", mediaId, "sourceType", "IMAGE"), token);
        assertThat(submitted.status()).as(submitted.message()).isEqualTo(200);

        long taskId = submitted.data().path("taskId").asLong();
        var task = pollUntilFinished(token, taskId);
        assertThat(task.path("status").asText()).isEqualTo("succeeded");
        assertThat(task.path("result").path("status").asText()).isEqualTo("ok");
    }

    @Test
    void recognizeFailureMarksTaskFailed() throws Exception {
        String token = login();
        createFiveMonthFamily(token);
        long mediaId = upload(token, png()).data().path("mediaId").asLong();

        when(aiClient.extractMedia(anyLong(), anyInt(), anyString(), any(), anyString(), any()))
                .thenThrow(new RuntimeException("model crashed"));

        TestResponse submitted = post("/api/baby/records/recognize",
                Map.of("mediaId", mediaId, "sourceType", "IMAGE"), token);
        long taskId = submitted.data().path("taskId").asLong();

        var task = pollUntilFinished(token, taskId);
        assertThat(task.path("status").asText()).isEqualTo("failed");
        assertThat(task.path("error").asText()).contains("model crashed");
    }

    @Test
    void recognizeRejectsAnotherUsersMedia() throws IOException {
        String owner = login();
        createFiveMonthFamily(owner);
        long mediaId = upload(owner, png()).data().path("mediaId").asLong();

        long otherUser = insertUser("ai-other-" + System.nanoTime());
        String otherToken = tokenFor(otherUser);
        createFiveMonthFamily(otherToken);

        TestResponse response = post("/api/baby/records/recognize",
                Map.of("mediaId", mediaId, "sourceType", "IMAGE"), otherToken);
        assertThat(response.status()).isEqualTo(403);
    }

    @Test
    void recipeRecommendationInjectsBabyProfile() {
        String token = login();
        createFiveMonthFamily(token);

        when(aiClient.post(eq("/api/baby/recipes/recommend"), any()))
                .thenReturn(Map.of("status", "ok", "items", List.of(), "reason", "stub"));

        TestResponse response = post("/api/baby/recipes/recommend", Map.of(
                "query", "今天吃什么",
                "allergens", List.of("鸡蛋")), token);
        assertThat(response.status()).as(response.message()).isEqualTo(200);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(aiClient).post(eq("/api/baby/recipes/recommend"), captor.capture());
        Map<String, Object> payload = captor.getValue();

        assertThat(payload.get("baby_id")).isNotNull();
        assertThat(payload.get("baby_age_months")).isEqualTo(5);
        assertThat(payload.get("population")).isEqualTo("baby");
        assertThat(payload.get("allergens")).isEqualTo(List.of("鸡蛋"));
        assertThat(payload.get("query")).isEqualTo("今天吃什么");
    }

    private com.fasterxml.jackson.databind.JsonNode pollUntilFinished(String token, long taskId)
            throws InterruptedException {
        for (int attempt = 0; attempt < 40; attempt++) {
            TestResponse poll = get("/api/baby/ai-tasks/" + taskId, token);
            String status = poll.data().path("status").asText();
            if ("succeeded".equals(status) || "failed".equals(status)) {
                return poll.data();
            }
            Thread.sleep(100);
        }
        throw new AssertionError("AI 任务在 4 秒内没有结束");
    }
}
