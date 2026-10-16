package com.babygrow.backend.family;

import java.util.List;

/**
 * 家庭分享接口的请求/响应体。
 *
 * <p>{@code MemberView} 与前端 {@code store/family.ts} 的 {@code FamilyMember} 对齐，
 * 另加 {@code status} 与 {@code inviteCode}：前者用来区分「已加入」和「待接受」，
 * 后者让邀请页能显示真实的邀请口令而不是写死的样例。
 */
public final class FamilyDtos {

    private FamilyDtos() {
    }

    public record MemberView(String id,
                             String name,
                             String roleLabel,
                             String role,
                             String initial,
                             String avatarClass,
                             Boolean isSelf,
                             String status,
                             String inviteCode,
                             String inviteExpiresAt) {
    }

    /** 前端 PUT/DELETE 都把参数放在请求体里 */
    public record MemberIdRequest(String id, String role) {
    }

    public record InviteRequest(String name, String role) {
    }

    public record AcceptInviteRequest(String code) {
    }

    public record AcceptedResponse(Long familyId, String role) {
    }

    public record MemberListResponse(List<MemberView> members) {
    }

    /**
     * 创建家庭。真实用户首次进入应用时走这条路。
     *
     * <p>宝宝名字必填——这是用户第一次有机会给这个档案命名，直接问比先塞一个
     * 默认的「宝宝」再让他去画像页改要好。
     *
     * <p>生日选填，但强烈建议填：月龄是喂养建议（比如「4 个月以下不建议添加辅食」）
     * 和生长曲线的输入。缺了它，那些以月龄为条件的建议只能走最保守的分支。
     */
    public record CreateFamilyRequest(String babyName, String birthday) {
    }

    public record CreatedFamilyResponse(Long familyId, Long babyId) {
    }
}
