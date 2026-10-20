package com.babygrow.backend.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import com.babygrow.backend.config.JwtService;

import java.io.IOException;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 全接口集成测试底座。
 *
 * <p>用真实 PostgreSQL（Testcontainers）+ Flyway 迁移启动应用，测试走真实 HTTP，
 * 覆盖鉴权、JSON 序列化、事务与投影链路。H2 只用于 bean 图测试——迁移、JSONB、
 * 部分唯一索引都只有 PostgreSQL 才能验证。
 *
 * <p>每个用例前清空业务表，保留 Flyway 种下的参考数据（里程碑目录、喂养标准等）。
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
public abstract class IntegrationTestBase {

    /** 单例容器：所有测试类共用，避免每个类都启动一次 PostgreSQL */
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("baby_grow")
                    .withUsername("babygrow")
                    .withPassword("testpass");

    static {
        POSTGRES.start();
    }

    static final String JWT_SECRET = "integration-test-secret-must-be-at-least-32-bytes";

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.enabled", () -> true);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("app.jwt.secret", () -> JWT_SECRET);
        registry.add("app.auth.dev-mode", () -> true);
        registry.add("app.demo-data.enabled", () -> false);
        // 种子入口在测试里打开，方便验证「一键灌 5 月龄数据」
        registry.add("app.dev-seed.enabled", () -> true);
        registry.add("app.media.root", () -> System.getProperty("java.io.tmpdir") + "/babygrow-it-media");
        registry.add("app.media.public-base", () -> "http://localhost");
    }

    @Autowired
    protected TestRestTemplate rest;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected JwtService jwtService;

    protected record TestResponse(int status, JsonNode body, HttpHeaders headers) {
        public JsonNode data() {
            return body == null ? null : body.path("data");
        }

        public String message() {
            return body == null ? "" : body.path("message").asText();
        }
    }

    @BeforeEach
    void resetDatabase() {
        jdbc.execute("""
                TRUNCATE TABLE ai_tasks, baby_allergens, baby_milestones, baby_preferences,
                    baby_vaccinations, daily_recommendations, feedings, growth_measurements,
                    media_assets, memories, mood_entries, records, sleep_sessions,
                    timeline_entries, wish_checklist_items, wishes, family_members,
                    babies, families, users
                RESTART IDENTITY CASCADE
                """);
    }

    // ── HTTP helpers ────────────────────────────────────────

    protected TestResponse request(HttpMethod method, String path, Object body, String token) {
        return request(method, path, body, token, null);
    }

    protected TestResponse request(HttpMethod method, String path, Object body, String token, String language) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        if (language != null) {
            headers.set("Accept-Language", language);
        }

        ResponseEntity<String> response = rest.exchange(
                path, method, new HttpEntity<>(body, headers), String.class);

        return new TestResponse(response.getStatusCode().value(), parse(response.getBody()), response.getHeaders());
    }

    protected TestResponse get(String path, String token) {
        return request(HttpMethod.GET, path, null, token);
    }

    protected TestResponse get(String path, String token, String language) {
        return request(HttpMethod.GET, path, null, token, language);
    }

    protected TestResponse post(String path, Object body, String token) {
        return request(HttpMethod.POST, path, body, token);
    }

    protected TestResponse put(String path, Object body, String token) {
        return request(HttpMethod.PUT, path, body, token);
    }

    protected TestResponse delete(String path, Object body, String token) {
        return request(HttpMethod.DELETE, path, body, token);
    }

    protected TestResponse upload(String token, Path file) throws IOException {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("file", new FileSystemResource(file));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.setBearerAuth(token);

        ResponseEntity<String> response = rest.postForEntity(
                "/api/baby/media", new HttpEntity<>(form, headers), String.class);

        return new TestResponse(response.getStatusCode().value(), parse(response.getBody()), response.getHeaders());
    }

    private JsonNode parse(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(body);
        } catch (Exception ex) {
            return null;
        }
    }

    // ── 常用业务步骤 ────────────────────────────────────────

    /** dev-mode 下任意 code 都能登录到同一个测试账号 */
    protected String login() {
        TestResponse response = post("/api/auth/login", Map.of("code", "integration-test"), null);
        assertThat(response.status()).as("login status: %s", response.message()).isEqualTo(200);
        String token = response.data().path("token").asText();
        assertThat(token).isNotBlank();
        return token;
    }

    /** 创建家庭 + 宝宝档案；返回 familyId。重复调用会 400。 */
    protected long createFamily(String token, String babyName, LocalDate birthday) {
        TestResponse response = post("/api/family", Map.of(
                "babyName", babyName,
                "birthday", birthday.toString()), token);
        assertThat(response.status()).as("create family: %s", response.message()).isEqualTo(200);
        return response.data().path("familyId").asLong();
    }

    /** 5 个月大的宝宝，分析类用例的默认档案 */
    protected long createFiveMonthFamily(String token) {
        return createFamily(token, "测试宝宝", LocalDate.now().minusMonths(5));
    }

    protected long babyId(long familyId) {
        return jdbc.queryForObject("SELECT id FROM babies WHERE family_id = ?", Long.class, familyId);
    }

    /** 直接建一个非 dev 账号，用来验证跨用户权限 */
    protected long insertUser(String openid) {
        jdbc.update("INSERT INTO users (wx_openid, nickname) VALUES (?, ?)", openid, openid);
        return jdbc.queryForObject("SELECT id FROM users WHERE wx_openid = ?", Long.class, openid);
    }

    protected String tokenFor(long userId) {
        return jwtService.issue(userId);
    }

    /** 邀请一个协作者/只读成员并接受，返回其 token */
    protected String inviteAndAccept(String adminToken, String role) {
        TestResponse invite = post("/api/family/invite",
                Map.of("name", "被邀请人", "role", role), adminToken);
        assertThat(invite.status()).as("invite: %s", invite.message()).isEqualTo(200);
        String code = invite.data().path("inviteCode").asText();
        assertThat(code).isNotBlank();

        long userId = insertUser("invitee-" + java.util.UUID.randomUUID());
        String token = tokenFor(userId);

        TestResponse accept = post("/api/family/invite/accept", Map.of("code", code), token);
        assertThat(accept.status()).as("accept: %s", accept.message()).isEqualTo(200);
        return token;
    }
}
