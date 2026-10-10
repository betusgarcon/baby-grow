-- P1：记录闭环
--
-- records 是唯一事实来源（append-only）；timeline_entries 是给首页/时间线用的读投影。
-- 两者在同一事务内写入，因此时间线上看得到的，一定能在 records 里追到出处。
--
-- 分析投影表（sleep_sessions / feedings / …）属于 P2，届时从 records 重建即可。

-- 媒体：小程序先传到后端，后端负责存与取。DB 只存 object_key，不存二进制。
CREATE TABLE media_assets (
    id             BIGSERIAL PRIMARY KEY,
    owner_user_id  BIGINT       NOT NULL REFERENCES users (id),
    baby_id        BIGINT       REFERENCES babies (id) ON DELETE SET NULL,
    kind           VARCHAR(16)  NOT NULL,
    object_key     VARCHAR(512) NOT NULL,
    url            VARCHAR(512) NOT NULL,
    mime           VARCHAR(128),
    bytes          BIGINT,
    width          INT,
    height         INT,
    duration_ms    INT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_media_assets_kind CHECK (kind IN ('image', 'video', 'audio'))
);

CREATE INDEX idx_media_assets_owner ON media_assets (owner_user_id, created_at DESC);

-- 异步 AI 任务。图片识别约 10s、视频约 25-30s，都不能同步等。
CREATE TABLE ai_tasks (
    id           BIGSERIAL PRIMARY KEY,
    baby_id      BIGINT      NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    task_type    VARCHAR(32) NOT NULL,
    status       VARCHAR(16) NOT NULL DEFAULT 'pending',
    input_ref    VARCHAR(255),
    result       JSONB,
    error        TEXT,
    attempt      INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at   TIMESTAMPTZ,
    finished_at  TIMESTAMPTZ,
    CONSTRAINT ck_ai_tasks_status CHECK (status IN ('pending', 'running', 'succeeded', 'failed'))
);

CREATE INDEX idx_ai_tasks_status ON ai_tasks (status, created_at);
CREATE INDEX idx_ai_tasks_baby ON ai_tasks (baby_id, created_at DESC);

-- 原始记录。kind 决定 payload 的结构；结构化字段（喂食量、睡眠时长等）
-- 在 P2 落到各自的投影表，届时从本表重建。
CREATE TABLE records (
    id           BIGSERIAL PRIMARY KEY,
    baby_id      BIGINT      NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    kind         VARCHAR(16) NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL,
    source       VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
    payload      JSONB,
    media_id     BIGINT      REFERENCES media_assets (id) ON DELETE SET NULL,
    ai_task_id   BIGINT      REFERENCES ai_tasks (id) ON DELETE SET NULL,
    created_by   BIGINT      REFERENCES users (id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_records_kind CHECK (kind IN ('feeding', 'sleep', 'mood', 'growth', 'milestone', 'memory')),
    CONSTRAINT ck_records_source CHECK (source IN ('TEXT', 'IMAGE', 'VIDEO', 'MANUAL'))
);

CREATE INDEX idx_records_baby_time ON records (baby_id, occurred_at DESC);

-- 时间线读投影。字段与前端 JourneyEntry 一一对应。
-- time 是展示串（"2:30 PM" / "8:00 PM - 6:30 AM"），排序一律用 sort_key，不要解析它。
CREATE TABLE timeline_entries (
    id            BIGSERIAL PRIMARY KEY,
    baby_id       BIGINT       NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    record_id     BIGINT       REFERENCES records (id) ON DELETE CASCADE,
    date          DATE         NOT NULL,
    type          VARCHAR(16)  NOT NULL,
    filter_key    VARCHAR(16)  NOT NULL,
    time          VARCHAR(32)  NOT NULL,
    badge         VARCHAR(32)  NOT NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    image_url     VARCHAR(512),
    amount        VARCHAR(32),
    method        VARCHAR(64),
    duration      VARCHAR(32),
    progress      DOUBLE PRECISION,
    waking_count  INT,
    sort_key      BIGINT       NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_timeline_entries_type CHECK (type IN ('memory', 'feeding', 'sleep')),
    CONSTRAINT ck_timeline_entries_filter CHECK (filter_key IN ('milestones', 'photos', 'health'))
);

CREATE INDEX idx_timeline_entries_baby ON timeline_entries (baby_id, date DESC, sort_key DESC);
