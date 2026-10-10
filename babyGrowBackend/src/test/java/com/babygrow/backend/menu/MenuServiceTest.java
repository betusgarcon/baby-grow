package com.babygrow.backend.menu;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.ai.AiClient;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.DailyRecommendationEntity;
import com.babygrow.backend.menu.MenuDtos.MenuTodayResponse;
import com.babygrow.backend.repository.BabyRepository;
import com.babygrow.backend.repository.DailyRecommendationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 首页菜单的三条分支：命中新鲜缓存、缓存已失效、完全没有缓存。
 *
 * <p>这里最要紧的一条约束是**读路径不阻塞在 AI 上**——所以生成只被投递、不被等待，
 * 而调用方总能拿到一个结构完整的响应（要么是内容，要么是空列表 + stale）。
 */
@ExtendWith(MockitoExtension.class)
class MenuServiceTest {

    private static final Long USER_ID = 7L;
    private static final Long BABY_ID = 1L;
    private static final LocalDate TODAY = LocalDate.now();

    @Mock
    private FamilyAccessService accessService;
    @Mock
    private BabyRepository babyRepository;
    @Mock
    private DailyRecommendationRepository recommendationRepository;
    @Mock
    private MenuContextRepository contextRepository;
    @Mock
    private AiClient aiClient;

    /** 用同步收集代替线程池：测试要断言「投递了几次」，而不是让任务真的跑起来 */
    private final List<Runnable> dispatched = new ArrayList<>();
    private final Executor capturingExecutor = dispatched::add;

    private MenuService menuService;
    private BabyEntity baby;

    @BeforeEach
    void setUp() {
        menuService = new MenuService(accessService, babyRepository, recommendationRepository,
                contextRepository, aiClient, new ObjectMapper(), capturingExecutor);

        // BabyEntity 的 id 由数据库生成，工厂方法不会设置它；测试里用 mock 把 id 固定下来，
        // 否则 findByBabyIdAndDate(null, ...) 会和 stub 的参数对不上。
        baby = mock(BabyEntity.class);
        lenient().when(baby.getId()).thenReturn(BABY_ID);
        lenient().when(accessService.requireBaby(USER_ID)).thenReturn(baby);
    }

    @Test
    void returnsEmptyPlaceholderAndDispatchesWhenNothingCached() {
        when(recommendationRepository.findByBabyIdAndDate(BABY_ID, TODAY)).thenReturn(Optional.empty());
        when(recommendationRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        MenuTodayResponse response = menuService.today(USER_ID);

        assertThat(response.stale()).isTrue();
        assertThat(response.items()).isEmpty();
        assertThat(response.avoidItems()).isEmpty();
        assertThat(dispatched).hasSize(1);

        // 先落一条 pending 行，避免同一秒内的并发请求各自投递一次
        ArgumentCaptor<DailyRecommendationEntity> saved = ArgumentCaptor.forClass(DailyRecommendationEntity.class);
        verify(recommendationRepository).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo(DailyRecommendationEntity.STATUS_PENDING);
        assertThat(saved.getValue().getDate()).isEqualTo(TODAY);
    }

    @Test
    void servesFreshCacheWithoutTouchingTheModel() {
        DailyRecommendationEntity row = readyRow();
        when(recommendationRepository.findByBabyIdAndDate(BABY_ID, TODAY)).thenReturn(Optional.of(row));

        MenuTodayResponse response = menuService.today(USER_ID);

        assertThat(response.stale()).isFalse();
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).title()).isEqualTo("鸡肉南瓜粥");
        assertThat(response.items().get(0).mealType()).isEqualTo("Lunch");
        assertThat(response.items().get(0).description()).contains("富含蛋白质").contains("鸡胸肉");
        assertThat(response.avoidItems()).contains("整颗坚果");

