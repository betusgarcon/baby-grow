package com.babygrow.backend.vaccine;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.BabyVaccinationEntity;
import com.babygrow.backend.repository.BabyVaccinationRepository;
import com.babygrow.backend.repository.MediaAssetRepository;
import com.babygrow.backend.vaccine.VaccineDtos.AttachmentView;
import com.babygrow.backend.vaccine.VaccineDtos.VaccineDetailView;
import com.babygrow.backend.vaccine.VaccineDtos.VaccinePatchRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/** 疫苗接种记录。 */
@Service
public class VaccineService {

    private static final DateTimeFormatter DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("MMMM d, yyyy • h:mm a", Locale.US);
    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US);

    private final FamilyAccessService accessService;
    private final BabyVaccinationRepository vaccinationRepository;
    private final MediaAssetRepository mediaRepository;

    public VaccineService(FamilyAccessService accessService,
                          BabyVaccinationRepository vaccinationRepository,
                          MediaAssetRepository mediaRepository) {
        this.accessService = accessService;
        this.vaccinationRepository = vaccinationRepository;
        this.mediaRepository = mediaRepository;
    }

    /**
     * 当前最相关的一次接种。
     *
     * <p>前端的详情页展示的是「这一针」而不是一整个列表，所以这里挑一条：优先还没接种的
     * （按预约时间最近的在前），否则取最近接种过的那次。一条都没有时返回一个空壳，
     * 而不是 404——页面据此渲染空态。
     */
    @Transactional(readOnly = true)
    public VaccineDetailView detail(Long userId) {
        BabyEntity baby = accessService.requireBaby(userId);
        return toView(currentVaccination(baby.getId()));
    }

    @Transactional
    public VaccineDetailView update(Long userId, VaccinePatchRequest patch) {
        BabyEntity baby = accessService.requireWritableBaby(userId);
        BabyVaccinationEntity target = currentVaccination(baby.getId());

        if (target == null) {
            // 还没有任何记录时，第一次编辑就开一条；否则用户会对着一个保存不了的页面发愣
            target = BabyVaccinationEntity.scheduled(baby.getId(), "Vaccination");
        }

        if (patch.title() != null && !patch.title().isBlank()) {
            target.setName(stripPrefix(patch.title()));
        }
        if (patch.datetime() != null) {
            target.setAdministeredAt(parseDateTime(patch.datetime()));
        }
        if (patch.location() != null) {
            target.setLocation(patch.location());
        }
        if (patch.administeredBy() != null) {
            target.setAdministeredBy(patch.administeredBy());
        }
        if (patch.doseLabel() != null) {
            target.setDoseLabel(patch.doseLabel());
            target.setDoseProgress(parseDoseProgress(patch.doseLabel()));
        }
        if (patch.nextAppointment() != null) {
            target.setNextAppointment(parseDate(patch.nextAppointment()));
        }
        if (patch.nextNote() != null) {
            target.setNextNote(patch.nextNote());
        }
        if (patch.notes() != null) {
            target.setNotes(patch.notes());
        }
        if (patch.attachment() != null) {
            target.setAttachmentName(patch.attachment().name());
            target.setAttachmentMediaId(resolveAttachment(userId, patch.attachment().image()));
        }

        // 有了接种时间就不再是「待接种」
        if (target.getAdministeredAt() != null) {
            target.setStatus(BabyVaccinationEntity.STATUS_DONE);
        }

        return toView(vaccinationRepository.save(target));
    }

    /** 删除当前这一针。没有记录时什么也不做——重复删除不该报错。 */
    @Transactional
    public void remove(Long userId) {
        BabyEntity baby = accessService.requireWritableBaby(userId);
        List<BabyVaccinationEntity> all = vaccinationRepository.findByBabyIdOrderByAdministeredAtDescIdDesc(baby.getId());

        if (!all.isEmpty()) {
            vaccinationRepository.delete(all.get(0));
        }
    }

    /* ------------------------------------------------------------------ */

    /**
     * 挑出「当前这一针」。
     *
     * <p>前端的详情页展示的是一个对象而不是列表，所以规则是：优先还没接种的
     * （预约时间最近的在前），否则取最近接种过的那次。读与写共用同一段挑选逻辑，
     * 否则「读看到的」和「写改的」可能是两条不同的记录。
     */
    private BabyVaccinationEntity currentVaccination(Long babyId) {
        List<BabyVaccinationEntity> all =
                vaccinationRepository.findByBabyIdOrderByAdministeredAtDescIdDesc(babyId);

        return all.stream()
                .filter(item -> BabyVaccinationEntity.STATUS_SCHEDULED.equals(item.getStatus()))
                .min(Comparator.comparing(
                        item -> item.getNextAppointment() == null ? LocalDate.MAX : item.getNextAppointment()))
                .orElse(all.isEmpty() ? null : all.get(0));
    }

    /** 一条记录都没有时返回空壳，而不是 404——页面据此渲染空态 */
    private VaccineDetailView toView(BabyVaccinationEntity entity) {
        if (entity == null) {
            return new VaccineDetailView("", "", "", "", "", 0d, "", "", "", new AttachmentView("", null));
        }

        String imageUrl = entity.getAttachmentMediaId() == null ? null
                : mediaRepository.findById(entity.getAttachmentMediaId())
                        .map(asset -> asset.getUrl())
                        .orElse(null);

        return new VaccineDetailView(
                entity.getName() == null ? "" : "Vaccine: " + entity.getName(),
                entity.getAdministeredAt() == null ? ""
                        : DATE_TIME_FORMAT.format(entity.getAdministeredAt().atZone(ZoneId.systemDefault())),
                nullSafe(entity.getLocation()),
                nullSafe(entity.getAdministeredBy()),
                nullSafe(entity.getDoseLabel()),
                entity.getDoseProgress() == null ? 0d : entity.getDoseProgress(),
                entity.getNextAppointment() == null ? "" : DATE_FORMAT.format(entity.getNextAppointment()),
                nullSafe(entity.getNextNote()),
                nullSafe(entity.getNotes()),
                new AttachmentView(nullSafe(entity.getAttachmentName()), imageUrl));
    }

    /** 展示串是 "Vaccine: HepB"，存的时候要把前缀去掉，否则每次保存都会再拼一层 */
    private static String stripPrefix(String title) {
        String value = title.trim();
        return value.startsWith("Vaccine:") ? value.substring("Vaccine:".length()).trim() : value;
    }

    /** "2nd of 3" → 2/3；解析不出来就当没有进度。包级可见以便单测。 */
    static Double parseDoseProgress(String doseLabel) {
        // 序数后缀不能漏：真实取值是 "2nd of 3" 而不是 "2 of 3"
        var matcher = java.util.regex.Pattern
                .compile("(\\d+)(?:st|nd|rd|th)?\\s*of\\s*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(doseLabel);
        if (!matcher.find()) {
            return null;
        }
        int done = Integer.parseInt(matcher.group(1));
        int total = Integer.parseInt(matcher.group(2));
        return total <= 0 ? null : Math.min((double) done / total, 1d);
    }

    private static Instant parseDateTime(String raw) {
        if (raw.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(raw);
        } catch (Exception ignored) {
            // 落到展示格式
        }
        try {
            return java.time.LocalDateTime.parse(raw.trim(), DATE_TIME_FORMAT)
                    .atZone(ZoneId.systemDefault()).toInstant();
        } catch (Exception ex) {
            throw BizException.badRequest("时间格式无法识别，请写成 "
                    + DATE_TIME_FORMAT.format(Instant.now().atZone(ZoneId.systemDefault())) + " 这样的形式");
        }
    }

    private static LocalDate parseDate(String raw) {
        if (raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw);
        } catch (Exception ignored) {
            // 落到展示格式
        }
        try {
            return LocalDate.parse(raw.trim(), DATE_FORMAT);
        } catch (Exception ex) {
            throw BizException.badRequest("日期格式无法识别，请写成 " + DATE_FORMAT.format(LocalDate.now()) + " 这样的形式");
        }
    }

    private Long resolveAttachment(Long userId, String image) {
        if (image == null || image.isBlank()) {
            return null;
        }
        // 前端传的是上传接口给的绝对 URL；按 URL + 归属反查，不是自己上传的一律不挂
        return mediaRepository.findByUrlAndOwnerUserId(image, userId)
                .map(asset -> asset.getId())
                .orElse(null);
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
