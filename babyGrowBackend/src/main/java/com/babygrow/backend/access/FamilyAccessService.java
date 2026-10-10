package com.babygrow.backend.access;

import com.babygrow.backend.common.BizException;
import com.babygrow.backend.domain.BabyEntity;
import com.babygrow.backend.domain.FamilyMemberEntity;
import com.babygrow.backend.repository.BabyRepository;
import com.babygrow.backend.repository.FamilyMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 数据隔离的唯一入口。
 *
 * <p>任何业务域想知道「这个 token 对应哪个宝宝」，都必须走这里，不要在各自的服务里
 * 重新查一遍成员表——否则隔离规则会散落成 N 份，早晚有一份写漏。
 *
 * <p>当前阶段一个用户一个家庭、一个家庭一个宝宝，因此「按用户取宝宝」是确定性的。
 * 将来支持多宝宝时，只需要在方法签名上加 babyId 并在此处校验归属。
 */
@Service
public class FamilyAccessService {

    private final FamilyMemberRepository familyMemberRepository;
    private final BabyRepository babyRepository;

    public FamilyAccessService(FamilyMemberRepository familyMemberRepository,
                               BabyRepository babyRepository) {
        this.familyMemberRepository = familyMemberRepository;
        this.babyRepository = babyRepository;
    }

    @Transactional(readOnly = true)
    public FamilyMemberEntity requireMembership(Long userId) {
        return familyMemberRepository
                .findByUserIdAndStatus(userId, FamilyMemberEntity.STATUS_ACTIVE)
                .stream()
                .findFirst()
                .orElseThrow(() -> BizException.forbidden("当前账号不属于任何家庭"));
    }

    @Transactional(readOnly = true)
    public BabyEntity requireBaby(Long userId) {
        FamilyMemberEntity membership = requireMembership(userId);
        return babyRepository.findFirstByFamilyIdOrderByIdAsc(membership.getFamilyId())
                .orElseThrow(() -> BizException.notFound("该家庭下还没有宝宝档案"));
    }

    /** 写操作前调用。viewer 角色只读。 */
    @Transactional(readOnly = true)
    public BabyEntity requireWritableBaby(Long userId) {
        FamilyMemberEntity membership = requireMembership(userId);
        if (!membership.canWrite()) {
            throw BizException.forbidden("当前角色没有修改权限");
        }
        return babyRepository.findFirstByFamilyIdOrderByIdAsc(membership.getFamilyId())
                .orElseThrow(() -> BizException.notFound("该家庭下还没有宝宝档案"));
    }

    /**
     * 按家庭取宝宝。
     *
     * <p>给「家庭级」的数据用（例如记忆、海报）——那些记录归属家庭而不是某个成员，
     * 家庭下还没有宝宝时返回空。
     */
    @Transactional(readOnly = true)
    public Optional<BabyEntity> findBaby(Long familyId) {
        return babyRepository.findFirstByFamilyIdOrderByIdAsc(familyId);
    }

    @Transactional(readOnly = true)
    public Optional<Long> findBabyId(Long familyId) {
        return findBaby(familyId).map(BabyEntity::getId);
    }
}
