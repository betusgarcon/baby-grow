package com.babygrow.backend.family;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.family.FamilyDtos.AcceptInviteRequest;
import com.babygrow.backend.family.FamilyDtos.AcceptedResponse;
import com.babygrow.backend.family.FamilyDtos.InviteRequest;
import com.babygrow.backend.family.FamilyDtos.MemberIdRequest;
import com.babygrow.backend.family.FamilyDtos.MemberView;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/family")
public class FamilyController {

    private final FamilyService familyService;
    private final PosterService posterService;

    public FamilyController(FamilyService familyService, PosterService posterService) {
        this.familyService = familyService;
        this.posterService = posterService;
    }

    @GetMapping("/members")
    public ApiResponse<List<MemberView>> members(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(familyService.members(userId));
    }

    @PutMapping("/members")
    public ApiResponse<MemberView> updateRole(@AuthenticationPrincipal Long userId,
                                              @RequestBody MemberIdRequest request) {
        return ApiResponse.ok(familyService.updateRole(userId, request.id(), request.role()));
    }

    @DeleteMapping("/members")
    public ApiResponse<Map<String, String>> remove(@AuthenticationPrincipal Long userId,
                                                   @RequestBody MemberIdRequest request) {
        familyService.remove(userId, request.id());
        return ApiResponse.ok(Map.of("id", request.id()));
    }

    /** 邀请一位还没有账号的亲友，返回带一次性口令的 pending 成员 */
    @PostMapping("/invite")
    public ApiResponse<MemberView> invite(@AuthenticationPrincipal Long userId,
                                          @RequestBody InviteRequest request) {
        return ApiResponse.ok(familyService.invite(userId, request.name(), request.role()));
    }

    /** 受邀者凭口令加入 */
    @PostMapping("/invite/accept")
    public ApiResponse<AcceptedResponse> accept(@AuthenticationPrincipal Long userId,
                                                @RequestBody AcceptInviteRequest request) {
        return ApiResponse.ok(familyService.accept(userId, request.code()));
    }

    /** 分享海报的内容：由宝宝档案 + 最近一条记录推导 */
    @GetMapping("/poster")
    public ApiResponse<PosterDtos.PosterView> poster(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(posterService.poster(userId));
    }
}
