package com.babygrow.backend.record;

import com.babygrow.backend.domain.TimelineEntryEntity;
import com.babygrow.backend.record.dto.RecordDtos.TimelineEntryResponse;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** 时间线条目相关的纯函数。两个写入路径共用，避免各写一套导致形状不一致。 */
public final class TimelineEntries {

    /** 与设计稿一致：12 小时制带 AM/PM，如 "2:30 PM" */
    private static final DateTimeFormatter TIME_FORMAT =
            DateTimeFormatter.ofPattern("h:mm a", Locale.US);

    private TimelineEntries() {
    }

    /** 实体 → 前端契约。id 转字符串，与 JourneyEntry.id: string 对齐。 */
    public static TimelineEntryResponse toResponse(TimelineEntryEntity entry) {
        return new TimelineEntryResponse(
                String.valueOf(entry.getId()),
                entry.getDate().toString(),
                entry.getType(),
                entry.getFilterKey(),
                entry.getTime(),
                entry.getBadge(),
                entry.getTitle(),
                entry.getImageUrl(),
                entry.getDescription(),
                entry.getAmount(),
                entry.getMethod(),
                entry.getDuration(),
                entry.getProgress(),
                entry.getWakingCount());
    }

    public static String formatTime(Instant occurredAt) {
        return TIME_FORMAT.format(occurredAt.atZone(ZoneId.systemDefault()));
    }

    public static LocalDate localDateOf(Instant occurredAt) {
        return occurredAt.atZone(ZoneId.systemDefault()).toLocalDate();
    }

    /**
     * 把 "YYYY-MM-DD" + "HH:MM" 合成一个时刻。
     *
     * <p>时间解析不出来时退回当天零点——宁可在时间线上排序靠前一点，也不要因为
     * 一个展示串不合格式就把整条记录丢掉。
     */
    public static Instant parseOccurredAt(String isoDate, String hhmm) {
        LocalDate date;
        try {
            date = LocalDate.parse(isoDate);
        } catch (Exception ex) {
            date = LocalDate.now();
        }

        int hour = 0;
        int minute = 0;
        if (hhmm != null && hhmm.matches("\\d{1,2}:\\d{2}")) {
            String[] parts = hhmm.split(":");
            hour = Math.min(Integer.parseInt(parts[0]), 23);
            minute = Math.min(Integer.parseInt(parts[1]), 59);
        }

        return date.atTime(hour, minute).atZone(ZoneId.systemDefault()).toInstant();
    }
}
