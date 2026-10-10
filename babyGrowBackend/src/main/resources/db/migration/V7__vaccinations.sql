-- P5：疫苗接种记录
--
-- vaccine_catalog 只建表、不预置数据：接种月龄表是医学排期结论，凭空造一份比留空更糟。
-- 接种记录自带 name，catalog 关联可空，将来接权威排期表时再补。
--
-- 前端的 VaccineDetail 是**单个**对象（它展示的是「当前这一针」），所以读接口返回
-- 最相关的一条（未接种的最近一次，否则最近已接种的那次），而不是一整个列表。

-- 里程碑的类型（语言/运动/社交/认知）原先只存在于记录的 payload 里，投影没落下来。
-- 里程碑列表页要按它生成分类标签，所以补一列。
ALTER TABLE baby_milestones ADD COLUMN type VARCHAR(32);

CREATE TABLE vaccine_catalog (
    id                    BIGSERIAL PRIMARY KEY,
    name                  VARCHAR(64) NOT NULL,
    dose_no               INT         NOT NULL DEFAULT 1,
    recommended_age_month INT,
    is_required           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vaccine_catalog UNIQUE (name, dose_no)
);

CREATE TABLE baby_vaccinations (
    id                   BIGSERIAL PRIMARY KEY,
    baby_id              BIGINT      NOT NULL REFERENCES babies (id) ON DELETE CASCADE,
    vaccine_id           BIGINT      REFERENCES vaccine_catalog (id) ON DELETE SET NULL,
    name                 VARCHAR(64) NOT NULL,
    status               VARCHAR(16) NOT NULL DEFAULT 'scheduled',
    administered_at      TIMESTAMPTZ,
    location             VARCHAR(128),
    administered_by      VARCHAR(64),
    -- 「2nd of 3」这类展示串与进度分开存：进度用来画条，文案用来显示
    dose_label           VARCHAR(32),
    dose_progress        DOUBLE PRECISION,
    next_appointment     DATE,
    next_note            VARCHAR(255),
    notes                TEXT,
    attachment_name      VARCHAR(128),
    attachment_media_id  BIGINT      REFERENCES media_assets (id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_baby_vaccinations_status CHECK (status IN ('scheduled', 'done', 'skipped'))
);

-- 读接口要按「有没有接种时间」挑最相关的一条，索引顺着这个顺序建
CREATE INDEX idx_baby_vaccinations_baby
    ON baby_vaccinations (baby_id, administered_at DESC NULLS LAST, id DESC);
