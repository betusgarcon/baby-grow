-- P2：分析投影表 + 参考基准
--
-- 这些表全部是 records 的派生读模型：投影可从 records 重建（见 RecordProjectionService）。
-- 之所以要把结构化字段摊成列而不是直接查 records.payload，是因为分析要按类型聚合
-- （按天分组、按区间求均值、按指标取最新），JSON 里做不到高效查询。
--
-- 参考基准独立成表，是为了让图表口径与 AI 规则引擎口径同源：接口下发 referenceRange，
-- 不再把标准值写死在前端的图表配置里。

-- ── 睡眠 ───────────────────────────────────────────────
CREATE TABLE sleep_sessions (
    id           BIGSERIAL PRIMARY KEY,
    baby_id      BIGINT      NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    record_id    BIGINT      REFERENCES records (id) ON DELETE CASCADE,
    start_at     TIMESTAMPTZ NOT NULL,
    end_at       TIMESTAMPTZ,
    duration_min INT,
    session_type VARCHAR(16) NOT NULL DEFAULT 'night',
    quality      VARCHAR(16),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_sleep_sessions_type CHECK (session_type IN ('night', 'nap', 'awake'))
);

CREATE INDEX idx_sleep_sessions_baby ON sleep_sessions (baby_id, start_at DESC);

-- ── 喂养 ───────────────────────────────────────────────
CREATE TABLE feedings (
    id            BIGSERIAL PRIMARY KEY,
    baby_id       BIGINT      NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    record_id     BIGINT      REFERENCES records (id) ON DELETE CASCADE,
    occurred_at   TIMESTAMPTZ NOT NULL,
    kind          VARCHAR(16) NOT NULL,
    food_name     VARCHAR(64),
    food_category VARCHAR(32),
    amount_ml     INT,
    is_first      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_feedings_kind CHECK (kind IN ('milk', 'solid'))
);

CREATE INDEX idx_feedings_baby ON feedings (baby_id, occurred_at DESC);

-- ── 生长测量 ───────────────────────────────────────────
CREATE TABLE growth_measurements (
    id          BIGSERIAL PRIMARY KEY,
    baby_id     BIGINT       NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    record_id   BIGINT       REFERENCES records (id) ON DELETE CASCADE,
    measured_at TIMESTAMPTZ  NOT NULL,
    height_cm   NUMERIC(5, 2),
    weight_kg   NUMERIC(5, 3),
    head_cm     NUMERIC(5, 2),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_growth_measurements_baby ON growth_measurements (baby_id, measured_at);

-- ── 情绪 ───────────────────────────────────────────────
CREATE TABLE mood_entries (
    id          BIGSERIAL PRIMARY KEY,
    baby_id     BIGINT      NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    record_id   BIGINT      REFERENCES records (id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL,
    -- 归一化到前端的三档：AI 抽出来的自由文本在写入时映射，映射不到的落 raw_mood
    mood        VARCHAR(16) NOT NULL,
    raw_mood    VARCHAR(32),
    trigger     VARCHAR(64),
    note        VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_mood_entries_mood CHECK (mood IN ('happy', 'clingy', 'discomfort'))
);

CREATE INDEX idx_mood_entries_baby ON mood_entries (baby_id, occurred_at DESC);

-- ── 里程碑 ─────────────────────────────────────────────
-- 目录是「可能达成的」，宝宝表达成的。两者分开，才能显示进度（已解锁 / 总数）。
CREATE TABLE milestone_catalog (
    key                     VARCHAR(64) PRIMARY KEY,
    title                   VARCHAR(128) NOT NULL,
    description             VARCHAR(255),
    icon                    VARCHAR(48),
    tier                    VARCHAR(16),
    expected_age_min_month  INT,
    expected_age_max_month  INT,
    sort                    INT         NOT NULL DEFAULT 0,
    CONSTRAINT ck_milestone_catalog_tier CHECK (tier IS NULL OR tier IN ('gold', 'silver', 'bronze'))
);

CREATE TABLE baby_milestones (
    id            BIGSERIAL PRIMARY KEY,
    baby_id       BIGINT       NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    record_id     BIGINT       REFERENCES records (id) ON DELETE SET NULL,
    -- 匹配上目录就用目录 key；匹配不上时用事件文本生成的 slug，保证不丢数据
    milestone_key VARCHAR(64)  NOT NULL,
    title         VARCHAR(128) NOT NULL,
    description   TEXT,
    unlocked_at   TIMESTAMPTZ  NOT NULL,
    tier          VARCHAR(16),
    icon          VARCHAR(48),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_baby_milestones UNIQUE (baby_id, milestone_key)
);

CREATE INDEX idx_baby_milestones_baby ON baby_milestones (baby_id, unlocked_at DESC);

-- ── 参考基准 ───────────────────────────────────────────
-- 生长分位值。gender 用与 babies.gender 相同的取值（male/female）。
CREATE TABLE growth_standards (
    id         BIGSERIAL PRIMARY KEY,
    metric     VARCHAR(16)  NOT NULL,
    gender     VARCHAR(8)   NOT NULL,
    age_month  INT          NOT NULL,
    p3         NUMERIC(6, 3),
    p50        NUMERIC(6, 3),
    p97        NUMERIC(6, 3),
    source     VARCHAR(128) NOT NULL,
    version    VARCHAR(32)  NOT NULL,
    CONSTRAINT uq_growth_standards UNIQUE (metric, gender, age_month),
    CONSTRAINT ck_growth_standards_metric CHECK (metric IN ('height', 'weight', 'head')),
    CONSTRAINT ck_growth_standards_gender CHECK (gender IN ('male', 'female'))
);

-- 喂养建议区间。随月龄变化，图表据此画参考线与轴上限。
CREATE TABLE feeding_standards (
    id              BIGSERIAL PRIMARY KEY,
    kind            VARCHAR(16) NOT NULL,
    age_month_min   INT         NOT NULL,
    age_month_max   INT         NOT NULL,
    recommended_min INT,
    recommended_max INT,
    axis_max        INT,
    unit            VARCHAR(16) NOT NULL DEFAULT 'ml',
    source          VARCHAR(128) NOT NULL,
    version         VARCHAR(32)  NOT NULL,
    CONSTRAINT ck_feeding_standards_kind CHECK (kind IN ('milk', 'solid')),
    CONSTRAINT ck_feeding_standards_range CHECK (age_month_min <= age_month_max)
);

CREATE INDEX idx_feeding_standards_lookup ON feeding_standards (kind, age_month_min);
