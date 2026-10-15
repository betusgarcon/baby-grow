-- 心愿头图。由 AI 服务调用文生图模型生成，选中后存成 media_assets 行。
--
-- 为什么需要一个 cover_status 而不是只看 cover_media_id 是否为空：
-- 头图是**创建后异步生成**的（出图要几秒到几十秒，不能让创建请求干等）。
-- 只存一个可空的外键，前端就无法区分「还在生成」和「生成失败/没开启」——
-- 新建完进详情页只会看到一块渐变，不知道要不要等。四态把这件事说清楚。
--
-- 状态只落在心愿行上，不复用 ai_tasks：menu 的读路径已经是
-- 「返回业务行自身的缓存状态、异步去刷新」这个模式，头图沿用同一套，更轻。

ALTER TABLE wishes ADD COLUMN cover_media_id BIGINT REFERENCES media_assets (id) ON DELETE SET NULL;

-- none   从未请求生成（功能未开启，或历史数据）
-- pending 已入队 / 生成中
-- ready  已生成，cover_media_id 有值
-- failed 生成失败，可手动重试
ALTER TABLE wishes ADD COLUMN cover_status VARCHAR(16) NOT NULL DEFAULT 'none';

ALTER TABLE wishes ADD CONSTRAINT ck_wishes_cover_status
    CHECK (cover_status IN ('none', 'pending', 'ready', 'failed'));
