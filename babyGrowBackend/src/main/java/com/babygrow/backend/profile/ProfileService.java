package com.babygrow.backend.profile;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.BabyPreferenceEntity;
import com.babygrow.backend.profile.dto.ProfileDtos.BabyProfile;
import com.babygrow.backend.profile.dto.ProfileDtos.BabyProfileResponse;
import com.babygrow.backend.profile.dto.ProfileDtos.InfoItem;
import com.babygrow.backend.profile.dto.ProfileDtos.Preference;
import com.babygrow.backend.profile.dto.ProfileDtos.ProfilePatchRequest;
import com.babygrow.backend.profile.dto.ProfileDtos.ProfileStateResponse;
import com.babygrow.backend.repository.BabyPreferenceRepository;
import com.babygrow.backend.repository.BabyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
public class ProfileService {

    /** key 与前端 ProfileInfoKey 取值一致 */
    private static final String KEY_AGE = "age";
    private static final String KEY_GENDER = "gender";
    private static final String KEY_CONSTELLATION = "constellation";

    private static final String GENDER_VALUE_BOY = "Boy";
    private static final String GENDER_VALUE_GIRL = "Girl";

    private static final List<String> GENDER_OPTIONS = List.of(GENDER_VALUE_BOY, GENDER_VALUE_GIRL);
    private static final List<String> CONSTELLATION_OPTIONS = List.of(
            "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
            "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces");

    private final FamilyAccessService accessService;
    private final BabyRepository babyRepository;
    private final BabyPreferenceRepository preferenceRepository;

    public ProfileService(FamilyAccessService accessService,
                          BabyRepository babyRepository,
                          BabyPreferenceRepository preferenceRepository) {
        this.accessService = accessService;
        this.babyRepository = babyRepository;
        this.preferenceRepository = preferenceRepository;
    }

    @Transactional(readOnly = true)
    public ProfileStateResponse getState(Long userId) {
        return toState(accessService.requireBaby(userId), today());
    }

    @Transactional(readOnly = true)
    public BabyProfileResponse getMinimalProfile(Long userId) {
        return new BabyProfileResponse(toMinimal(accessService.requireBaby(userId), today()));
    }

    /**
     * 增量更新。前端的 patch 可能只带其中一两个字段，因此逐字段判空后再落。
     *
     * <p>{@code info} 里的 age 是派生值（由生日算出），不落库；只有 gender 与 constellation
     * 是真正存储的属性。
     */
    @Transactional
    public ProfileStateResponse update(Long userId, ProfilePatchRequest patch) {
        BabyEntity baby = accessService.requireWritableBaby(userId);

        if (patch.name() != null && !patch.name().isBlank()) {
            baby.setName(patch.name().trim());
        }

        if (patch.birthday() != null) {
            baby.setBirthday(parseBirthday(patch.birthday()));
        }

        if (patch.info() != null) {
            patch.info().forEach(item -> applyInfoItem(baby, item));
        }

        if (patch.preferences() != null) {
            replacePreferences(baby.getId(), patch.preferences());
        }

        babyRepository.save(baby);
        return toState(baby, today());
    }

    private void applyInfoItem(BabyEntity baby, InfoItem item) {
        if (item == null || item.key() == null || item.value() == null) {
            return;
        }
        switch (item.key()) {
            case KEY_GENDER -> baby.setGender(toGenderColumn(item.value()));
            case KEY_CONSTELLATION -> baby.setConstellation(item.value());
            // age 由 birthday 派生，忽略其传入值
            default -> {
            }
        }
    }

    private void replacePreferences(Long babyId, List<Preference> preferences) {
        preferenceRepository.deleteByBabyId(babyId);
        preferenceRepository.flush();

        List<BabyPreferenceEntity> rows = new ArrayList<>();
        for (int i = 0; i < preferences.size(); i++) {
            Preference preference = preferences.get(i);
            if (preference == null || preference.label() == null || preference.label().isBlank()) {
                continue;
            }
            rows.add(BabyPreferenceEntity.of(
                    babyId, preference.icon(), preference.label(), preference.value(), i));
        }
        preferenceRepository.saveAll(rows);
    }

    private ProfileStateResponse toState(BabyEntity baby, LocalDate today) {
        List<Preference> preferences = preferenceRepository
                .findByBabyIdOrderBySortAscIdAsc(baby.getId())
                .stream()
                .map(row -> new Preference(
                        String.valueOf(row.getId()), row.getIcon(), row.getLabel(), row.getValue()))
                .toList();

        return new ProfileStateResponse(
                baby.getName(),
                baby.getBirthday() == null ? "" : baby.getBirthday().toString(),
                buildInfo(baby, today),
                preferences);
    }

    private List<InfoItem> buildInfo(BabyEntity baby, LocalDate today) {
        return List.of(
                new InfoItem(KEY_AGE, "profile-age", "Age",
                        AgeLabelCalculator.compute(baby.getBirthday(), today), null, "bg-tertiary-fixed"),
                new InfoItem(KEY_GENDER, "profile-gender", "Gender",
                        toGenderValue(baby.getGender()), GENDER_OPTIONS, "bg-secondary-container"),
                new InfoItem(KEY_CONSTELLATION, "profile-constellation", "Constellation",
                        baby.getConstellation() == null ? "" : baby.getConstellation(),
                        CONSTELLATION_OPTIONS, "bg-surface-container"));
    }

    private BabyProfile toMinimal(BabyEntity baby, LocalDate today) {
        return new BabyProfile(
                String.valueOf(baby.getId()),
                baby.getName(),
                AgeLabelCalculator.compute(baby.getBirthday(), today),
                baby.getBadge(),
                baby.getAvatarUrl() == null ? "" : baby.getAvatarUrl(),
                baby.getGender(),
                baby.getBirthday() == null ? "" : baby.getBirthday().toString());
    }

    private static String toGenderColumn(String value) {
        if (GENDER_VALUE_BOY.equalsIgnoreCase(value)) {
            return BabyEntity.GENDER_MALE;
        }
        if (GENDER_VALUE_GIRL.equalsIgnoreCase(value)) {
            return BabyEntity.GENDER_FEMALE;
        }
        return null;
    }

    private static String toGenderValue(String gender) {
        if (BabyEntity.GENDER_MALE.equals(gender)) {
            return GENDER_VALUE_BOY;
        }
        if (BabyEntity.GENDER_FEMALE.equals(gender)) {
            return GENDER_VALUE_GIRL;
        }
        return "";
    }

    private static LocalDate parseBirthday(String raw) {
        if (raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException ex) {
            throw BizException.badRequest("生日格式应为 YYYY-MM-DD：" + raw);
        }
    }

    private static LocalDate today() {
        return LocalDate.now();
    }
}
