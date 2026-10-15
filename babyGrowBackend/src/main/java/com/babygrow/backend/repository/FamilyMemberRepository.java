package com.babygrow.backend.repository;

import com.babygrow.backend.domain.FamilyMemberEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FamilyMemberRepository extends JpaRepository<FamilyMemberEntity, Long> {

    List<FamilyMemberEntity> findByUserIdAndStatus(Long userId, String status);

    Optional<FamilyMemberEntity> findByFamilyIdAndUserId(Long familyId, Long userId);

    /** 家庭页要把待接受的受邀者也列出来，所以不按 status 过滤 */
    List<FamilyMemberEntity> findByFamilyIdOrderByIdAsc(Long familyId);

    Optional<FamilyMemberEntity> findByInviteToken(String inviteToken);

    /**
     * 凭口令取邀请，并**锁住这一行**，供接受邀请时用。
     *
     * <p>不加锁的话，两个并发的「接受」请求会同时读到 PENDING、同时调用 accept()，
     * 后提交的那个把前一个写进去的 userId 覆盖掉：两边都收到成功，实际只有一个人
     * 真的进了家庭，另一个「加入了却什么都看不到」。加写锁后第二个请求会等第一个
     * 提交，再读到的就是已变更的状态，于是走「口令无效或已被使用」这条正常路径。
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from FamilyMemberEntity m where m.inviteToken = :token")
    Optional<FamilyMemberEntity> findByInviteTokenForUpdate(@Param("token") String token);

    /** 令牌是随机串，同一个家庭的 pending 行里按它找到那一条 */
    Optional<FamilyMemberEntity> findByFamilyIdAndInviteToken(Long familyId, String inviteToken);
}
