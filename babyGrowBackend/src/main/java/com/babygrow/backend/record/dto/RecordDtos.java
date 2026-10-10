package com.babygrow.backend.record.dto;

import java.util.List;

/**
 * 记录闭环的请求/响应体。
 *
 * <p>命名一律 camelCase，与前端 TS 一致；AI 服务那侧是 snake_case，在客户端处转换，
 * 不把两种风格混进同一层。
 */
public final class RecordDtos {

    private RecordDtos() {
    }

    /** 时间线条目，与前端 {@code store/timeline.ts} 的 JourneyEntry 逐字段对齐 */
    public record TimelineEntryResponse(String id,
                                        String date,
                                        String type,
                                        String filterKey,
                                        String time,
                                        String badge,
                                        String title,
                                        String image,
                                        String description,
                                        String amount,
                                        String method,
                                        String duration,
                                        Double progress,
                                        Integer wakingCount) {
    }

    /** 直接追加一条时间线（不经过 AI 识别） */
    public record TimelineAppendRequest(String date,
                                        String type,
                                        String filterKey,
                                        String time,
                                        String badge,
                                        String title,
                                        String image,
                                        String description,
                                        String amount,
                                        String method,
                                        String duration,
                                        Double progress,
                                        Integer wakingCount) {
    }

    /**
     * 媒体识别请求。图片/视频约 10-30s，因此这里只受理、不等待。
     *
     * <p>不含 baby_id：宝宝由服务端从登录态解析。
     *
     * @param sourceType IMAGE / VIDEO
     * @param mediaId    先经 POST /api/baby/media 上传得到的 id
     */
    public record RecognizeRequest(String sourceType, Long mediaId, String note) {
    }

    public record RecognizeResponse(Long taskId, String status) {
    }

    /** 任务轮询结果。result 在成功前为 null。 */
    public record AiTaskResponse(Long taskId, String status, Object result, String error) {
    }

    /**
     * 把用户确认后的识别草稿落库。
     *
     * <p>不含 baby_id：宝宝由服务端从登录态解析。
     *
     * @param title       时间线卡片标题（用户在结果页看到的那条）
     * @param description 卡片正文
     */
    public record CommitRequest(String source,
                                Long mediaId,
                                Long taskId,
                                String occurredAt,
                                String text,
                                String title,
                                String description,
                                List<MilestonePayload> milestones,
                                List<FoodPayload> food,
                                List<MilkPayload> milk,
                                List<SleepPayload> sleep,
                                List<MoodPayload> mood,
                                List<GrowthPayload> growth) {
    }

    public record MilestonePayload(String type, String event, Boolean isFirst) {
    }

    public record FoodPayload(String name, String category, Boolean isFirst) {
    }

    public record MilkPayload(String type, Integer amountMl, String period) {
    }

    public record SleepPayload(Integer durationMin, String quality, String note) {
    }

    public record MoodPayload(String mood, String trigger) {
    }

    /** 一次测量可以只填其中一项，比如只量了体重 */
    public record GrowthPayload(java.math.BigDecimal heightCm,
                                java.math.BigDecimal weightKg,
                                java.math.BigDecimal headCm) {
    }
}
