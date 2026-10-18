package com.babygrow.backend.family;

import com.babygrow.backend.access.FamilyAccessService;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.common.Messages;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.FamilyEntity;
import com.babygrow.backend.domain.FamilyMemberEntity;
import com.babygrow.backend.domain.UserEntity;
import com.babygrow.backend.family.FamilyDtos.CreateFamilyRequest;
import com.babygrow.backend.family.FamilyDtos.CreatedFamilyResponse;
import com.babygrow.backend.family.FamilyDtos.InvitePreview;
import com.babygrow.backend.family.FamilyDtos.MemberView;
import com.babygrow.backend.repository.BabyRepository;
import com.babygrow.backend.repository.FamilyMemberRepository;
import com.babygrow.backend.repository.FamilyRepository;
import com.babygrow.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/** 家庭成员与邀请。 */
@Service
public class FamilyService {

    private static final Logger log = LoggerFactory.getLogger(FamilyService.class);

    /** 邀请口令有效期，与设计稿的「72 小时内有效」一致 */
    private static final Duration INVITE_TTL = Duration.ofHours(72);

    /** family_members.display_name 是 VARCHAR(64) */
    private static final int DISPLAY_NAME_MAX_LENGTH = 64;

    /** babies.name 是 VARCHAR(64) */
    private static final int BABY_NAME_MAX_LENGTH = 64;

    /** 家庭名不专门收集：用户关心的是宝宝，家庭只是权限容器 */

    /** 头像底色轮换。展示层的东西，但契约要求接口下发 */
    private static final String[] AVATAR_CLASSES = {
            "bg-family-clay", "bg-family-sage", "bg-family-lilac", "bg-family-poster"};

    private static final String TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final FamilyAccessService accessService;
    private final FamilyMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final FamilyRepository familyRepository;
    private final BabyRepository babyRepository;
    private final Messages messages;

    public FamilyService(FamilyAccessService accessService,
                         FamilyMemberRepository memberRepository,
                         UserRepository userRepository,
                         FamilyRepository familyRepository,
                         BabyRepository babyRepository,
                         Messages messages) {
        this.accessService = accessService;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.familyRepository = familyRepository;
        this.babyRepository = babyRepository;
        this.messages = messages;
    }

    /**
     * 创建家庭并开好宝宝档案。**真实用户首次进入应用时走这条路。**
     *
     * <p>此前家庭是登录时自动建的，见 {@code AuthService.login} 的说明：那会让首次登录
     * 必然产出一个孤儿家庭，并把被邀请的人永远挡在 {@link #accept} 之外。现在创建是
     * 一个显式动作，用户在这里第一次给档案命名。
     *
     * <p>不做「已有家庭也能再建一个」：一个用户同时只能在一个家庭里 active（数据库有
     * 部分唯一索引兜着），允许多建只会得到一个说不清状态的账号。
     */
    @Transactional
    public CreatedFamilyResponse create(Long userId, CreateFamilyRequest request) {
        if (!memberRepository.findByUserIdAndStatus(userId, FamilyMemberEntity.STATUS_ACTIVE).isEmpty()) {
            throw BizException.badRequestKey("error.alreadyHasFamily");
        }

        String babyName = request.babyName() == null ? "" : request.babyName().trim();
        if (babyName.isEmpty()) {
            throw BizException.badRequestKey("error.babyNameRequired");
        }
        // babies.name 是 VARCHAR(64)
        if (babyName.length() > BABY_NAME_MAX_LENGTH) {
            throw BizException.badRequestKey("error.babyNameTooLong", BABY_NAME_MAX_LENGTH);
        }

        FamilyEntity family = familyRepository.save(
                FamilyEntity.ownedBy(userId, messages.get("ui.default.familyName")));
        memberRepository.save(FamilyMemberEntity.active(
                family.getId(), userId, FamilyMemberEntity.ROLE_ADMIN));

        BabyEntity baby = BabyEntity.inFamily(family.getId(), babyName);
        baby.setBirthday(parseBirthday(request.birthday()));
        BabyEntity saved = babyRepository.save(baby);

        log.info("用户 {} 创建了家庭 {}（宝宝 {}）", userId, family.getId(), saved.getId());

        return new CreatedFamilyResponse(family.getId(), saved.getId());
    }

