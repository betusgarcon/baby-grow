package com.babygrow.backend.menu;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 每日预生成食谱推荐。
 *
 * <p>放在清晨，是为了让家长早上第一次打开首页时，菜单已经算好了——否则首次打开会
 * 撞上十几秒的生成等待（虽然读路径不会阻塞，但那一次拿到的会是空结构）。
 */
@Component
public class MenuScheduler {

    private static final Logger log = LoggerFactory.getLogger(MenuScheduler.class);

    private final MenuService menuService;

    public MenuScheduler(MenuService menuService) {
        this.menuService = menuService;
    }

    @Scheduled(cron = "${app.menu.pregenerate-cron:0 0 5 * * *}")
    public void pregenerateDaily() {
        log.info("每日食谱预生成开始");
        menuService.pregenerateForAllBabies();
    }
}
