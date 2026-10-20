package com.babygrow.backend.demo;

import com.babygrow.backend.common.ApiResponse;
import com.babygrow.backend.common.BizException;
import com.babygrow.backend.config.AppProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 测试数据入口。只在 {@code DEV_SEED_ENABLED=true} 时注册；生产默认没有这个路由。
 *
 * <p>二次保护：即使误开了开关，也只有两种请求能执行——
 * dev-mode 下的本地请求，或带正确 {@code X-Dev-Seed-Token} 的请求。
 * 数据会清空当前用户家庭的业务数据后重灌，所以 token 必须当作部署密钥保管。
 */
@RestController
@RequestMapping("/api/dev")
@ConditionalOnProperty(name = "app.dev-seed.enabled", havingValue = "true")
public class DevSeedController {

    private final DevSeedService seedService;
    private final AppProperties properties;
    private final String token;

    public DevSeedController(DevSeedService seedService,
                             AppProperties properties,
                             @Value("${app.dev-seed.token:}") String token) {
        this.seedService = seedService;
        this.properties = properties;
        this.token = token;
    }

    @PostMapping("/seed")
    public ApiResponse<Map<String, Object>> seed(
            @AuthenticationPrincipal Long userId,
            @RequestHeader(value = "X-Dev-Seed-Token", required = false) String provided,
            @RequestBody(required = false) DevSeedService.SeedOptions options) {

        boolean tokenConfigured = token != null && !token.isBlank();
        boolean tokenValid = tokenConfigured && token.equals(provided);

        if (!properties.auth().devMode() && !tokenValid) {
            throw BizException.forbiddenKey("error.forbidden");
        }

        return ApiResponse.ok(seedService.seed(userId, options));
    }
}
