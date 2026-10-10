package com.babygrow.backend.menu;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.ai.AiClient;
import com.babygrow.backend.config.AsyncConfig;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.DailyRecommendationEntity;
import com.babygrow.backend.menu.MenuDtos.MenuItemView;
import com.babygrow.backend.menu.MenuDtos.MenuTodayResponse;
import com.babygrow.backend.profile.AgeLabelCalculator;
import com.babygrow.backend.repository.BabyRepository;
import com.babygrow.backend.repository.DailyRecommendationRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executor;

/**
 * 首页食谱推荐。
 *
 * <p><b>读路径绝不触发 LLM。</b> 推荐一次约 14-15s，若放进首页加载会把首屏拖死。
 * 所以：读只查 {@code daily_recommendations}；生成由异步任务完成，缓存失效时
 * 先返回上一次的结果并标 {@code stale}，让页面有内容可显示。
 */
@Service
public class MenuService {

    private static final Logger log = LoggerFactory.getLogger(MenuService.class);

    private static final int RECENT_DIET_DAYS = 3;
    private static final String DEFAULT_QUERY = "今天吃什么";

    /** pending 超过这个时长就认为上一次没跑完（进程被杀），允许重新投递 */
    private static final Duration STUCK_PENDING = Duration.ofMinutes(3);

    /** 餐别 → 前端展示用的英文名与图标。AI 返回的是中文，这里换算成既有 UI 的取值。 */
    private static final Map<String, String[]> MEAL_PRESENTATION = Map.of(
            "早餐", new String[]{"Breakfast", "breakfast", "bg-stone-50"},
            "午餐", new String[]{"Lunch", "lunch", "bg-orange-100/50"},
            "晚餐", new String[]{"Dinner", "supper", "bg-rose-100"},
            "加餐", new String[]{"Snack", "breakfast", "bg-stone-50"});

    private final FamilyAccessService accessService;
    private final BabyRepository babyRepository;
    private final DailyRecommendationRepository recommendationRepository;
    private final MenuContextRepository contextRepository;
    private final AiClient aiClient;
    private final ObjectMapper objectMapper;
    private final Executor executor;

    public MenuService(FamilyAccessService accessService,
                       BabyRepository babyRepository,
                       DailyRecommendationRepository recommendationRepository,
                       MenuContextRepository contextRepository,
                       AiClient aiClient,
                       ObjectMapper objectMapper,
                       @Qualifier(AsyncConfig.AI_EXECUTOR) Executor executor) {
        this.accessService = accessService;
        this.babyRepository = babyRepository;
        this.recommendationRepository = recommendationRepository;
        this.contextRepository = contextRepository;
        this.aiClient = aiClient;
        this.objectMapper = objectMapper;
        this.executor = executor;
    }

    /**
     * 首页今日菜单。
     *
     * <p>三种情形：命中且新鲜 → 直出；有旧结果但已失效 → 直出并标 stale、后台重算；
     * 完全没有 → 返回空结构并后台生成。
     */
    @Transactional
    public MenuTodayResponse today(Long userId) {
        BabyEntity baby = accessService.requireBaby(userId);
        LocalDate today = LocalDate.now();

        DailyRecommendationEntity row = recommendationRepository
                .findByBabyIdAndDate(baby.getId(), today)
                .orElse(null);

        if (row == null) {
            recommendationRepository.save(DailyRecommendationEntity.pending(baby.getId(), today));
            enqueue(baby.getId());
            return MenuTodayResponse.empty(today.toString(), null);
        }

        if (row.isFresh()) {
            return toResponse(row, false);
        }

        if (needsRegeneration(row)) {
            row.markPending();
            recommendationRepository.save(row);
            enqueue(baby.getId());
        }
        return toResponse(row, true);
    }

    /** 有新的饮食记录时调用：把今天的推荐标记为过期，下次读取会触发重算 */
    @Transactional
    public void invalidateToday(Long babyId) {
        recommendationRepository.findByBabyIdAndDate(babyId, LocalDate.now())
                .ifPresent(row -> {
                    if (row.getInvalidatedAt() == null) {
                        row.markPending();
                        recommendationRepository.save(row);
                        log.debug("宝宝 {} 今日食谱推荐已标记过期", babyId);
                    }
                });
    }

    /** 定时预生成：为所有宝宝算好今天的推荐，让早上的首次打开也是瞬间的 */
    public void pregenerateForAllBabies() {
        List<BabyEntity> babies = babyRepository.findAll();
        log.info("开始预生成 {} 个宝宝的今日食谱推荐", babies.size());
        babies.forEach(baby -> enqueue(baby.getId()));
    }

    private boolean needsRegeneration(DailyRecommendationEntity row) {
        if (!DailyRecommendationEntity.STATUS_PENDING.equals(row.getStatus())) {
            return true;
        }
        // 已经是 pending 且在合理时间内，说明另一个线程正在跑，不必重复投递
        return row.getUpdatedAt() == null
                || row.getUpdatedAt().isBefore(Instant.now().minus(STUCK_PENDING));
    }

    private void enqueue(Long babyId) {
        executor.execute(() -> regenerate(babyId));
    }

