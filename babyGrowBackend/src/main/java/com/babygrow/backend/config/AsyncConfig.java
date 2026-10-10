package com.babygrow.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * 异步执行配置。
 *
 * <p>媒体识别走这里：提交任务后立即返回 task_id，识别在线程池里跑，前端轮询状态。
 * 不引入外部队列（Redis/MQ）是因为当前的量级与任务寿命（秒级）不需要——任务状态以
 * {@code ai_tasks} 表为准，进程重启后仍能如实反映（启动时把孤儿任务标为失败）。
 * 将来要跨进程横向扩时，把提交端换成真正的队列即可，接口契约不变。
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

    public static final String AI_EXECUTOR = "aiTaskExecutor";

    @Bean(name = AI_EXECUTOR)
    public Executor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 本地模型串行推理，并发开大只会互相抢资源
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("ai-task-");
        executor.initialize();
        return executor;
    }
}
