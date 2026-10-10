package com.babygrow.backend.controller;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.ai.AiClient;
import com.babygrow.backend.ai.AiDtos.ExtractRequest;
import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.profile.AgeLabelCalculator;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * 前端可直连的 AI 接口。
 *
 * <p>这一层不是纯粹的透传：**宝宝与月龄由服务端解析后注入**，客户端只提交内容本身。
 * 否则前端得知道内部 baby_id，且可以伪造别人的 id 去调用。
 *
 * <p>返回时把 AI 的原始响应体整体作为 {@code data} 包进统一响应包——Python 服务返回的
 * 是自己的结构（status/data/error 等），直接透传会让前端因 code 缺失而抛错。
 */
@RestController
@RequestMapping("/api/baby")
public class AiProxyController {

    private final AiClient aiClient;
    private final FamilyAccessService accessService;

    public AiProxyController(AiClient aiClient, FamilyAccessService accessService) {
        this.aiClient = aiClient;
        this.accessService = accessService;
    }

    /** 文本提取：同步，预期 5s 内返回 */
    @PostMapping("/records/extract")
    public ApiResponse<Map> extractRecord(@AuthenticationPrincipal Long userId,
                                          @RequestBody ExtractRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            throw BizException.badRequest("text 不能为空");
        }

        BabyEntity baby = accessService.requireBaby(userId);
        int ageMonths = AgeLabelCalculator.monthsBetween(baby.getBirthday(), LocalDate.now());

        return ApiResponse.ok(aiClient.extractText(baby.getId(), ageMonths, request.text().trim()));
    }

    /** 食谱推荐。宝宝与月龄同样由服务端注入，其余（口味、过敏原等）原样透传。 */
    @PostMapping("/recipes/recommend")
    public ApiResponse<Map> recommendRecipes(@AuthenticationPrincipal Long userId,
                                             @RequestBody Map<String, Object> body) {
        BabyEntity baby = accessService.requireBaby(userId);
        int ageMonths = AgeLabelCalculator.monthsBetween(baby.getBirthday(), LocalDate.now());

        Map<String, Object> payload = new HashMap<>(body);
        payload.put("baby_id", String.valueOf(baby.getId()));
        payload.put("baby_age_months", ageMonths);
        payload.put("population", "baby");

        return ApiResponse.ok(aiClient.post("/api/baby/recipes/recommend", payload));
    }
}
