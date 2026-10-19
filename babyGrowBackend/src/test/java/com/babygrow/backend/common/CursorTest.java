package com.babygrow.backend.common;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CursorTest {

    @Test
    void roundTripsAllParts() {
        String cursor = Cursor.encode("2026-10-19", "1792299600000", "38");

        assertThat(Cursor.decode(cursor, 3))
                .containsExactly("2026-10-19", "1792299600000", "38");
    }

    @Test
    void blankMeansFirstPage() {
        assertThat(Cursor.decode(null, 3)).isNull();
        assertThat(Cursor.decode("", 3)).isNull();
        assertThat(Cursor.decode("   ", 3)).isNull();
    }

    @Test
    void rejectsMalformedCursor() {
        assertThatThrownBy(() -> Cursor.decode("not-a-cursor", 3))
                .isInstanceOf(BizException.class);
    }

    @Test
    void rejectsWrongPartCount() {
        assertThatThrownBy(() -> Cursor.decode(Cursor.encode("a", "b"), 3))
                .isInstanceOf(BizException.class);
    }
}
