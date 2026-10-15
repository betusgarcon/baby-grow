package com.babygrow.backend.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Set;

/** JWT 的签发与解析。载荷只放 userId，其余信息一律查库获取，避免令牌过期前数据陈旧。 */
@Component
public class JwtService {

    /**
     * 仓库里出现过的默认值。它们都是**公开的**，一旦被真的用上，任何人都能照着签出
     * 合法的 token，冒充任意 userId。两处分别来自 application.yml 与仓库根的
     * docker-compose.yml（本地 compose 靠 dev-mode=true 才允许用它）。
     */
    private static final Set<String> PLACEHOLDER_SECRETS = Set.of(
            "baby-grow-local-dev-only-secret-please-override-32b",
            "baby-grow-container-dev-secret-please-override-32b");

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(AppProperties properties) {
        String secret = properties.jwt().secret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "app.jwt.secret 至少需要 32 字节（HS256 要求）。请用 JWT_SECRET 环境变量覆盖。");
        }

        // 长度检查挡不住占位值——它自己就有 45 字节，能顺利通过上面那道。
        // 所以这里单独认一下：非 dev-mode 下用占位密钥必须直接起不来。
        // 宁可启动失败并说清原因，也不要带着一个人尽皆知的密钥对外服务。
        if (PLACEHOLDER_SECRETS.contains(secret) && !properties.auth().devMode()) {
            throw new IllegalStateException(
                    "app.auth.dev-mode 关闭时，JWT_SECRET 不能仍是用仓库里的默认占位值——"
                            + "该值已公开，等于任何人都能伪造登录态。请在部署环境里设置一个随机密钥"
                            + "（例如 openssl rand -base64 48）。");
        }

        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttl = Duration.ofHours(properties.jwt().ttlHours());
    }

    public String issue(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    /**
     * 解析并校验令牌。
     *
     * @return userId；令牌缺失、过期或签名不符时返回 {@code null}（调用方据此判定未登录）
     */
    public Long parseUserId(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }
}