    /**
     * 生日选填。格式不对时按「没填」处理而不是报错——创建家庭这一步不该因为一个
     * 可选字段把用户卡住，他之后可以在画像页补。
     */
    private static LocalDate parseBirthday(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw.trim());
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public List<MemberView> members(Long userId) {
        FamilyMemberEntity me = accessService.requireMembership(userId);

        return memberRepository.findByFamilyIdOrderByIdAsc(me.getFamilyId()).stream()
                .map(member -> toView(member, userId, me.isAdmin()))
                .toList();
    }

    /** 改角色。只有 admin 能做，且不能把最后一个 admin 降级——否则这个家庭就没人管了。 */
    @Transactional
    public MemberView updateRole(Long userId, String memberId, String role) {
        FamilyMemberEntity me = requireAdmin(userId);
        FamilyMemberEntity target = requireMemberInFamily(me.getFamilyId(), memberId);

        if (!isValidRole(role)) {
            throw BizException.badRequestKey("error.unknownRole", role);
        }
        if (FamilyMemberEntity.ROLE_ADMIN.equals(target.getRole())
                && !FamilyMemberEntity.ROLE_ADMIN.equals(role)
                && isLastAdmin(me.getFamilyId(), target)) {
            throw BizException.badRequestKey("error.keepOneAdmin");
        }

        target.setRole(role);
        return toView(memberRepository.save(target), userId, me.isAdmin());
    }

    /** 移除成员。不能移除自己，也不能把最后一个 admin 移除。 */
    @Transactional
    public void remove(Long userId, String memberId) {
        FamilyMemberEntity me = requireAdmin(userId);
        FamilyMemberEntity target = requireMemberInFamily(me.getFamilyId(), memberId);

        if (target.getId().equals(me.getId())) {
            throw BizException.badRequestKey("error.cannotRemoveSelf");
        }
        if (FamilyMemberEntity.ROLE_ADMIN.equals(target.getRole())
                && isLastAdmin(me.getFamilyId(), target)) {
            throw BizException.badRequestKey("error.keepOneAdmin");
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
            throw BizException.badRequestKey("error.displayNameRequired");
        }
        // family_members.display_name 是 VARCHAR(64)，超长会在写库时才炸成 409
        if (name.trim().length() > DISPLAY_NAME_MAX_LENGTH) {
            throw BizException.badRequestKey("error.displayNameTooLong", DISPLAY_NAME_MAX_LENGTH);
        }
        if (!isValidRole(role) || FamilyMemberEntity.ROLE_ADMIN.equals(role)) {
            // 邀请只能给 contributor / viewer：把管理员权限通过口令发出去太危险
            throw BizException.badRequestKey("error.inviteRoleInvalid");
        }

        FamilyMemberEntity member = FamilyMemberEntity.pending(
                me.getFamilyId(), name.trim(), role, newInviteToken(), Instant.now().plus(INVITE_TTL), userId);

        // 这里必须带上口令：创建者正要把它发给对方，这是口令唯一的「交到手上」时机。
        return toView(memberRepository.save(member), userId, true);
    }

    /** 受邀者凭口令加入。此时才把这条 pending 行挂到自己的账号上。 */
    @Transactional
    public FamilyDtos.AcceptedResponse accept(Long userId, String code) {
        FamilyMemberEntity invite = memberRepository.findByInviteTokenForUpdate(normalizeCode(code))
                .filter(member -> FamilyMemberEntity.STATUS_PENDING.equals(member.getStatus()))
                .orElseThrow(() -> BizException.notFoundKey("error.inviteInvalid"));

        if (invite.getInviteExpiresAt() != null && invite.getInviteExpiresAt().isBefore(Instant.now())) {
            throw BizException.badRequestKey("error.inviteExpired");
        }

        // 已经在别的家庭里就不加入第二个：当前阶段一个用户只对应一个家庭
        if (!memberRepository.findByUserIdAndStatus(userId, FamilyMemberEntity.STATUS_ACTIVE).isEmpty()) {
            throw BizException.badRequestKey("error.alreadyHasFamily");
        }

        invite.accept(userId);

        // 受邀者登录时已经自动开过一个只属于自己的家庭，加入别人的之后那个空家庭就多余了。
        // 这里不删——它的数据可能还被引用；留待后续做「切换家庭」时再处理。
        memberRepository.save(invite);
        log.info("用户 {} 凭口令加入家庭 {}", userId, invite.getFamilyId());

        return new FamilyDtos.AcceptedResponse(invite.getFamilyId(), invite.getRole());
    }

