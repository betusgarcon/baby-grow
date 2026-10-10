-- P3：首页 AI 食谱推荐的缓存
--
-- 首页加载**绝不能等 LLM**（推荐一次约 14-15s）。所以这里存的是预生成的结果：
-- 读路径只查这张表，毫秒级返回；生成走异步任务。
--
-- 每个宝宝每天最多一条。invalidate 不是删除，而是打时间戳——这样缓存失效时
-- 仍能把上一次的结果带 stale 标记返回，而不是让首页空着。

CREATE TABLE daily_recommendations (
    id              BIGSERIAL PRIMARY KEY,
    baby_id         BIGINT      NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    date            DATE        NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'pending',
    payload         JSONB,
    reason          TEXT,
    avoid_items     JSONB,
    source_refs     JSONB,
    generator_model VARCHAR(64),
    error           TEXT,
    generated_at    TIMESTAMPTZ,
    -- 有新的饮食记录时置为当前时间；读路径据此判断要不要后台重新生成
    invalidated_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_recommendations UNIQUE (baby_id, date),
    CONSTRAINT ck_daily_recommendations_status CHECK (status IN ('pending', 'ready', 'failed'))
);

CREATE INDEX idx_daily_recommendations_baby ON daily_recommendations (baby_id, date DESC);
