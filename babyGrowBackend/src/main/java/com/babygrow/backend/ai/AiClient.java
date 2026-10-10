package com.babygrow.backend.ai;

import com.babygrow.backend.common.BizException;
import com.babygrow.backend.common.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * 与 Python AI 服务通信的唯一出口。
 *
 * <p>AI 服务只在内网可达，前端不直连（见 docs/backend-design.md §1.2）。业务数据一律
 * 随请求传入，AI 侧不读业务库。
 */
@Component
public class AiClient {

    private static final Logger log = LoggerFactory.getLogger(AiClient.class);

    /** 转发图片的上限。base64 会膨胀约 1/3，再大就该走对象存储直传而不是塞进请求体 */
    private static final int MAX_MEDIA_BYTES = 10 * 1024 * 1024;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public AiClient(@Value("${ai.service.url}") String aiServiceUrl,
                    RestClient.Builder builder,
                    ObjectMapper objectMapper) {
        this.restClient = builder.baseUrl(aiServiceUrl).build();
        this.objectMapper = objectMapper;
    }

    /** 原样转发，供不需要注入业务上下文的情形使用 */
    @SuppressWarnings("rawtypes")
    public Map post(String path, Map<String, Object> body) {
        try {
            Map response = restClient.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            if (response == null) {
                throw new BizException(ErrorCode.UPSTREAM_UNAVAILABLE, "AI 服务返回空响应");
            }
            return response;
        } catch (BizException ex) {
            throw ex;
        } catch (RestClientResponseException ex) {
            // Python 侧用 HTTPException(detail=...) 报错，detail 才是对用户有意义的
            // 那句话；不提取的话前端只会看到一句笼统的「AI 服务不可用」
            throw new BizException(ErrorCode.UPSTREAM_UNAVAILABLE, extractDetail(ex));
        } catch (Exception ex) {
            log.error("调用 AI 服务失败 path={}", path, ex);
            throw new BizException(ErrorCode.UPSTREAM_UNAVAILABLE, "AI 服务不可用：" + ex.getMessage());
        }
    }

    private String extractDetail(RestClientResponseException ex) {
        try {
            JsonNode body = objectMapper.readTree(ex.getResponseBodyAsString());
            JsonNode detail = body.get("detail");
            if (detail != null && !detail.isNull()) {
                return detail.asText();
            }
        } catch (Exception ignored) {
            // 响应体不是 JSON，退回状态码
        }
        return "AI 服务返回 " + ex.getStatusCode().value();
    }

    /** 文本识别：同步，预期 5s 内返回 */
    public Map<String, Object> extractText(Long babyId, int ageMonths, String text) {
        Map<String, Object> body = baseBody(babyId, ageMonths);
        body.put("text", text);
        body.put("source_type", "TEXT");
        return post("/api/baby/records/extract", body);
    }

    /**
     * 媒体识别：同步调用，但由异步任务线程发起，用户不等。
     *
     * <p>图片以 base64 随请求传入，而不是给 URL 让 AI 去拉——AI 服务连不到业务库，
     * 也没有用户 token，共享文件系统又会让部署耦合。传字节最直接，代价是带宽。
     */
    public Map<String, Object> extractMedia(Long babyId, int ageMonths, String sourceType,
                                            byte[] content, String mime, String note) {
        if (content.length > MAX_MEDIA_BYTES) {
            throw BizException.badRequest("媒体文件过大（上限 " + (MAX_MEDIA_BYTES / 1024 / 1024) + "MB）");
        }

        Map<String, Object> body = baseBody(babyId, ageMonths);
        body.put("text", note == null ? "" : note);
        body.put("source_type", sourceType);
        body.put("media_mime", mime);
        body.put("media_base64", Base64.getEncoder().encodeToString(content));
        return post("/api/baby/records/extract", body);
    }

    private static Map<String, Object> baseBody(Long babyId, int ageMonths) {
        Map<String, Object> body = new HashMap<>();
        body.put("baby_id", String.valueOf(babyId));
        body.put("baby_age_months", ageMonths);
        body.put("population", "baby");
        return body;
    }
}
