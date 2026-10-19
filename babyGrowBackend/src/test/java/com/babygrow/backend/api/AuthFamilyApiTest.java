package com.babygrow.backend.api;

import com.babygrow.backend.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class AuthFamilyApiTest extends IntegrationTestBase {

    @Test
    void loginReturnsTokenAndMe() {
        String token = login();

        TestResponse me = get("/api/auth/me", token);
        assertThat(me.status()).isEqualTo(200);
        assertThat(me.data().path("userId").asLong()).isPositive();
        assertThat(me.data().has("familyId")).isTrue();
    }

    @Test
    void unauthenticatedRequestsReturnLocalizedJson() {
        TestResponse zh = get("/api/baby/profile", null);
        assertThat(zh.status()).isEqualTo(401);
        assertThat(zh.body().path("code").asInt()).isEqualTo(40100);
        assertThat(zh.message()).isEqualTo("未登录或登录已过期");

        TestResponse en = get("/api/baby/profile", null, "en");
        assertThat(en.status()).isEqualTo(401);
        assertThat(en.message()).isEqualTo("Not signed in, or your session has expired");
    }

    @Test
    void createFamilyValidatesBabyName() {
        String token = login();

        TestResponse missing = post("/api/family", Map.of("babyName", "  "), token);
        assertThat(missing.status()).isEqualTo(400);
        assertThat(missing.body().path("code").asInt()).isEqualTo(40000);
        assertThat(missing.message()).contains("宝宝");

        TestResponse ok = post("/api/family", Map.of(
                "babyName", "小满",
                "birthday", LocalDate.now().minusMonths(5).toString()), token);
        assertThat(ok.status()).isEqualTo(200);
        assertThat(ok.data().path("familyId").asLong()).isPositive();
        assertThat(ok.data().path("babyId").asLong()).isPositive();
    }

    @Test
    void cannotCreateSecondFamily() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse again = post("/api/family", Map.of("babyName", "第二个"), token);
        assertThat(again.status()).isEqualTo(400);
        assertThat(again.message()).contains("已经有家庭");
    }

    @Test
    void membersListShowsAdmin() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse members = get("/api/family/members", token);
        assertThat(members.status()).isEqualTo(200);
        assertThat(members.data().size()).isEqualTo(1);
        assertThat(members.data().get(0).path("role").asText()).isEqualTo("admin");
        assertThat(members.data().get(0).path("roleLabel").asText()).contains("管理员");
    }

    @Test
    void inviteRejectsInvalidRole() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse response = post("/api/family/invite",
                Map.of("name", "奶奶", "role", "admin"), token);
        assertThat(response.status()).isEqualTo(400);
        assertThat(response.message()).contains("协作者");
    }

    @Test
    void invitePreviewAndAcceptFlow() {
        String admin = login();
        createFiveMonthFamily(admin);

        TestResponse invite = post("/api/family/invite",
                Map.of("name", "外婆", "role", "contributor"), admin);
        assertThat(invite.status()).isEqualTo(200);
        String code = invite.data().path("inviteCode").asText();
        assertThat(code).isNotBlank();

        TestResponse preview = get("/api/family/invite?code=" + code, admin);
        assertThat(preview.status()).isEqualTo(200);
        assertThat(preview.data().path("role").asText()).isEqualTo("contributor");
        assertThat(preview.data().path("babyName").asText()).isNotBlank();

        long inviteeId = insertUser("invitee-flow-" + System.nanoTime());
        String invitee = tokenFor(inviteeId);

        TestResponse accept = post("/api/family/invite/accept", Map.of("code", code), invitee);
        assertThat(accept.status()).isEqualTo(200);
        assertThat(accept.data().path("role").asText()).isEqualTo("contributor");

        TestResponse members = get("/api/family/members", admin);
        assertThat(members.data().size()).isEqualTo(2);

        // 口令是一次性的：第二个账号再用同一个 code 必须失败
        long otherId = insertUser("invitee-reuse-" + System.nanoTime());
        TestResponse reuse = post("/api/family/invite/accept",
                Map.of("code", code), tokenFor(otherId));
        assertThat(reuse.status()).isEqualTo(404);
        assertThat(reuse.message()).contains("无效");
    }

    @Test
    void invalidInviteCodeIsRejected() {
        String token = login();
        createFiveMonthFamily(token);

        TestResponse response = get("/api/family/invite?code=NOT-A-CODE", token);
        assertThat(response.status()).isEqualTo(404);
    }

    @Test
    void contributorCannotInviteAndViewerCannotWrite() {
        String admin = login();
        createFiveMonthFamily(admin);

        // 协作者可以记录，也可以邀请；只读成员两者都不行
        String contributor = inviteAndAccept(admin, "contributor");
        TestResponse contributorInvite = post("/api/family/invite",
                Map.of("name", "新人", "role", "viewer"), contributor);
        assertThat(contributorInvite.status()).isEqualTo(200);

        String viewer = inviteAndAccept(admin, "viewer");
        TestResponse deniedInvite = post("/api/family/invite",
                Map.of("name", "另一个", "role", "viewer"), viewer);
        assertThat(deniedInvite.status()).isEqualTo(403);

        TestResponse deniedMemory = post("/api/family/memories",
                Map.of("category", "Milestone", "title", "只读不能写", "date", LocalDate.now().toString()),
                viewer);
        assertThat(deniedMemory.status()).isEqualTo(403);
        assertThat(deniedMemory.message()).contains("不能新增记忆");
    }

    @Test
    void adminCanChangeRoleAndRemoveMember() {
        String admin = login();
        long familyId = createFiveMonthFamily(admin);

        TestResponse invite = post("/api/family/invite",
                Map.of("name", "爷爷", "role", "contributor"), admin);
        String code = invite.data().path("inviteCode").asText();
        long memberUserId = insertUser("member-role-" + System.nanoTime());
        String memberToken = tokenFor(memberUserId);
        post("/api/family/invite/accept", Map.of("code", code), memberToken);

        TestResponse members = get("/api/family/members", admin);
        String memberId = members.data().get(1).path("id").asText();

        TestResponse updated = put("/api/family/members",
                Map.of("id", memberId, "role", "viewer"), admin);
        assertThat(updated.status()).isEqualTo(200);

        TestResponse afterUpdate = get("/api/family/members", admin);
        assertThat(afterUpdate.data().get(1).path("role").asText()).isEqualTo("viewer");

        TestResponse removed = delete("/api/family/members", Map.of("id", memberId), admin);
        assertThat(removed.status()).isEqualTo(200);

        TestResponse finalList = get("/api/family/members", admin);
        assertThat(finalList.data().size()).isEqualTo(1);
        assertThat(babyId(familyId)).isPositive();
    }

    @Test
    void cannotRemoveLastAdmin() {
        String admin = login();
        createFiveMonthFamily(admin);

        String selfId = get("/api/family/members", admin).data().get(0).path("id").asText();
        TestResponse response = delete("/api/family/members", Map.of("id", selfId), admin);
        assertThat(response.status()).isEqualTo(400);
        assertThat(response.message()).contains("自己");
    }

    @Test
    void userWithoutFamilyCannotReadBabyData() {
        long userId = insertUser("familyless-" + System.nanoTime());
        String token = tokenFor(userId);

        TestResponse response = get("/api/baby/profile", token);
        assertThat(response.status()).isEqualTo(403);
        assertThat(response.message()).contains("不属于任何家庭");
    }
}
