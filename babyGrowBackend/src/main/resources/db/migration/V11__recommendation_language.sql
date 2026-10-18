-- 食谱推荐按语言分开缓存：一家人的语言可能不同，一份内容无法同时满足。
ALTER TABLE daily_recommendations
    ADD COLUMN language VARCHAR(8) NOT NULL DEFAULT 'zh';

ALTER TABLE daily_recommendations
    DROP CONSTRAINT uq_daily_recommendations;

ALTER TABLE daily_recommendations
    ADD CONSTRAINT uq_daily_recommendations UNIQUE (baby_id, date, language);

CREATE INDEX idx_daily_recommendations_baby_language
    ON daily_recommendations (baby_id, date DESC, language);
