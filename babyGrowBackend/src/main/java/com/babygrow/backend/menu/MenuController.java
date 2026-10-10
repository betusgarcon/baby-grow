package com.babygrow.backend.menu;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.menu.MenuDtos.MenuTodayResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/baby")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    /**
     * 首页今日菜单。
     *
     * <p>同步、毫秒级返回，**不会等待 AI**。若缓存还没算好，返回空结构并带
     * {@code stale=true}，同时后台开始生成；前端下次拉取就能拿到结果。
     */
    @GetMapping("/menu/today")
    public ApiResponse<MenuTodayResponse> today(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(menuService.today(userId));
    }
}
