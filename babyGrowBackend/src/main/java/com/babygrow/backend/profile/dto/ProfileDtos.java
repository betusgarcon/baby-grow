package com.babygrow.backend.profile.dto;

import java.util.List;

/**
 * 宝宝画像的请求/响应体。
 *
 * <p>形状与前端 {@code store/profile.ts} 的 ProfileState / ProfileInfoItem / ProfilePreference
 * 逐字段对齐——这批类型是前端已定的契约，后端按它实现，前端无需改动。
 */
public final class ProfileDtos {

    private ProfileDtos() {
    }

    public record ProfileStateResponse(String name,
                                       String birthday,
                                       List<InfoItem> info,
                                       List<Preference> preferences) {
    }

    /**
     * 档案里的一行属性。
     *
     * <p>{@code icon} 与 {@code circleClass}（Tailwind 类名）是纯展示提示，由后端透传以维持
     * 前端类型不变。这两项本应只存在于 UI 层，属于已知的耦合，后续把 icon/配色按 key
     * 收到前端本地映射后即可从本接口移除。
     */
    public record InfoItem(String key,
                           String icon,
                           String label,
                           String value,
                           List<String> options,
                           String circleClass) {
    }

    public record Preference(String id, String icon, String label, String value) {
    }

    /**
     * 前端的 PUT 体是 Partial&lt;ProfileState&gt;，各字段都可缺省。
     *
     * <p>{@code avatarUrl} 是单独补的：头像走「先上传、再把这个 URL 记到档案上」两步，
     * 而 {@code ProfileState} 里本来没有头像字段（导航栏那份来自精简档案
     * {@code BabyProfile.avatar}）。传空串表示清除头像。
     */
    public record ProfilePatchRequest(String name,
                                      String birthday,
                                      String avatarUrl,
                                      List<InfoItem> info,
                                      List<Preference> preferences) {
    }

    public record BabyProfileResponse(BabyProfile profile) {
    }

    /** 分析页头部用的精简档案 */
    public record BabyProfile(String id,
                              String name,
                              String ageLabel,
                              String statusLabel,
                              String avatar,
                              String gender,
                              String birthday) {
    }
}
