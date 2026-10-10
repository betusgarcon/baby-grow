package com.babygrow.backend.repository;

import com.babygrow.backend.domain.FamilyMemberEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMemberEntity, Long> {

    List<FamilyMemberEntity> findByUserIdAndStatus(Long userId, String status);

    Optional<FamilyMemberEntity> findByFamilyIdAndUserId(Long familyId, Long userId);

    /** 家庭页要把待接受的受邀者也列出来，所以不按 status 过滤 */
    List<FamilyMemberEntity> findByFamilyIdOrderByIdAsc(Long familyId);

    Optional<FamilyMemberEntity> findByInviteToken(String inviteToken);

    /** 令牌是随机串，同一个家庭的 pending 行里按它找到那一条 */
    Optional<FamilyMemberEntity> findByFamilyIdAndInviteToken(Long familyId, String inviteToken);
}
