package com.babygrow.backend.profile;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.profile.dto.ProfileDtos.BabyProfileResponse;
import com.babygrow.backend.profile.dto.ProfileDtos.ProfilePatchRequest;
import com.babygrow.backend.profile.dto.ProfileDtos.ProfileStateResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/baby")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    /** 分析页头部用的精简档案 */
    @GetMapping("/profile")
    public ApiResponse<BabyProfileResponse> minimalProfile(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(profileService.getMinimalProfile(userId));
    }

    /** 宝宝画像编辑页的完整档案 */
    @GetMapping("/profile-detail")
    public ApiResponse<ProfileStateResponse> detail(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(profileService.getState(userId));
    }

    @PutMapping("/profile-detail")
    public ApiResponse<ProfileStateResponse> update(@AuthenticationPrincipal Long userId,
                                                    @RequestBody ProfilePatchRequest patch) {
        return ApiResponse.ok(profileService.update(userId, patch));
    }
}
