package com.babygrow.backend.common;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PageResponseTest {

    @Test
    void trimsToLimitAndExposesNextCursor() {
        PageResponse<Integer> page = PageResponse.of(List.of(1, 2, 3, 4), 3, String::valueOf);

        assertThat(page.items()).containsExactly(1, 2, 3);
        assertThat(page.hasMore()).isTrue();
        assertThat(page.nextCursor()).isEqualTo("3");
    }

    @Test
    void lastPageHasNoCursor() {
        PageResponse<Integer> page = PageResponse.of(List.of(1, 2), 3, String::valueOf);

        assertThat(page.items()).containsExactly(1, 2);
        assertThat(page.hasMore()).isFalse();
        assertThat(page.nextCursor()).isNull();
    }

    @Test
    void limitIsClamped() {
        assertThat(PageResponse.limit(null)).isEqualTo(20);
        assertThat(PageResponse.limit(0)).isEqualTo(1);
        assertThat(PageResponse.limit(999)).isEqualTo(100);
    }
}
