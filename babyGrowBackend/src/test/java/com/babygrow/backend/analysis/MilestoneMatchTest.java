package com.babygrow.backend.analysis;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 里程碑与目录的匹配。
 *
 * <p>这个判断错了不会报错，只会让同一个里程碑在进度里出现两次（一次「已解锁」、
 * 一次凭空多出来的自定义项），所以把边界钉在测试里。
 */
class MilestoneMatchTest {

    @Test
    void matchesWhenOnlyDecorationDiffers() {
        // AI 常抽出「首次翻身」，目录里写的是「学会翻身」——直接子串比较会对不上
        assertThat(RecordProjectionService.matchesMilestone("首次翻身", "学会翻身")).isTrue();
        assertThat(RecordProjectionService.matchesMilestone("第一次独坐", "独坐")).isTrue();
        assertThat(RecordProjectionService.matchesMilestone("会爬了", "会爬")).isTrue();
    }

    @Test
    void matchesExactTitles() {
        assertThat(RecordProjectionService.matchesMilestone("第一颗牙", "第一颗牙")).isTrue();
        assertThat(RecordProjectionService.matchesMilestone("独立行走", "独立行走")).isTrue();
    }

    @Test
    void doesNotMatchDifferentMilestones() {
        assertThat(RecordProjectionService.matchesMilestone("首次翻身", "会爬")).isFalse();
        assertThat(RecordProjectionService.matchesMilestone("第一颗牙", "第一个词")).isFalse();
    }

    @Test
    void doesNotMatchWhenEitherSideNormalizesToNothing() {
        // 全是修饰词时归一化为空，此时若做包含判断会「什么都匹配」，必须拒绝
        assertThat(RecordProjectionService.matchesMilestone("第一次", "学会")).isFalse();
        assertThat(RecordProjectionService.matchesMilestone("", "翻身")).isFalse();
    }

    @Test
    void stripsDecorationFromBothSides() {
        assertThat(RecordProjectionService.normalizeMilestone("首次学会翻身")).isEqualTo("翻身");
    }
}
