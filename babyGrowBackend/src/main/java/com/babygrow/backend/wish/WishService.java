package com.babygrow.backend.wish;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.WishChecklistItemEntity;
import com.babygrow.backend.domain.WishEntity;
import com.babygrow.backend.repository.WishChecklistItemRepository;
import com.babygrow.backend.repository.WishRepository;
import com.babygrow.backend.wish.WishDtos.ChecklistItemView;
import com.babygrow.backend.wish.WishDtos.CounterView;
import com.babygrow.backend.wish.WishDtos.WishRequest;
import com.babygrow.backend.wish.WishDtos.WishView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/** 心愿清单。 */
@Service
public class WishService {

    private final FamilyAccessService accessService;
    private final WishRepository wishRepository;
    private final WishChecklistItemRepository checklistRepository;

    public WishService(FamilyAccessService accessService,
                       WishRepository wishRepository,
                       WishChecklistItemRepository checklistRepository) {
        this.accessService = accessService;
        this.wishRepository = wishRepository;
        this.checklistRepository = checklistRepository;
    }

    @Transactional(readOnly = true)
    public List<WishView> list(Long userId) {
        BabyEntity baby = accessService.requireBaby(userId);
        return wishRepository.findByBabyIdOrderBySortAscIdAsc(baby.getId()).stream()
                .map(this::toView)
                .toList();
    }

    /**
     * 新建（或按 client_key 覆盖）一条心愿。
     *
     * <p>用 upsert 而不是纯 insert：前端的 id 由它自己生成，重复提交同一个 id 时
     * 覆盖比报错更符合预期。
     */
    @Transactional
    public WishView create(Long userId, WishRequest request) {
        BabyEntity baby = accessService.requireWritableBaby(userId);

        if (request.title() == null || request.title().isBlank()) {
            throw BizException.badRequest("请填写心愿名称");
        }

        String clientKey = request.id() == null || request.id().isBlank()
                ? "wish-" + System.currentTimeMillis()
                : request.id();

        WishEntity wish = wishRepository.findByBabyIdAndClientKey(baby.getId(), clientKey)
                .orElseGet(() -> {
                    WishEntity created = WishEntity.of(baby.getId(), clientKey);
                    created.setSort(nextSort(baby.getId()));
                    return created;
                });

        wish.setKind(WishEntity.KIND_COUNTER.equals(request.kind())
                ? WishEntity.KIND_COUNTER : WishEntity.KIND_CHECKLIST);
        wish.setTitle(request.title().trim());
        wish.setIcon(request.icon());
        wish.setCircleClass(request.circleClass());
        wish.setDescription(request.description());
        wish.setDetailSubtitle(request.detailSubtitle());
        wish.setGoal(request.goal() == null ? 1 : Math.max(request.goal(), 1));
        wish.setUnitLabel(request.unitLabel());
        wish.setChecklistTitle(request.checklistTitle());
        wish.setPath(request.path());
        wish.setBadge(request.badge());
        wish.setExpertTip(request.expertTip());

        CounterView counter = request.counter();
        if (counter != null) {
            wish.setCounterCurrent(counter.current());
            wish.setCounterTarget(counter.target());
            wish.setCounterUnit(counter.unit());
        }

        WishEntity saved = wishRepository.save(wish);

        // 清单是整份提交的，直接替换
        checklistRepository.deleteByWishId(saved.getId());
        if (request.checklist() != null) {
            saveChecklist(saved.getId(), request.checklist());
        }

        return toView(saved);
    }

    @Transactional
    public WishDtos.IdResponse remove(Long userId, String wishId) {
        WishEntity wish = requireWish(userId, wishId);
        wishRepository.delete(wish);
        return new WishDtos.IdResponse(wishId);
    }

    @Transactional
    public WishView updateChecklist(Long userId, String wishId, List<ChecklistItemView> checklist) {
        BabyEntity baby = accessService.requireWritableBaby(userId);
        WishEntity wish = wishRepository.findByBabyIdAndClientKey(baby.getId(), requireKey(wishId))
                .orElseThrow(() -> BizException.notFound("心愿不存在"));

        checklistRepository.deleteByWishId(wish.getId());
        saveChecklist(wish.getId(), checklist == null ? List.of() : checklist);

        return toView(wish);
    }

    @Transactional
    public WishView updateCounter(Long userId, String wishId, Integer current) {
        BabyEntity baby = accessService.requireWritableBaby(userId);
        WishEntity wish = wishRepository.findByBabyIdAndClientKey(baby.getId(), requireKey(wishId))
                .orElseThrow(() -> BizException.notFound("心愿不存在"));

        if (!WishEntity.KIND_COUNTER.equals(wish.getKind())) {
            throw BizException.badRequest("这条心愿不是计数式的");
        }
        int target = wish.getCounterTarget() == null ? wish.getGoal() : wish.getCounterTarget();
        int value = current == null ? 0 : current;

        // 计数不该越界：进度条只会走到 100%，负数更没有意义
        wish.setCounterCurrent(Math.max(0, Math.min(value, target)));
        return toView(wishRepository.save(wish));
    }

    /* ------------------------------------------------------------------ */

    private void saveChecklist(Long wishId, List<ChecklistItemView> items) {
        List<WishChecklistItemEntity> rows = new ArrayList<>();
        for (int index = 0; index < items.size(); index++) {
            ChecklistItemView item = items.get(index);
            if (item == null || item.title() == null || item.title().isBlank()) {
                continue;
            }
            rows.add(WishChecklistItemEntity.of(
                    wishId, item.id(), item.title(), item.note(), item.done(), index));
        }
        checklistRepository.saveAll(rows);
    }

    private WishView toView(WishEntity wish) {
        List<ChecklistItemView> checklist = checklistRepository
                .findByWishIdOrderBySortAscIdAsc(wish.getId()).stream()
                .map(item -> new ChecklistItemView(
                        // 前端没给 id 的条目（理论上不会有）退回用行 id，保证列表 key 稳定
                        item.getClientKey() == null ? String.valueOf(item.getId()) : item.getClientKey(),
                        item.getTitle(),
                        item.getNote(),
                        item.isDone()))
                .toList();

        CounterView counter = wish.getCounterTarget() == null ? null
                : new CounterView(
                        wish.getCounterCurrent() == null ? 0 : wish.getCounterCurrent(),
                        wish.getCounterTarget(),
                        wish.getCounterUnit());

        return new WishView(
                wish.getClientKey(),
                wish.getIcon(),
                wish.getCircleClass(),
                wish.getTitle(),
                wish.getDescription(),
                wish.getDetailSubtitle(),
                wish.getGoal(),
                wish.getUnitLabel(),
                wish.getChecklistTitle(),
                wish.getPath(),
                wish.getKind(),
                wish.getBadge(),
                checklist,
                counter,
                wish.getExpertTip());
    }

    private int nextSort(Long babyId) {
        return wishRepository.findByBabyIdOrderBySortAscIdAsc(babyId).stream()
                .mapToInt(WishEntity::getSort)
                .max()
                .orElse(0) + 1;
    }

    private WishEntity requireWish(Long userId, String wishId) {
        BabyEntity baby = accessService.requireWritableBaby(userId);
        return wishRepository.findByBabyIdAndClientKey(baby.getId(), requireKey(wishId))
                .orElseThrow(() -> BizException.notFound("心愿不存在"));
    }

    private static String requireKey(String wishId) {
        if (wishId == null || wishId.isBlank()) {
            throw BizException.badRequest("缺少心愿标识");
        }
        return wishId;
    }
}
