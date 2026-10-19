package com.babygrow.backend.support;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** 先验证测试底座本身：容器、迁移、登录与家庭创建都能跑通。 */
class HarnessSmokeTest extends IntegrationTestBase {

    @Test
    void loginAndCreateFamily() {
        String token = login();
        long familyId = createFiveMonthFamily(token);

        assertThat(familyId).isPositive();

        TestResponse members = get("/api/family/members", token);
        assertThat(members.status()).isEqualTo(200);
        assertThat(members.data().isArray()).isTrue();
        assertThat(members.data().size()).isEqualTo(1);
    }

    @Test
    void unauthenticatedRequestReturnsLocalizedJson() {
        TestResponse zh = get("/api/baby/profile", null);
        assertThat(zh.status()).isEqualTo(401);
        assertThat(zh.body().path("code").asInt()).isEqualTo(40100);
        assertThat(zh.message()).isEqualTo("未登录或登录已过期");

        TestResponse en = request(org.springframework.http.HttpMethod.GET, "/api/baby/profile", null, null);
        // 这里只验证结构；语言由独立用例覆盖
        assertThat(en.body().path("code").asInt()).isEqualTo(40100);
    }
}
