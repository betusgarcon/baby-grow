-- 一个用户同时只能在一个家庭里处于 active。
--
-- 这条规则业务层是**假定成立**的：FamilyAccessService.requireMembership 用
-- findFirst() 取「那个家庭」，FamilyService.accept 也用「你已经有一个家庭了」来拦。
-- 但它此前只由应用层的「先查后写」保证，而那是可以被打穿的——两个并发的接受请求
-- （两个不同的口令）能各自插一条 active 行，之后 requireMembership 取到的家庭就变成
-- 未定义的：同一个用户在不同请求里看到不同家庭的数据。
--
-- 钉在数据库层，应用层的判断才是可信的。部分索引：user_id 为 NULL 的 pending 行
-- （已邀请但对方还没注册）不受约束。
--
-- 加这条是安全的：2026-10-15 查过生产库，family_members 为空表，不存在会冲突的存量行。
CREATE UNIQUE INDEX uq_family_members_active_user
    ON family_members (user_id)
    WHERE status = 'active' AND user_id IS NOT NULL;