    /**
     * 生成（或重新生成）某个宝宝的今日推荐。
     *
     * <p>刻意不加 {@code @Transactional}：整段包含一次十几秒的 LLM 调用，
     * 用事务包住会长时间占着连接。状态写入各自成事务。
     */
    public void regenerate(Long babyId) {
        try {
            BabyEntity baby = babyRepository.findById(babyId).orElse(null);
            if (baby == null) {
                return;
            }

            LocalDate today = LocalDate.now();
            DailyRecommendationEntity row = recommendationRepository
                    .findByBabyIdAndDate(babyId, today)
                    .orElseGet(() -> recommendationRepository.save(
                            DailyRecommendationEntity.pending(babyId, today)));

            int ageMonths = AgeLabelCalculator.monthsBetween(baby.getBirthday(), today);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("baby_id", String.valueOf(babyId));
            body.put("baby_age_months", ageMonths);
            body.put("query", DEFAULT_QUERY);
            body.put("allergens", contextRepository.findAllergens(babyId));
            body.put("recent_diet", buildRecentDiet(babyId));
            body.put("population", "baby");
            body.put("use_agent", true);

            Map<String, Object> response = aiClient.post("/api/baby/recipes/recommend", body);

            row.markReady(
                    objectMapper.writeValueAsString(normalizeItems(response.get("items"))),
                    stringOrNull(response.get("reason")),
                    objectMapper.writeValueAsString(toStringList(response.get("avoid_items"))),
                    objectMapper.writeValueAsString(response.get("source_refs")),
                    stringOrNull(response.get("model_name")));
            recommendationRepository.save(row);

            log.info("宝宝 {} 的今日食谱推荐已生成", babyId);
        } catch (Exception ex) {
            log.error("生成宝宝 {} 的食谱推荐失败", babyId, ex);
            recommendationRepository.findByBabyIdAndDate(babyId, LocalDate.now())
                    .ifPresent(row -> {
                        // 失败的只是「今天的新建议」；旧结果仍在，读路径会带 stale 返回
                        row.markFailed(ex.getMessage());
                        recommendationRepository.save(row);
                    });
        }
    }

    /** 近几天的辅食，按天聚合成 AI 需要的形状 */
    private List<Map<String, Object>> buildRecentDiet(Long babyId) {
        Map<String, List<String>> byDay = new LinkedHashMap<>();
        for (MenuContextRepository.RecentFoodRow row : contextRepository
                .findRecentSolidFoods(babyId, RECENT_DIET_DAYS)) {
            byDay.computeIfAbsent(row.day(), key -> new ArrayList<>()).add(row.foodName());
        }

        List<Map<String, Object>> result = new ArrayList<>();
        byDay.forEach((day, foods) -> result.add(Map.of("day", day, "foods", foods)));
        return result;
    }

    /** 把 AI 的 items 转成前端 MenuItem 的形状 */
    @SuppressWarnings("unchecked")
    private List<MenuItemView> normalizeItems(Object rawItems) {
        if (!(rawItems instanceof List<?> items)) {
            return List.of();
        }

        List<MenuItemView> result = new ArrayList<>();
        int index = 0;
        for (Object raw : items) {
            if (!(raw instanceof Map<?, ?> item)) {
                continue;
            }
            Map<String, Object> map = (Map<String, Object>) item;

            String rawMeal = stringOrNull(map.get("meal_type"));
            String[] presentation = MEAL_PRESENTATION.getOrDefault(
                    rawMeal == null ? "" : rawMeal.trim(),
                    new String[]{rawMeal == null || rawMeal.isBlank() ? "Meal" : rawMeal, "breakfast", "bg-stone-50"});

            result.add(new MenuItemView(
                    String.valueOf(++index),
                    presentation[0],
                    stringOrNull(map.get("dish_name")),
                    buildDescription(map),
                    presentation[1],
                    presentation[2],
                    toIntList(map.get("source_chunk_ids"))));
        }
        return result;
    }

    /** 卡片上只放一句话，所以把「推荐理由」和「食材」合并成一段 */
    private static String buildDescription(Map<String, Object> item) {
        List<String> parts = new ArrayList<>();
        String reason = stringOrNull(item.get("reason"));
        if (reason != null && !reason.isBlank()) {
            parts.add(reason);
        }
        List<String> ingredients = toStringList(item.get("ingredients"));
        if (!ingredients.isEmpty()) {
            parts.add("食材：" + String.join("、", ingredients));
        }
        return String.join(" · ", parts);
    }

    private MenuTodayResponse toResponse(DailyRecommendationEntity row, boolean stale) {
        JsonNode payload = readTree(row.getPayload());
        List<MenuItemView> items = new ArrayList<>();

        if (payload != null && payload.isArray()) {
            for (JsonNode node : payload) {
                items.add(new MenuItemView(
                        node.path("id").asText(),
                        node.path("mealType").asText(),
                        node.path("title").asText(),
                        node.path("description").asText(),
                        node.path("icon").asText(),
                        node.path("bgColor").asText(),
                        intsOf(node.path("sourceChunkIds"))));
            }
        }

        return new MenuTodayResponse(
                row.getDate().toString(),
                row.getGeneratedAt() == null ? null : row.getGeneratedAt().toString(),
                stale || !row.isFresh(),
                items,
                row.getReason(),
                stringsOf(readTree(row.getAvoidItems())),
                row.getError());
    }

    private JsonNode readTree(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(json);
        } catch (Exception ex) {
            log.warn("推荐内容无法解析：{}", json);
            return null;
        }
    }

    private static List<String> stringsOf(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        node.forEach(item -> result.add(item.asText()));
        return result;
    }

    private static List<Integer> intsOf(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<Integer> result = new ArrayList<>();
        node.forEach(item -> result.add(item.asInt()));
        return result;
    }

    private static List<String> toStringList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (Object item : list) {
            if (item != null) {
                result.add(String.valueOf(item));
            }
        }
        return result;
    }

    private static List<Integer> toIntList(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Integer> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Number number) {
                result.add(number.intValue());
            }
        }
        return result;
    }

    private static String stringOrNull(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
