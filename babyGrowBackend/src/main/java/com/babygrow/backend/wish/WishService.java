package com.babygrow.backend.wish;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.MediaAssetEntity;
import com.babygrow.backend.domain.WishChecklistItemEntity;
import com.babygrow.backend.domain.WishEntity;
import com.babygrow.backend.profile.AgeLabelCalculator;
import com.babygrow.backend.repository.MediaAssetRepository;
import com.babygrow.backend.repository.WishChecklistItemRepository;
import com.babygrow.backend.repository.WishRepository;
import com.babygrow.backend.wish.WishDtos.ChecklistItemView;
import com.babygrow.backend.wish.WishDtos.CounterView;
import com.babygrow.backend.wish.WishDtos.WishRequest;
import com.babygrow.backend.wish.WishDtos.WishView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** 心愿清单。 */
@Service
public class WishService {

    private final FamilyAccessService accessService;
    private final WishRepository wishRepository;
    private final WishChecklistItemRepository checklistRepository;
    private final MediaAssetRepository mediaRepository;
    private final WishCoverService coverService;

    public WishService(FamilyAccessService accessService,
                       WishRepository wishRepository,
                       WishChecklistItemRepository checklistRepository,
                       MediaAssetRepository mediaRepository,
                       WishCoverService coverService) {
        this.accessService = accessService;
        this.wishRepository = wishRepository;
        this.checklistRepository = checklistRepository;
        this.mediaRepository = mediaRepository;
        this.coverService = coverService;
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

        Optional<WishEntity> existing = wishRepository.findByBabyIdAndClientKey(baby.getId(), clientKey);
        // 头图只在**首次创建**时生成，所以这里必须区分「新建」与「覆盖已有」：
        // 覆盖时若也重新出图，客户端重复提交同一个 id 就会反复打付费接口
        boolean isNew = existing.isEmpty();

        WishEntity wish = existing.orElseGet(() -> {
            WishEntity created = WishEntity.of(baby.getId(), clientKey);
            created.setSort(nextSort(baby.getId()));
            return created;
        });

        if (isNew && coverService.enabled()) {
            wish.setCoverStatus(WishEntity.COVER_PENDING);
        }

        wish.setKind(WishEntity.KIND_COUNTER.equals(request.kind())
                ? WishEntity.KIND_COUNTER : WishEntity.KIND_CHECKLIST);
        wish.setTitle(request.title().trim());
        wish.setIcon(request.icon());
        wish.setCircleClass(request.circleClass());
        wish.setDescription(request.description());
        wish.setDetailSubtitle(request.detailSubtitle());
        // 计数式用客户端给的目标次数；清单式的目标数稍后按清单实际条数覆盖
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
        int savedItems = request.checklist() == null ? 0 : saveChecklist(saved.getId(), request.checklist());
        syncChecklistGoal(saved, savedItems);

        if (isNew && coverService.enabled()) {
            coverService.enqueue(new WishCoverService.CoverJob(
                    userId,
                    baby.getId(),
                    saved.getId(),
                    saved.getClientKey(),
                    saved.getTitle(),
                    saved.getDescription(),
                    AgeLabelCalculator.monthsBetween(baby.getBirthday(), LocalDate.now())));
        }

        return toView(saved);
    }

    /**
     * 重新生成头图。给「生成失败」与「想换一张」用。
     *
     * <p>与创建时的区别：这里不判断是否首次，是显式意图，直接重做。
     */
    @Transactional
    public WishView regenerateCover(Long userId, String wishId) {
        BabyEntity baby = accessService.requireWritableBaby(userId);
        WishEntity wish = wishRepository.findByBabyIdAndClientKey(baby.getId(), requireKey(wishId))
                .orElseThrow(() -> BizException.notFound("心愿不存在"));

        if (!coverService.enabled()) {
            throw BizException.badRequest("头图生成功能未开启");
        }

        // 先落 pending 再入队：前端立刻就能看到「生成中」，而不是等下一次刷新
        wish.setCoverStatus(WishEntity.COVER_PENDING);
        wishRepository.save(wish);

        coverService.enqueue(new WishCoverService.CoverJob(
                userId,
                baby.getId(),
                wish.getId(),
                wish.getClientKey(),
                wish.getTitle(),
                wish.getDescription(),
                AgeLabelCalculator.monthsBetween(baby.getBirthday(), LocalDate.now())));

        return toView(wish);
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
        int savedItems = saveChecklist(wish.getId(), checklist == null ? List.of() : checklist);
        syncChecklistGoal(wish, savedItems);

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

    /** 整份替换清单，返回真正落库的条数（标题为空的条目会被跳过） */
    private int saveChecklist(Long wishId, List<ChecklistItemView> items) {
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
        return rows.size();
    }

    /**
     * 让清单式心愿的目标数等于清单实际条数。
     *
     * <p>原先这个数由用户填，于是能填出与清单对不上的值——比如填 4 但只加了 2 条，
     * 界面就会显示「1 of 4」而底下只有 2 行，自相矛盾。现在由服务端从清单派生，
     * 客户端传什么都不作数，数据库里的值也就不会和界面显示打架。
     *
     * <p>计数式不受影响：它的目标数是用户填的「目标次数」。
     */
    private void syncChecklistGoal(WishEntity wish, int itemCount) {
        if (WishEntity.KIND_CHECKLIST.equals(wish.getKind())) {
            // wish 在事务里是托管态，改完不必显式 save，提交时自会刷库
            wish.setGoal(itemCount);
        }
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
                wish.getExpertTip(),
                coverUrl(wish.getCoverMediaId()),
                wish.getCoverStatus());
    }

    /**
     * 头图的绝对地址。
     *
     * <p>逐条查一次 media_assets——与上面逐条查 checklist 是同一个量级，
     * 一个家庭的心愿数量是十几条以内，不值得为它做批量预取。
     */
    private String coverUrl(Long coverMediaId) {
        if (coverMediaId == null) {
            return null;
        }
        return mediaRepository.findById(coverMediaId)
                .map(MediaAssetEntity::getUrl)
                .orElse(null);
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
