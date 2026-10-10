package com.babygrow.backend.wish;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.wish.WishDtos.ChecklistUpdateRequest;
import com.babygrow.backend.wish.WishDtos.CounterUpdateRequest;
import com.babygrow.backend.wish.WishDtos.IdResponse;
import com.babygrow.backend.wish.WishDtos.WishRequest;
import com.babygrow.backend.wish.WishDtos.WishView;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/wishes")
public class WishController {

    private final WishService wishService;

    public WishController(WishService wishService) {
        this.wishService = wishService;
    }

    @GetMapping
    public ApiResponse<List<WishView>> list(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(wishService.list(userId));
    }

    @PostMapping
    public ApiResponse<WishView> create(@AuthenticationPrincipal Long userId,
                                        @RequestBody WishRequest request) {
        return ApiResponse.ok(wishService.create(userId, request));
    }

    @DeleteMapping
    public ApiResponse<IdResponse> remove(@AuthenticationPrincipal Long userId,
                                          @RequestBody WishDtos.WishIdRequest request) {
        return ApiResponse.ok(wishService.remove(userId, request.id()));
    }

    @PutMapping("/checklist")
    public ApiResponse<WishView> updateChecklist(@AuthenticationPrincipal Long userId,
                                                 @RequestBody ChecklistUpdateRequest request) {
        return ApiResponse.ok(wishService.updateChecklist(userId, request.id(), request.checklist()));
    }

    @PutMapping("/counter")
    public ApiResponse<WishView> updateCounter(@AuthenticationPrincipal Long userId,
                                               @RequestBody CounterUpdateRequest request) {
        return ApiResponse.ok(wishService.updateCounter(userId, request.id(), request.current()));
    }
}
