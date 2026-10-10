package com.babygrow.backend.family;

import java.util.List;

/**
 * 分享海报接口的响应体。
 *
 * <p>海报的正文由宝宝档案 + 最近一条记录推导；模板选项与隐私开关是纯展示配置，
 * 与情绪打卡选项同理——契约要求接口下发，但它们本身没有业务含义。
 */
public final class PosterDtos {

    private PosterDtos() {
    }

    public record TemplateView(String key, String label, String icon) {
    }

    public record PrivacyToggleView(String key, String label, String note, boolean defaultOn) {
    }

    public record PosterView(String title,
                             String subtitle,
                             String badge,
                             String heading,
                             String body,
                             String meta,
                             List<TemplateView> templates,
                             List<PrivacyToggleView> toggles) {
    }
}
