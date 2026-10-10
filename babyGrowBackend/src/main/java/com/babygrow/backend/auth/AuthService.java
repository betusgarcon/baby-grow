package com.babygrow.backend.auth;

import com.babygrow.backend.auth.dto.AuthDtos.LoginResponse;
import com.babygrow.backend.auth.dto.AuthDtos.MeResponse;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.config.AppProperties;
import com.babygrow.backend.config.JwtService;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.FamilyEntity;
import com.babygrow.backend.domain.FamilyMemberEntity;
import com.babygrow.backend.domain.UserEntity;
import com.babygrow.backend.repository.BabyRepository;
import com.babygrow.backend.repository.FamilyMemberRepository;
import com.babygrow.backend.repository.FamilyRepository;
import com.babygrow.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    /** dev-mode 下所有请求都归到这一个账号，便于反复调同一份数据 */
    private static final String DEV_OPENID = "dev-openid-local";
    private static final String DEFAULT_FAMILY_NAME = "我的家庭";
    private static final String DEFAULT_BABY_NAME = "宝宝";

    private final UserRepository userRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final BabyRepository babyRepository;
    private final JwtService jwtService;
    private final WechatApiClient wechatApiClient;
    private final AppProperties properties;

    public AuthService(UserRepository userRepository,
                       FamilyRepository familyRepository,
                       FamilyMemberRepository familyMemberRepository,
                       BabyRepository babyRepository,
                       JwtService jwtService,
                       WechatApiClient wechatApiClient,
                       AppProperties properties) {
        this.userRepository = userRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.babyRepository = babyRepository;
        this.jwtService = jwtService;
        this.wechatApiClient = wechatApiClient;
        this.properties = properties;
    }

    /**
     * 登录，并在首次登录时把家庭 / 成员 / 宝宝一并开好。
     *
     * <p>开号这一步是必须的：前端所有接口都以 baby 为中心，若新用户没有 baby，
     * 首次进入的每个页面都会拿到空。这里只建最小骨架，生日等真值留给用户自己填。
     */
    @Transactional
    public LoginResponse login(String code) {
        String openid = resolveOpenid(code);

        UserEntity user = userRepository.findByWxOpenid(openid)
                .orElseGet(() -> {
                    log.info("首次登录，创建账号 openid={}", openid);
                    return userRepository.save(UserEntity.forOpenid(openid));
                });

        MeResponse me = provisionAndDescribe(user);
        return new LoginResponse(jwtService.issue(user.getId()), me);
    }

    @Transactional(readOnly = true)
    public MeResponse describe(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new BizException(com.babygrow.backend.common.ErrorCode.UNAUTHORIZED, "账号不存在"));

        FamilyMemberEntity membership = activeMembership(userId);
        if (membership == null) {
            // 理论上不会发生（登录时已开号），保底避免 NPE
            return new MeResponse(user.getId(), user.getNickname(), user.getAvatarUrl(), null, null, null);
        }

        Long babyId = babyRepository.findFirstByFamilyIdOrderByIdAsc(membership.getFamilyId())
                .map(BabyEntity::getId)
                .orElse(null);

        return new MeResponse(user.getId(), user.getNickname(), user.getAvatarUrl(),
                membership.getFamilyId(), babyId, membership.getRole());
    }

    private MeResponse provisionAndDescribe(UserEntity user) {
        FamilyMemberEntity membership = activeMembership(user.getId());

        if (membership == null) {
            FamilyEntity family = familyRepository.save(
                    FamilyEntity.ownedBy(user.getId(), DEFAULT_FAMILY_NAME));
            membership = familyMemberRepository.save(
                    FamilyMemberEntity.active(family.getId(), user.getId(), FamilyMemberEntity.ROLE_ADMIN));
            babyRepository.save(BabyEntity.inFamily(family.getId(), DEFAULT_BABY_NAME));
            log.info("已为新账号开好家庭与宝宝 userId={} familyId={}", user.getId(), family.getId());
        }

        Long babyId = babyRepository.findFirstByFamilyIdOrderByIdAsc(membership.getFamilyId())
                .map(BabyEntity::getId)
                .orElse(null);

        return new MeResponse(user.getId(), user.getNickname(), user.getAvatarUrl(),
                membership.getFamilyId(), babyId, membership.getRole());
    }

    private FamilyMemberEntity activeMembership(Long userId) {
        return familyMemberRepository
                .findByUserIdAndStatus(userId, FamilyMemberEntity.STATUS_ACTIVE)
                .stream()
                .findFirst()
                .orElse(null);
    }

    private String resolveOpenid(String code) {
        if (properties.auth().devMode()) {
            return DEV_OPENID;
        }
        return wechatApiClient.exchangeOpenid(code);
    }
}
