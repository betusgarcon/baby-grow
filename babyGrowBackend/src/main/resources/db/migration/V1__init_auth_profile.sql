-- P0 地基：身份 / 家庭 / 宝宝档案
--
-- 库归属：baby_grow（Java 独占）。AI 侧表在另一个库 baby_grow_ai，两者不互通。
-- 时间列统一用 timestamptz，写入 UTC。

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    wx_openid   VARCHAR(64)  NOT NULL,
    wx_unionid  VARCHAR(64),
    nickname    VARCHAR(64),
    avatar_url  VARCHAR(512),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_users_openid UNIQUE (wx_openid)
);

CREATE TABLE families (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(64) NOT NULL,
    owner_user_id  BIGINT      NOT NULL REFERENCES users (id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 角色与状态用 CHECK 约束而非枚举类型，便于后续加值时不需 ALTER TYPE
CREATE TABLE family_members (
    id            BIGSERIAL PRIMARY KEY,
    family_id     BIGINT      NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    user_id       BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role          VARCHAR(16) NOT NULL DEFAULT 'viewer',
    status        VARCHAR(16) NOT NULL DEFAULT 'active',
    invite_token  VARCHAR(64),
    invited_by    BIGINT      REFERENCES users (id),
    joined_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_family_members_family_user UNIQUE (family_id, user_id),
    CONSTRAINT ck_family_members_role   CHECK (role IN ('admin', 'contributor', 'viewer')),
    CONSTRAINT ck_family_members_status CHECK (status IN ('active', 'pending'))
);

CREATE INDEX idx_family_members_user ON family_members (user_id);

CREATE TABLE babies (
    id             BIGSERIAL PRIMARY KEY,
    family_id      BIGINT      NOT NULL REFERENCES families (id) ON DELETE CASCADE,
    name           VARCHAR(64) NOT NULL,
    birthday       DATE,
    gender         VARCHAR(8),
    constellation  VARCHAR(16),
    avatar_url     VARCHAR(512),
    badge          VARCHAR(64),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_babies_gender CHECK (gender IS NULL OR gender IN ('male', 'female'))
);

CREATE INDEX idx_babies_family ON babies (family_id);

-- 宝宝的偏好项。前端把整份 preferences 数组交给后端，这里按行存，sort 决定顺序
CREATE TABLE baby_preferences (
    id          BIGSERIAL PRIMARY KEY,
    baby_id     BIGINT       NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    icon        VARCHAR(48),
    label       VARCHAR(64)  NOT NULL,
    value       VARCHAR(255),
    sort        INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_baby_preferences_baby ON baby_preferences (baby_id);

-- 过敏原。P0 只建表；消费方是 AI 的 avoid_items（P3）
CREATE TABLE baby_allergens (
    id          BIGSERIAL PRIMARY KEY,
    baby_id     BIGINT      NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    allergen    VARCHAR(64) NOT NULL,
    severity    VARCHAR(16),
    note        VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_baby_allergens_baby_allergen UNIQUE (baby_id, allergen)
);

CREATE INDEX idx_baby_allergens_baby ON baby_allergens (baby_id);
