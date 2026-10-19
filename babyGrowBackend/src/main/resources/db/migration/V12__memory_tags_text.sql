-- tags 只在应用层当 JSON 字符串读写，没有用过 JSONB 的查询能力。
-- 改成 TEXT 后，分页筛选可以直接 LIKE，Postgres / H2 行为一致，
-- 也避免了「JSON 列不能直接 lower/like」的类型问题。
ALTER TABLE memories
    ALTER COLUMN tags TYPE TEXT USING tags::text;
