package com.babygrow.backend.family;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.FamilyMemberEntity;
import com.babygrow.backend.domain.UserEntity;
import com.babygrow.backend.family.FamilyDtos.MemberView;
import com.babygrow.backend.repository.FamilyMemberRepository;
import com.babygrow.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** 家庭成员与邀请。 */
@Service
public class FamilyService {

    private static final Logger log = LoggerFactory.getLogger(FamilyService.class);

    /** 邀请口令有效期，与设计稿的「72 小时内有效」一致 */
    private static final Duration INVITE_TTL = Duration.ofHours(72);

    /** 头像底色轮换。展示层的东西，但契约要求接口下发 */
    private static final String[] AVATAR_CLASSES = {
            "bg-family-clay", "bg-family-sage", "bg-family-lilac", "bg-family-poster"};

    private static final String TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final FamilyAccessService accessService;
    private final FamilyMemberRepository memberRepository;
    private final UserRepository userRepository;

    public FamilyService(FamilyAccessService accessService,
                         FamilyMemberRepository memberRepository,
                         UserRepository userRepository) {
        this.accessService = accessService;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<MemberView> members(Long userId) {
        FamilyMemberEntity me = accessService.requireMembership(userId);

        return memberRepository.findByFamilyIdOrderByIdAsc(me.getFamilyId()).stream()
                .map(member -> toView(member, userId))
                .toList();
    }

    /** 改角色。只有 admin 能做，且不能把最后一个 admin 降级——否则这个家庭就没人管了。 */
    @Transactional
    public MemberView updateRole(Long userId, String memberId, String role) {
        FamilyMemberEntity me = requireAdmin(userId);
        FamilyMemberEntity target = requireMemberInFamily(me.getFamilyId(), memberId);

        if (!isValidRole(role)) {
            throw BizException.badRequest("未知角色：" + role);
        }
        if (FamilyMemberEntity.ROLE_ADMIN.equals(target.getRole())
                && !FamilyMemberEntity.ROLE_ADMIN.equals(role)
                && isLastAdmin(me.getFamilyId(), target)) {
            throw BizException.badRequest("至少要保留一名管理员");
        }

        target.setRole(role);
        return toView(memberRepository.save(target), userId);
    }

    /** 移除成员。不能移除自己，也不能把最后一个 admin 移除。 */
    @Transactional
    public void remove(Long userId, String memberId) {
        FamilyMemberEntity me = requireAdmin(userId);
        FamilyMemberEntity target = requireMemberInFamily(me.getFamilyId(), memberId);

        if (target.getId().equals(me.getId())) {
            throw BizException.badRequest("不能移除自己");
        }
        if (FamilyMemberEntity.ROLE_ADMIN.equals(target.getRole())
                && isLastAdmin(me.getFamilyId(), target)) {
            throw BizException.badRequest("至少要保留一名管理员");
        }

        memberRepository.delete(target);
    }

    /**
     * 邀请一位还没有账号的亲友。
     *
     * <p>只建一条 pending 行并签发一次性口令；对方用自己的微信登录后凭口令加入，
     * 这时才会挂上账号（见 {@link #accept}）。
     */
    @Transactional
    public MemberView invite(Long userId, String name, String role) {
        FamilyMemberEntity me = requireWritable(userId);

        if (name == null || name.isBlank()) {
            throw BizException.badRequest("请填写称呼");
        }
        if (!isValidRole(role) || FamilyMemberEntity.ROLE_ADMIN.equals(role)) {
            // 邀请只能给 contributor / viewer：把管理员权限通过口令发出去太危险
            throw BizException.badRequest("邀请只能选择协作者或只读看护者");
        }

        FamilyMemberEntity member = FamilyMemberEntity.pending(
                me.getFamilyId(), name.trim(), role, newInviteToken(), Instant.now().plus(INVITE_TTL), userId);

        return toView(memberRepository.save(member), userId);
    }

    /** 受邀者凭口令加入。此时才把这条 pending 行挂到自己的账号上。 */
    @Transactional
    public FamilyDtos.AcceptedResponse accept(Long userId, String code) {
        if (code == null || code.isBlank()) {
            throw BizException.badRequest("请填写邀请口令");
        }

        FamilyMemberEntity invite = memberRepository.findByInviteToken(code.trim().toUpperCase())
                .filter(member -> FamilyMemberEntity.STATUS_PENDING.equals(member.getStatus()))
                .orElseThrow(() -> BizException.notFound("邀请口令无效或已被使用"));

        if (invite.getInviteExpiresAt() != null && invite.getInviteExpiresAt().isBefore(Instant.now())) {
            throw BizException.badRequest("邀请口令已过期，请让家人重新邀请");
        }

        // 已经在别的家庭里就不加入第二个：当前阶段一个用户只对应一个家庭
        if (!memberRepository.findByUserIdAndStatus(userId, FamilyMemberEntity.STATUS_ACTIVE).isEmpty()) {
            throw BizException.badRequest("你已经有家庭了");
        }

        invite.accept(userId);

        // 受邀者登录时已经自动开过一个只属于自己的家庭，加入别人的之后那个空家庭就多余了。
        // 这里不删——它的数据可能还被引用；留待后续做「切换家庭」时再处理。
        memberRepository.save(invite);
        log.info("用户 {} 凭口令加入家庭 {}", userId, invite.getFamilyId());

        return new FamilyDtos.AcceptedResponse(invite.getFamilyId(), invite.getRole());
    }

    /* ------------------------------------------------------------------ */

    private MemberView toView(FamilyMemberEntity member, Long currentUserId) {
        String name = resolveName(member);
        boolean self = member.getUserId() != null && member.getUserId().equals(currentUserId);

        return new MemberView(
                String.valueOf(member.getId()),
                self ? name + " (You)" : name,
                roleLabel(member.getRole(), member.getStatus()),
                member.getRole(),
                initialOf(name),
                member.getAvatarClass() == null ? AVATAR_CLASSES[0] : member.getAvatarClass(),
                self,
                member.getStatus(),
                member.getInviteToken(),
                member.getInviteExpiresAt() == null ? null : member.getInviteExpiresAt().toString());
    }

    private String resolveName(FamilyMemberEntity member) {
        if (member.getDisplayName() != null && !member.getDisplayName().isBlank()) {
            return member.getDisplayName();
        }
        if (member.getUserId() != null) {
            UserEntity user = userRepository.findById(member.getUserId()).orElse(null);
            if (user != null) {
                if (user.getNickname() != null && !user.getNickname().isBlank()) {
                    return user.getNickname();
                }
            }
        }
        return "家庭成员";
    }

    private static String roleLabel(String role, String status) {
        String base = switch (role) {
            case FamilyMemberEntity.ROLE_ADMIN -> "Admin · Full Access";
            case FamilyMemberEntity.ROLE_CONTRIBUTOR -> "Contributor · Can Record";
            default -> "Viewer · Read Only";
        };
        return FamilyMemberEntity.STATUS_PENDING.equals(status) ? base + " · Pending" : base;
    }

    private static String initialOf(String name) {
        return name == null || name.isEmpty() ? "·" : name.substring(0, 1).toUpperCase();
    }

    private static boolean isValidRole(String role) {
        return FamilyMemberEntity.ROLE_ADMIN.equals(role)
                || FamilyMemberEntity.ROLE_CONTRIBUTOR.equals(role)
                || FamilyMemberEntity.ROLE_VIEWER.equals(role);
    }

    private boolean isLastAdmin(Long familyId, FamilyMemberEntity candidate) {
        long admins = memberRepository.findByFamilyIdOrderByIdAsc(familyId).stream()
                .filter(FamilyMemberEntity::isAdmin)
                .count();
        return admins <= 1 && candidate.isAdmin();
    }

    private FamilyMemberEntity requireAdmin(Long userId) {
        FamilyMemberEntity me = accessService.requireMembership(userId);
        if (!me.isAdmin()) {
            throw BizException.forbidden("只有管理员可以管理成员");
        }
        return me;
    }

    private FamilyMemberEntity requireWritable(Long userId) {
        FamilyMemberEntity me = accessService.requireMembership(userId);
        if (!me.canWrite()) {
            throw BizException.forbidden("当前角色不能邀请成员");
        }
        return me;
    }

    private FamilyMemberEntity requireMemberInFamily(Long familyId, String memberId) {
        Long id = parseId(memberId);
        return memberRepository.findById(id)
                .filter(member -> member.getFamilyId().equals(familyId))
                .orElseThrow(() -> BizException.notFound("成员不存在"));
    }

    private static Long parseId(String memberId) {
        try {
            return Long.valueOf(memberId);
        } catch (NumberFormatException ex) {
            throw BizException.badRequest("成员标识不合法");
        }
    }

    /** 生成一个人类可读、又不易猜的邀请口令；撞了唯一索引就重试 */
    private String newInviteToken() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String token = randomGroup(3) + "-" + randomGroup(3) + "-" + randomGroup(3);
            if (memberRepository.findByInviteToken(token).isEmpty()) {
                return token;
            }
        }
        throw BizException.badRequest("邀请口令生成失败，请重试");
    }

    private static String randomGroup(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append(TOKEN_ALPHABET.charAt(RANDOM.nextInt(TOKEN_ALPHABET.length())));
        }
        return builder.toString();
    }
}
