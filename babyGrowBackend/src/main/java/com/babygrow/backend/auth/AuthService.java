package com.babygrow.backend.auth;

import com.babygrow.backend.auth.dto.AuthDtos.LoginResponse;
import com.babygrow.backend.auth.dto.AuthDtos.MeResponse;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.common.ErrorCode;
import com.babygrow.backend.common.Messages;
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

    private final UserRepository userRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final BabyRepository babyRepository;
    private final JwtService jwtService;
    private final WechatApiClient wechatApiClient;
    private final AppProperties properties;
    private final Messages messages;

    public AuthService(UserRepository userRepository,
                       FamilyRepository familyRepository,
                       FamilyMemberRepository familyMemberRepository,
                       BabyRepository babyRepository,
                       JwtService jwtService,
                       WechatApiClient wechatApiClient,
                       AppProperties properties,
                       Messages messages) {
        this.userRepository = userRepository;
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.babyRepository = babyRepository;
        this.jwtService = jwtService;
        this.wechatApiClient = wechatApiClient;
        this.properties = properties;
        this.messages = messages;
    }

    /**
     * 登录。**只负责认人**。
     *
     * <p>此前这里会在首次登录时顺手把家庭、成员、宝宝一起开好，理由是「前端所有接口
     * 都以 baby 为中心」。那个理由本身没错，但代价是：「首次登录」必然产出一个孤儿
     * 家庭——用户还没来得及说自己是谁，就先被塞了一个家庭和一个叫「宝宝」的孩子；
     * 而 {@code FamilyService.accept} 随后又用「你已经有家庭了」把他挡在邀请之外，
     * 于是被邀请的人**永远加入不了**。
     *
     * <p>现在家庭由用户在引导页显式创建（{@code POST /api/family}）或用口令加入。
     * 没有家庭是一个合法状态，{@code /me} 会如实返回 familyId=null，前端据此引导。
     */
    @Transactional
    public LoginResponse login(String code) {
        String openid = resolveOpenid(code);

        UserEntity user = userRepository.findByWxOpenid(openid)
                .orElseGet(() -> {
                    log.info("首次登录，创建账号 openid={}", openid);
                    return userRepository.save(UserEntity.forOpenid(openid));
                });

        return new LoginResponse(jwtService.issue(user.getId()), toMeResponse(user));
    }

    /**
     * 确保开发账号存在（含家庭与宝宝），返回它的 userId。
     *
     * <p>供演示数据灌入使用：那时还没有人登录过，但数据必须挂在一个真实的账号下，
     * 否则接口的访问控制会把它挡在外面。
     *
     * <p>**只有这一条路还会自动开家庭**——它是开发用的脚手架，不是真实用户的首登路径。
     */
    @Transactional
    public Long ensureDevAccount() {
        UserEntity user = userRepository.findByWxOpenid(DEV_OPENID)
                .orElseGet(() -> userRepository.save(UserEntity.forOpenid(DEV_OPENID)));
        provisionFamilyAndBaby(user);
        return user.getId();
    }

    @Transactional(readOnly = true)
    public MeResponse describe(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new BizException(ErrorCode.UNAUTHORIZED, "账号不存在"));

        return toMeResponse(user);
    }

    /**
     * 组装 /me。
     *
     * <p>「没有家庭」是**合法状态**，不是异常：用户刚登录还没选择创建或加入时就是它。
     * 前端拿到 familyId=null 就送去引导页。
     */
    private MeResponse toMeResponse(UserEntity user) {
        FamilyMemberEntity membership = activeMembership(user.getId());

        if (membership == null) {
            return new MeResponse(user.getId(), user.getNickname(), user.getAvatarUrl(), null, null, null);
        }

        Long babyId = babyRepository.findFirstByFamilyIdOrderByIdAsc(membership.getFamilyId())
                .map(BabyEntity::getId)
                .orElse(null);

        return new MeResponse(user.getId(), user.getNickname(), user.getAvatarUrl(),
                membership.getFamilyId(), babyId, membership.getRole());
    }

    /** 开发账号的脚手架：没有家庭就开一个，连带一个默认宝宝 */
    private void provisionFamilyAndBaby(UserEntity user) {
        if (activeMembership(user.getId()) != null) {
            return;
        }

        FamilyEntity family = familyRepository.save(
                FamilyEntity.ownedBy(user.getId(), messages.get("ui.default.familyName")));
        familyMemberRepository.save(
                FamilyMemberEntity.active(family.getId(), user.getId(), FamilyMemberEntity.ROLE_ADMIN));
        babyRepository.save(BabyEntity.inFamily(family.getId(), messages.get("ui.default.babyName")));
        log.info("已为开发账号开好家庭与宝宝 userId={} familyId={}", user.getId(), family.getId());
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
