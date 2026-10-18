package com.babygrow.backend.memory;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.common.Messages;
import com.babygrow.backend.domain.FamilyMemberEntity;
import com.babygrow.backend.domain.MemoryEntity;
import com.babygrow.backend.memory.MemoryDtos.MemoryCreateRequest;
import com.babygrow.backend.memory.MemoryDtos.MemoryView;
import com.babygrow.backend.repository.MemoryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** 家庭记忆。 */
@Service
public class MemoryService {

    /** 展示串随语言变化；筛选请用 dateIso */
    private static final DateTimeFormatter EN_DATE =
            DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter ZH_DATE =
            DateTimeFormatter.ofPattern("yyyy年M月d日", Locale.SIMPLIFIED_CHINESE);

    private static final Set<String> TONES = Set.of("green", "peach", "grey", "blue");
    private static final Set<String> MEDIA_TYPES = Set.of("Media", "Text");

    /**
     * memories.title 是 VARCHAR(128)。超长此前不会在这里被拦，而是一路走到写库，
     * 由数据库抛 DataIntegrityViolation——对外是 500（现在是 409），排查时看日志才知道
     * 是标题太长。在入口拦下，报错才指向真正的问题。
     */
    private static final int TITLE_MAX_LENGTH = 128;

    private final FamilyAccessService accessService;
    private final MemoryRepository memoryRepository;
    private final ObjectMapper objectMapper;
    private final Messages messages;

    public MemoryService(FamilyAccessService accessService,
                         MemoryRepository memoryRepository,
                         ObjectMapper objectMapper,
                         Messages messages) {
        this.accessService = accessService;
        this.memoryRepository = memoryRepository;
        this.objectMapper = objectMapper;
        this.messages = messages;
    }

    /**
     * 某个家庭的记忆。
     *
     * <p>按家庭而不是按宝宝取——记忆是家庭级的（外婆拍的照片也属于这个家），
     * 这正是「家庭分享」这一模块的意义。
     */
    @Transactional(readOnly = true)
    public List<MemoryView> list(Long userId) {
        FamilyMemberEntity me = accessService.requireMembership(userId);
        return memoryRepository.findByFamilyIdOrderByMemoryDateDescIdDesc(me.getFamilyId()).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional
    public MemoryView create(Long userId, MemoryCreateRequest request) {
        FamilyMemberEntity me = accessService.requireMembership(userId);
        if (!me.canWrite()) {
            throw BizException.forbiddenKey("error.viewerCannotAddMemory");
        }

        if (request.title() == null || request.title().isBlank()) {
            throw BizException.badRequestKey("error.memoryTitleRequired");
        }
        if (request.title().trim().length() > TITLE_MAX_LENGTH) {
            throw BizException.badRequestKey("error.memoryTitleTooLong", TITLE_MAX_LENGTH);
        }

        Long babyId = accessService.findBabyId(me.getFamilyId()).orElse(null);

        MemoryEntity memory = MemoryEntity.of(
                me.getFamilyId(),
                babyId,
                request.category() == null || request.category().isBlank() ? "MOMENT" : request.category().trim(),
                request.title().trim(),
                parseDate(request.date()),
                TONES.contains(request.tone()) ? request.tone() : "green",
                writeTags(request.tags()),
                MEDIA_TYPES.contains(request.media()) ? request.media() : "Text",
                request.mediaId());

        return toView(memoryRepository.save(memory));
    }

    /* ------------------------------------------------------------------ */

    private MemoryView toView(MemoryEntity memory) {
        return new MemoryView(
                String.valueOf(memory.getId()),
                memory.getCategory(),
                memory.getTitle(),
                displayDate(memory.getMemoryDate()),
                memory.getMemoryDate().toString(),
                memory.getTone(),
                readTags(memory.getTags()),
                memory.getMedia());
    }

    private String displayDate(LocalDate date) {
        return Locale.ENGLISH.getLanguage().equals(messages.locale().getLanguage())
                ? EN_DATE.format(date) : ZH_DATE.format(date);
    }

    private String writeTags(List<String> tags) {
        try {
            return objectMapper.writeValueAsString(tags == null ? List.of() : tags);
        } catch (Exception ex) {
            throw BizException.badRequestKey("error.tagsSerializeFailed");
        }
    }

    private List<String> readTags(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (Exception ex) {
            return new ArrayList<>();
        }
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(raw);
        } catch (Exception ex) {
            throw BizException.badRequestKey("error.dateFormatWithValue", raw);
        }
    }
}
