-- 里程碑目录补英文列。中文仍是默认与回退值，读取按请求语言取。
ALTER TABLE milestone_catalog
    ADD COLUMN title_en       VARCHAR(128),
    ADD COLUMN description_en VARCHAR(255);

UPDATE milestone_catalog SET title_en = 'First Smile',
       description_en = 'A social smile in response to playful interaction' WHERE key = 'first_smile';
UPDATE milestone_catalog SET title_en = 'Steady Head Control',
       description_en = 'Holds head steady while on tummy' WHERE key = 'head_control';
UPDATE milestone_catalog SET title_en = 'Rolls Over',
       description_en = 'Rolls from back to tummy or the other way' WHERE key = 'roll_over';
UPDATE milestone_catalog SET title_en = 'Reaches and Grasps',
       description_en = 'Reaches out and grabs a toy' WHERE key = 'reach_grasp';
UPDATE milestone_catalog SET title_en = 'Sits with Support',
       description_en = 'Sits steadily when supported' WHERE key = 'sit_supported';
UPDATE milestone_catalog SET title_en = 'First Solid Food',
       description_en = 'Starts trying food beyond breast milk or formula' WHERE key = 'first_solid';
UPDATE milestone_catalog SET title_en = 'First Tooth',
       description_en = 'First baby tooth appears' WHERE key = 'first_tooth';
UPDATE milestone_catalog SET title_en = 'Sits Alone',
       description_en = 'Sits steadily without support' WHERE key = 'sit_alone';
UPDATE milestone_catalog SET title_en = 'Crawls',
       description_en = 'Moves forward on hands and knees' WHERE key = 'crawl';
UPDATE milestone_catalog SET title_en = 'Stands with Support',
       description_en = 'Pulls up to stand holding furniture' WHERE key = 'stand_supported';
UPDATE milestone_catalog SET title_en = 'First Word',
       description_en = 'Says a name or word with meaning' WHERE key = 'first_word';
UPDATE milestone_catalog SET title_en = 'Walks Alone',
       description_en = 'Takes a few steps without support' WHERE key = 'walk_alone';

-- 参考区间的来源是占位值，会展示给用户；用中性标记而不是中文待办文字。
UPDATE feeding_standards SET source = 'common-guidance (unverified)' WHERE source = '常见喂养建议量级-待核对';