        // 关键：缓存新鲜时不得触发任何生成
        assertThat(dispatched).isEmpty();
        verify(aiClient, never()).post(any(), any());
    }

    @Test
    void servesStaleCacheAndRedispatchesWhenInvalidated() {
        DailyRecommendationEntity row = readyRow();
        row.markPending(); // 有新饮食记录时就是这样
        when(recommendationRepository.findByBabyIdAndDate(BABY_ID, TODAY)).thenReturn(Optional.of(row));
        when(recommendationRepository.save(any())).thenAnswer(call -> call.getArgument(0));

        MenuTodayResponse response = menuService.today(USER_ID);

        // 已经过期，但旧结果仍然返回——首页不该因为正在重算而变空
        assertThat(response.stale()).isTrue();
        assertThat(response.items()).hasSize(1);
        assertThat(dispatched).hasSize(1);
    }

    @Test
    void doesNotRedispatchWhileGenerationIsStillRunning() {
        // 从库里读出来的 pending 行：带 updatedAt（内存里新建的实体还没有，那不代表真实场景）
        DailyRecommendationEntity row = mock(DailyRecommendationEntity.class);
        lenient().when(row.getStatus()).thenReturn(DailyRecommendationEntity.STATUS_PENDING);
        lenient().when(row.getUpdatedAt()).thenReturn(Instant.now());
        lenient().when(row.isFresh()).thenReturn(false);
        lenient().when(row.getDate()).thenReturn(TODAY);

        when(recommendationRepository.findByBabyIdAndDate(BABY_ID, TODAY)).thenReturn(Optional.of(row));

        menuService.today(USER_ID);

        // 刚投递过的 pending 行不该被重复投递，否则刷新几次就会堆一串任务
        assertThat(dispatched).isEmpty();
    }

    @Test
    void regenerateMapsAgentItemsOntoMenuItemShape() {
        DailyRecommendationEntity row = DailyRecommendationEntity.pending(BABY_ID, TODAY);

        when(babyRepository.findById(BABY_ID)).thenReturn(Optional.of(baby));
        when(recommendationRepository.findByBabyIdAndDate(BABY_ID, TODAY)).thenReturn(Optional.of(row));
        when(recommendationRepository.save(any())).thenAnswer(call -> call.getArgument(0));
        when(contextRepository.findAllergens(BABY_ID)).thenReturn(List.of("鸡蛋"));
        when(contextRepository.findRecentSolidFoods(anyLong(), anyInt())).thenReturn(List.of());
        when(aiClient.post(any(), any())).thenReturn(agentResponse());

        menuService.regenerate(BABY_ID);

        assertThat(row.getStatus()).isEqualTo(DailyRecommendationEntity.STATUS_READY);
        assertThat(row.getPayload()).contains("鸡肉南瓜粥").contains("Breakfast");

        // 餐别要从 AI 的中文换算成既有 UI 用的英文与图标
        MenuTodayResponse response = menuService.today(USER_ID);
        assertThat(response.stale()).isFalse();
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).mealType()).isEqualTo("Breakfast");
        assertThat(response.items().get(0).icon()).isEqualTo("breakfast");
        assertThat(response.items().get(0).sourceChunkIds()).containsExactly(12, 34);
    }

    /** 一条已生成好的缓存行 */
    private DailyRecommendationEntity readyRow() {
        DailyRecommendationEntity row = DailyRecommendationEntity.pending(BABY_ID, TODAY);
        row.markReady(
                """
                [{"id":"1","mealType":"Lunch","title":"鸡肉南瓜粥","description":"富含蛋白质 · 食材：鸡胸肉、南瓜",
                  "icon":"lunch","bgColor":"bg-orange-100/50","sourceChunkIds":[812]}]
                """,
                "本周蛋白质偏少",
                "[\"整颗坚果\"]",
                "[]",
                "qwen2.5:7b");
        return row;
    }

    /** 模拟 AI 服务 /recipes/recommend 的返回（字段是 snake_case） */
    private Map<String, Object> agentResponse() {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("meal_type", "早餐");
        item.put("dish_name", "鸡肉南瓜粥");
        item.put("reason", "富含蛋白质与维生素A");
        item.put("ingredients", List.of("鸡胸肉", "南瓜", "大米"));
        item.put("source_chunk_ids", List.of(12, 34));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ok");
        response.put("items", List.of(item));
        response.put("reason", "本周蛋白质偏少");
        response.put("avoid_items", List.of("整颗坚果", "蜂蜜"));
        response.put("model_name", "qwen2.5:7b");
        return response;
    }
}
