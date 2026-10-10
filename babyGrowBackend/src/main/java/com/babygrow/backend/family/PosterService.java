package com.babygrow.backend.family;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.BabyMilestoneEntity;
import com.babygrow.backend.domain.FamilyMemberEntity;
import com.babygrow.backend.domain.GrowthMeasurementEntity;
import com.babygrow.backend.domain.MemoryEntity;
import com.babygrow.backend.family.PosterDtos.PosterView;
import com.babygrow.backend.family.PosterDtos.PrivacyToggleView;
import com.babygrow.backend.family.PosterDtos.TemplateView;
import com.babygrow.backend.profile.AgeLabelCalculator;
import com.babygrow.backend.repository.BabyMilestoneRepository;
import com.babygrow.backend.repository.GrowthMeasurementRepository;
import com.babygrow.backend.repository.MemoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * 分享海报的内容。
 *
 * <p>正文从宝宝档案与最近一条记录推导，**不生成抒情文字**——海报是要发出去给别人看的，
 * 编出来的"故事"比一句朴素的事实更糟。没有数据时如实说明。
 */
@Service
public class PosterService {

    private static final DateTimeFormatter META_DATE =
            DateTimeFormatter.ofPattern("yyyy.MM.dd", Locale.US);

    private static final List<TemplateView> TEMPLATES = List.of(
            new TemplateView("warm", "温馨手账", "edit"),
            new TemplateView("magazine", "成长杂志", "photo-gallery"),
            new TemplateView("timeline", "极简时光轴", "trend-up"));

    private static final List<PrivacyToggleView> TOGGLES = List.of(
            new PrivacyToggleView("growth", "隐藏生长数据", "数字转换为可爱足迹", true),
            new PrivacyToggleView("face", "智能眼镜贴纸", "一键防窥保护面部", false));

    private final FamilyAccessService accessService;
    private final MemoryRepository memoryRepository;
    private final BabyMilestoneRepository milestoneRepository;
    private final GrowthMeasurementRepository growthRepository;

    public PosterService(FamilyAccessService accessService,
                         MemoryRepository memoryRepository,
                         BabyMilestoneRepository milestoneRepository,
                         GrowthMeasurementRepository growthRepository) {
        this.accessService = accessService;
        this.memoryRepository = memoryRepository;
        this.milestoneRepository = milestoneRepository;
        this.growthRepository = growthRepository;
    }

    @Transactional(readOnly = true)
    public PosterView poster(Long userId) {
        FamilyMemberEntity me = accessService.requireMembership(userId);
        BabyEntity baby = accessService.findBaby(me.getFamilyId()).orElse(null);

        String babyName = baby == null || baby.getName() == null ? "宝宝" : baby.getName();

        MemoryEntity latestMemory = memoryRepository
                .findByFamilyIdOrderByMemoryDateDescIdDesc(me.getFamilyId())
                .stream().findFirst().orElse(null);

        BabyMilestoneEntity latestMilestone = baby == null ? null
                : milestoneRepository.findByBabyIdOrderByUnlockedAtDesc(baby.getId())
                        .stream().findFirst().orElse(null);

        String heading = latestMemory != null ? latestMemory.getTitle()
                : latestMilestone != null ? latestMilestone.getTitle() : "";
        String badge = latestMemory != null ? latestMemory.getCategory()
                : latestMilestone != null ? "MILESTONE" : "MEMORY";

        return new PosterView(
                babyName + " 的成长手账",
                "GENIUS TRACK · MEMORY CAPSULE",
                badge,
                heading,
                buildBody(baby, latestMemory, latestMilestone),
                buildMeta(latestMemory),
                TEMPLATES,
                TOGGLES);
    }

    private String buildBody(BabyEntity baby, MemoryEntity memory, BabyMilestoneEntity milestone) {
        if (baby == null) {
            return "还没有宝宝档案，先去完善资料吧。";
        }

        List<String> parts = new ArrayList<>();
        String age = AgeLabelCalculator.compute(baby.getBirthday(), LocalDate.now());
        if (!age.isBlank()) {
            parts.add(age + " 了");
        }

        if (memory != null) {
            parts.add("最近记录了「" + memory.getTitle() + "」");
        }
        if (milestone != null && (memory == null || !milestone.getTitle().equals(memory.getTitle()))) {
            parts.add("达成了「" + milestone.getTitle() + "」");
        }

        growthRepository.findByBabyIdOrderByMeasuredAtAsc(baby.getId()).stream()
                .max(Comparator.comparing(GrowthMeasurementEntity::getMeasuredAt))
                .ifPresent(latest -> {
                    List<String> numbers = new ArrayList<>();
                    if (latest.getWeightKg() != null) {
                        numbers.add(latest.getWeightKg().stripTrailingZeros().toPlainString() + "kg");
                    }
                    if (latest.getHeightCm() != null) {
                        numbers.add(latest.getHeightCm().stripTrailingZeros().toPlainString() + "cm");
                    }
                    if (!numbers.isEmpty()) {
                        parts.add("最近一次测量 " + String.join("、", numbers));
                    }
                });

        if (parts.size() <= 1) {
            return "还没有足够的内容可以做成海报，先去记几条吧。";
        }
        return String.join("，", parts) + "。";
    }

    private String buildMeta(MemoryEntity memory) {
        if (memory == null) {
            return META_DATE.format(LocalDate.now()) + " · 家属记录";
        }
        return META_DATE.format(memory.getMemoryDate()) + " · 家属记录";
    }
}