    /**
     * 凭口令预览一条邀请，供受邀者在接受之前确认。
     *
     * <p>刻意**不要求成员身份**——这正是它的用途；但要求登录（口令是凭据，而这里
     * 只回展示信息，不建立任何关系）。
     *
     * <p>不加写锁：预览是只读的，没有必要和接受路径争同一把锁。
     */
    @Transactional(readOnly = true)
    public InvitePreview previewInvite(String code) {
        FamilyMemberEntity invite = memberRepository.findByInviteToken(normalizeCode(code))
                .filter(member -> FamilyMemberEntity.STATUS_PENDING.equals(member.getStatus()))
                .orElseThrow(() -> BizException.notFoundKey("error.inviteInvalid"));

        String babyName = babyRepository.findFirstByFamilyIdOrderByIdAsc(invite.getFamilyId())
                .map(BabyEntity::getName)
                .orElse("");

        Instant expiresAt = invite.getInviteExpiresAt();
        boolean expired = expiresAt != null && expiresAt.isBefore(Instant.now());

        return new InvitePreview(
                babyName,
                invite.getDisplayName(),
                invite.getRole(),
                inviterNickname(invite.getInvitedBy()),
                expiresAt == null ? null : expiresAt.toString(),
                expired);
    }

    /** 口令大小写不敏感：后端按大写存，用户手抄时经常写成小写 */
    private static String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw BizException.badRequestKey("error.inviteCodeRequired");
        }
        return code.trim().toUpperCase();
    }

    /** 邀请人的昵称。目前通常为 null，见 {@link InvitePreview} 的说明 */
    private String inviterNickname(Long userId) {
        if (userId == null) {
            return null;
        }

        return userRepository.findById(userId)
                .map(UserEntity::getNickname)
                .filter(name -> name != null && !name.isBlank())
                .orElse(null);
    }

    /* ------------------------------------------------------------------ */

    /**
     * @param includeInviteCode 是否带上待接受邀请的口令。
     *
     * <p>口令是**加入家庭的凭据**，谁能看到谁就能把人拉进来。此前无论谁调
     * {@code GET /api/family/members} 都会拿到所有待接受邀请的明文口令——于是一个
     * 只读的 viewer 也能把口令转给外人，对方凭它加入即成为可写的 contributor。
     * 因此只在两处放行：admin 查列表时，以及邀请创建者拿到刚签发的那个口令时。
     */
    private MemberView toView(FamilyMemberEntity member, Long currentUserId, boolean includeInviteCode) {
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
                includeInviteCode ? member.getInviteToken() : null,
                includeInviteCode && member.getInviteExpiresAt() != null
                        ? member.getInviteExpiresAt().toString()
                        : null);
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
        return messages.get("ui.default.memberName");
    }

    private String roleLabel(String role, String status) {
        String base = switch (role) {
            case FamilyMemberEntity.ROLE_ADMIN -> messages.get("ui.family.role.admin");
            case FamilyMemberEntity.ROLE_CONTRIBUTOR -> messages.get("ui.family.role.contributor");
            default -> messages.get("ui.family.role.viewer");
        };
        return FamilyMemberEntity.STATUS_PENDING.equals(status)
                ? messages.get("ui.family.role.pending", base) : base;
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
            throw BizException.forbiddenKey("error.adminOnly");
        }
        return me;
    }

    private FamilyMemberEntity requireWritable(Long userId) {
        FamilyMemberEntity me = accessService.requireMembership(userId);
        if (!me.canWrite()) {
            throw BizException.forbiddenKey("error.contributorCannotInvite");
        }
        return me;
    }

    private FamilyMemberEntity requireMemberInFamily(Long familyId, String memberId) {
        Long id = parseId(memberId);
        return memberRepository.findById(id)
                .filter(member -> member.getFamilyId().equals(familyId))
                .orElseThrow(() -> BizException.notFoundKey("error.memberNotFound"));
    }

    private static Long parseId(String memberId) {
        try {
            return Long.valueOf(memberId);
        } catch (NumberFormatException ex) {
            throw BizException.badRequestKey("error.invalidMemberId");
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
        throw BizException.badRequestKey("error.inviteGenerateFailed");
    }

    private static String randomGroup(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append(TOKEN_ALPHABET.charAt(RANDOM.nextInt(TOKEN_ALPHABET.length())));
        }
        return builder.toString();
    }
}
