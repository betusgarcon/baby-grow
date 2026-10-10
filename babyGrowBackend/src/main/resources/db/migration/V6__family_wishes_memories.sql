-- P4：家庭协作、心愿、记忆
--
-- 三处关键设计：
--   1. family_members 要能容纳「已邀请但还没注册」的人——他们还没有 users 行，
--      因此 user_id 必须可为空，并单独存一个展示名。
--   2. wishes 用 client_key 承载前端的 id。前端新建心愿时生成 `wish-<时间戳>`，
--      并把它嵌进详情页路径（?wish=...），所以接口暴露的 id 必须是客户端那个；
--      数据库另有代理主键，并用 (baby_id, client_key) 唯一约束避免跨宝宝撞车。
--   3. wish_checklist_items 整表替换式更新（前端每次提交完整清单），
--      因此 client_key 只作展示用途，不加唯一约束。

-- ── 家庭成员 ────────────────────────────────────────────
ALTER TABLE family_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE family_members ADD COLUMN display_name VARCHAR(64);
ALTER TABLE family_members ADD COLUMN avatar_class VARCHAR(48);
ALTER TABLE family_members ADD COLUMN invite_expires_at TIMESTAMPTZ;

CREATE INDEX idx_family_members_invite_token
    ON family_members (invite_token)
    WHERE invite_token IS NOT NULL;

-- 同一个家庭里，未注册的受邀者名不该出现两次
CREATE UNIQUE INDEX uq_family_members_pending_name
    ON family_members (family_id, display_name)
    WHERE status = 'pending' AND user_id IS NULL;

-- ── 心愿 ────────────────────────────────────────────────
CREATE TABLE wishes (
    id              BIGSERIAL PRIMARY KEY,
    baby_id         BIGINT       NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    client_key      VARCHAR(64)  NOT NULL,
    kind            VARCHAR(16)  NOT NULL,
    icon            VARCHAR(48),
    circle_class    VARCHAR(48),
    title           VARCHAR(128) NOT NULL,
    description     TEXT,
    detail_subtitle TEXT,
    goal            INT          NOT NULL DEFAULT 1,
    unit_label      VARCHAR(32),
    checklist_title VARCHAR(128),
    path            VARCHAR(255),
    badge           VARCHAR(64),
    expert_tip      TEXT,
    counter_current INT,
    counter_target  INT,
    counter_unit    VARCHAR(32),
    sort            INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wishes_baby_client_key UNIQUE (baby_id, client_key),
    CONSTRAINT ck_wishes_kind CHECK (kind IN ('checklist', 'counter'))
);

CREATE INDEX idx_wishes_baby ON wishes (baby_id, sort, id);

CREATE TABLE wish_checklist_items (
    id         BIGSERIAL PRIMARY KEY,
    wish_id    BIGINT       NOT NULL REFERENCES wishes (id) ON DELETE CASCADE,
    client_key VARCHAR(64),
    title      VARCHAR(128) NOT NULL,
    note       VARCHAR(255),
    done       BOOLEAN      NOT NULL DEFAULT FALSE,
    sort       INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wish_checklist_items_wish ON wish_checklist_items (wish_id, sort, id);

-- ── 记忆 ────────────────────────────────────────────────
-- memory_date 存真实日期（可查询），接口再格式化成前端要的展示串。
CREATE TABLE memories (
    id          BIGSERIAL PRIMARY KEY,
    family_id   BIGINT       NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    baby_id     BIGINT       REFERENCES babies (id) ON DELETE SET NULL,
    category    VARCHAR(48)  NOT NULL,
    title       VARCHAR(128) NOT NULL,
    memory_date DATE         NOT NULL,
    tone        VARCHAR(16)  NOT NULL DEFAULT 'green',
    tags        JSONB,
    media       VARCHAR(16)  NOT NULL DEFAULT 'Text',
    media_id    BIGINT       REFERENCES media_assets (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_memories_tone CHECK (tone IN ('green', 'peach', 'grey', 'blue')),
    CONSTRAINT ck_memories_media CHECK (media IN ('Media', 'Text'))
);

CREATE INDEX idx_memories_family ON memories (family_id, memory_date DESC, id DESC);
