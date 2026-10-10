-- P2：参考基准与里程碑目录的种子数据
--
-- ⚠️ 生长分位值（growth_standards）是**占位值**，不是权威数据。
--    它们只取自公开常识量级，用于把接口与图表的 referenceRange 链路跑通。
--    表里有 source / version 两列标明出处，替换时按 (metric, gender, age_month) 覆盖即可。
--    正式上线前必须换成 WHO 儿童生长标准（或你指定的标准表）的真实数值。
--
-- 喂养建议区间（feeding_standards）取自常见喂养建议的量级，同样标注了出处；
-- 其中 6-9 月龄的 600-800ml 与前端的分析图表原本写死的取值一致，可作交叉印证。

-- ── 生长分位值（占位）───────────────────────────────────
INSERT INTO growth_standards (metric, gender, age_month, p3, p50, p97, source, version) VALUES
-- 男婴
('weight', 'male',  0,  2.500,  3.300,  4.400, '占位值-待替换为 WHO 标准表', 'placeholder'),
('weight', 'male',  6,  6.400,  7.900,  9.800, '占位值-待替换为 WHO 标准表', 'placeholder'),
('weight', 'male', 12,  7.700,  9.600, 12.000, '占位值-待替换为 WHO 标准表', 'placeholder'),
('weight', 'male', 24,  9.700, 12.200, 15.300, '占位值-待替换为 WHO 标准表', 'placeholder'),
('height', 'male',  0, 46.300, 49.900, 53.400, '占位值-待替换为 WHO 标准表', 'placeholder'),
('height', 'male',  6, 63.600, 67.600, 71.600, '占位值-待替换为 WHO 标准表', 'placeholder'),
('height', 'male', 12, 71.300, 75.700, 80.200, '占位值-待替换为 WHO 标准表', 'placeholder'),
('height', 'male', 24, 81.000, 87.100, 93.200, '占位值-待替换为 WHO 标准表', 'placeholder'),
('head',   'male',  0, 32.100, 34.500, 36.900, '占位值-待替换为 WHO 标准表', 'placeholder'),
('head',   'male',  6, 41.000, 43.300, 45.600, '占位值-待替换为 WHO 标准表', 'placeholder'),
('head',   'male', 12, 43.600, 46.100, 48.500, '占位值-待替换为 WHO 标准表', 'placeholder'),
('head',   'male', 24, 45.500, 48.300, 51.000, '占位值-待替换为 WHO 标准表', 'placeholder'),
-- 女婴
('weight', 'female',  0,  2.400,  3.200,  4.200, '占位值-待替换为 WHO 标准表', 'placeholder'),
('weight', 'female',  6,  5.800,  7.300,  9.200, '占位值-待替换为 WHO 标准表', 'placeholder'),
('weight', 'female', 12,  7.000,  8.900, 11.500, '占位值-待替换为 WHO 标准表', 'placeholder'),
('weight', 'female', 24,  9.000, 11.500, 14.800, '占位值-待替换为 WHO 标准表', 'placeholder'),
('height', 'female',  0, 45.400, 49.100, 52.900, '占位值-待替换为 WHO 标准表', 'placeholder'),
('height', 'female',  6, 61.200, 65.700, 70.300, '占位值-待替换为 WHO 标准表', 'placeholder'),
('height', 'female', 12, 69.400, 74.000, 78.900, '占位值-待替换为 WHO 标准表', 'placeholder'),
('height', 'female', 24, 79.300, 85.700, 92.200, '占位值-待替换为 WHO 标准表', 'placeholder'),
('head',   'female',  0, 31.700, 33.900, 36.100, '占位值-待替换为 WHO 标准表', 'placeholder'),
('head',   'female',  6, 39.500, 42.200, 44.900, '占位值-待替换为 WHO 标准表', 'placeholder'),
('head',   'female', 12, 42.300, 44.900, 47.600, '占位值-待替换为 WHO 标准表', 'placeholder'),
('head',   'female', 24, 44.200, 47.200, 50.000, '占位值-待替换为 WHO 标准表', 'placeholder');

-- ── 喂养建议区间 ────────────────────────────────────────
-- axis_max 是图表 Y 轴上限：留出高于建议上限的余量，曲线才不会顶到边框。
INSERT INTO feeding_standards (kind, age_month_min, age_month_max, recommended_min, recommended_max, axis_max, unit, source, version) VALUES
('milk',  0,  1, 400, 600,  900, 'ml', '常见喂养建议量级-待核对', 'v1'),
('milk',  1,  3, 600, 800, 1100, 'ml', '常见喂养建议量级-待核对', 'v1'),
('milk',  3,  6, 700, 900, 1200, 'ml', '常见喂养建议量级-待核对', 'v1'),
('milk',  6,  9, 600, 800, 1000, 'ml', '常见喂养建议量级-待核对', 'v1'),
('milk',  9, 12, 500, 700,  900, 'ml', '常见喂养建议量级-待核对', 'v1'),
('milk', 12, 24, 400, 600,  800, 'ml', '常见喂养建议量级-待核对', 'v1');

-- ── 里程碑目录 ─────────────────────────────────────────
-- 这是一份「常见里程碑」清单，不是医学标准。宝宝实际达成的里程碑以记录为准，
-- 匹配不上的事件会以临时条目出现在进度里，不会丢数据。
INSERT INTO milestone_catalog (key, title, description, icon, tier, expected_age_min_month, expected_age_max_month, sort) VALUES
('first_smile',      '第一次微笑',   '社交性微笑，回应大人的逗弄',   'star',     'silver', 1,  3, 10),
('head_control',     '抬头稳定',     '俯卧时能稳定抬头',             'star',     'silver', 2,  4, 20),
('roll_over',        '学会翻身',     '能从仰卧翻到俯卧或反向',       'star',     'gold',   4,  6, 30),
('reach_grasp',      '主动抓握',     '伸手抓住面前的玩具',           'star',     'silver', 4,  7, 40),
('sit_supported',    '扶坐',         '在支撑下能坐稳',               'star',     'silver', 5,  8, 50),
('first_solid',      '第一口辅食',   '开始尝试母乳/配方奶以外的食物', 'fork_knife','gold',  6,  8, 60),
('first_tooth',      '第一颗牙',     '乳牙萌出',                     'star',     'silver', 6,  9, 70),
('sit_alone',        '独坐',         '不需要支撑就能坐稳',           'star',     'gold',   7, 10, 80),
('crawl',            '会爬',         '用手膝向前移动',               'star',     'gold',   8, 11, 90),
('stand_supported',  '扶站',         '扶着家具能站起来',             'star',     'gold',   9, 12, 100),
('first_word',       '第一个词',     '有意识地叫出称呼',             'star',     'gold',  10, 14, 110),
('walk_alone',       '独立行走',     '不需要扶持走几步',             'star',     'gold',  12, 16, 120);
