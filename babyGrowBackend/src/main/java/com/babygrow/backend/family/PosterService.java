package com.babygrow.backend.family;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.Messages;
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

    private static final List<String[]> TEMPLATE_KEYS = List.of(
            new String[]{"warm", "ui.poster.template.warm", "edit"},
            new String[]{"magazine", "ui.poster.template.magazine", "photo-gallery"},
            new String[]{"timeline", "ui.poster.template.timeline", "trend-up"});

    private static final List<String[]> TOGGLE_KEYS = List.of(
            new String[]{"growth", "ui.poster.toggle.growth.label", "ui.poster.toggle.growth.note", "true"},
            new String[]{"face", "ui.poster.toggle.face.label", "ui.poster.toggle.face.note", "false"});

    private final FamilyAccessService accessService;
    private final MemoryRepository memoryRepository;
    private final BabyMilestoneRepository milestoneRepository;
    private final GrowthMeasurementRepository growthRepository;
    private final Messages messages;

    public PosterService(FamilyAccessService accessService,
                         MemoryRepository memoryRepository,
                         BabyMilestoneRepository milestoneRepository,
                         GrowthMeasurementRepository growthRepository,
                         Messages messages) {
        this.accessService = accessService;
        this.memoryRepository = memoryRepository;
        this.milestoneRepository = milestoneRepository;
        this.growthRepository = growthRepository;
        this.messages = messages;
    }

    @Transactional(readOnly = true)
    public PosterView poster(Long userId) {
        FamilyMemberEntity me = accessService.requireMembership(userId);
        BabyEntity baby = accessService.findBaby(me.getFamilyId()).orElse(null);

        String babyName = baby == null || baby.getName() == null
                ? messages.get("ui.default.babyName") : baby.getName();

        MemoryEntity latestMemory = memoryRepository
                .findByFamilyIdOrderByMemoryDateDescIdDesc(me.getFamilyId())
                .stream().findFirst().orElse(null);

        BabyMilestoneEntity latestMilestone = baby == null ? null
                : milestoneRepository.findByBabyIdOrderByUnlockedAtDesc(baby.getId())
                        .stream().findFirst().orElse(null);

        String heading = latestMemory != null ? latestMemory.getTitle()
                : latestMilestone != null ? latestMilestone.getTitle() : "";
        String badge = latestMemory != null ? latestMemory.getCategory()
                : latestMilestone != null
                        ? messages.get("ui.poster.badge.milestone")
                        : messages.get("ui.poster.badge.memory");

        return new PosterView(
                messages.get("ui.poster.heading", babyName),
                messages.get("ui.poster.brand"),
                badge,
                heading,
                buildBody(baby, latestMemory, latestMilestone),
                buildMeta(latestMemory),
                templates(),
                toggles());
    }

    private List<TemplateView> templates() {
        List<TemplateView> views = new ArrayList<>();
        for (String[] entry : TEMPLATE_KEYS) {
            views.add(new TemplateView(entry[0], messages.get(entry[1]), entry[2]));
        }
        return views;
    }

    private List<PrivacyToggleView> toggles() {
        List<PrivacyToggleView> views = new ArrayList<>();
        for (String[] entry : TOGGLE_KEYS) {
            views.add(new PrivacyToggleView(entry[0], messages.get(entry[1]),
                    messages.get(entry[2]), Boolean.parseBoolean(entry[3])));
        }
        return views;
    }

    private String buildBody(BabyEntity baby, MemoryEntity memory, BabyMilestoneEntity milestone) {
        if (baby == null) {
            return messages.get("ui.poster.body.noProfile");
        }

        List<String> parts = new ArrayList<>();
        String age = AgeLabelCalculator.compute(baby.getBirthday(), LocalDate.now());
        if (!age.isBlank()) {
            parts.add(messages.get("ui.poster.body.age", age));
        }

        if (memory != null) {
            parts.add(messages.get("ui.poster.body.memory", memory.getTitle()));
        }
        if (milestone != null && (memory == null || !milestone.getTitle().equals(memory.getTitle()))) {
            parts.add(messages.get("ui.poster.body.milestone", milestone.getTitle()));
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
                        parts.add(messages.get("ui.poster.body.measurement",
                                String.join(messages.get("ui.common.listSeparator"), numbers)));
                    }
                });

        if (parts.size() <= 1) {
            return messages.get("ui.poster.body.empty");
        }
        return String.join(messages.get("ui.common.listSeparator"), parts)
                + messages.get("ui.common.sentenceEnd");
    }

    private String buildMeta(MemoryEntity memory) {
        String date = META_DATE.format(memory == null ? LocalDate.now() : memory.getMemoryDate());
        return messages.get("ui.poster.meta", date);
    }
}
