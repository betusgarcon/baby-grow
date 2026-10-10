package com.babygrow.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * 只验证 bean 图能装配起来（安全链、JWT、JPA 仓储、异步执行器、配置绑定）。
 *
 * <p>刻意不连真实 PostgreSQL：迁移脚本是 PG 方言（TIMESTAMPTZ / BIGSERIAL / JSONB），
 * 内存库跑不了，所以关掉 Flyway，改由 Hibernate 按实体建表。
 *
 * <p>之所以不能只设 ddl-auto=none：启动时的孤儿 AI 任务清理会查 ai_tasks 表，
 * 库是空的会直接让上下文起不来。
 *
 * <p>真正的库连通性与迁移由本地冒烟测试覆盖（见 README 的「验证」一节）。
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:context-loads;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class BabyGrowBackendApplicationTests {

    @Test
    void contextLoads() {
        // 能启动即通过
    }
}
