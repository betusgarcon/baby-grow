# Page Inventory

## Journey Page

### Source Design
- **Design File**: `design_sources/stitch/journey/journey_index/journey_index.html`
- **Preview**: `design_sources/stitch/journey/journey_index/journey_index.png`

### Page Structure

| Block | Component | File Path | Description |
|-------|-----------|-----------|-------------|
| Top App Bar | Inline | `pages/journey/index.tsx` | 顶部导航栏，包含宝宝头像、年龄标签、标题和日历按钮 |
| Vaccine Reminder | `VaccineReminder` | `pages/journey/components/VaccineReminder.tsx` | 疫苗提醒卡片，红色背景 |
| Weekly Insight | `WeeklyInsight` | `pages/journey/components/WeeklyInsight.tsx` | 每周洞察卡片，展示睡眠数据分析 |
| Recent Milestones | `MilestoneCard` | `pages/journey/components/MilestoneCard.tsx` | 里程碑卡片列表，横向滚动 |
| Latest Journey | `JourneyLog` | `pages/journey/components/JourneyLog.tsx` | 旅程时间轴记录 |
| Today's Menu | `MenuCard` | `pages/journey/components/MenuCard.tsx` | 今日菜单卡片，横向滚动 |
| Bottom TabBar | `BottomTabBar` | `components/BottomTabBar/BottomTabBar.tsx` | 底部导航栏，包含5个标签页 |

### Design Token Mapping

**Colors**
- `surface` (#fff8f1) → 页面背景
- `surface-container` (#f4ede5) → 卡片背景
- `surface-container-high` (#eee7df) → 卡片hover背景
- `surface-container-lowest` (#ffffff) → TabBar背景
- `primary` (#5f5f59) → 主要文字颜色
- `secondary` (#765842) → 次要文字颜色、TabBar激活状态
- `tertiary` (#406651) → 强调色、添加按钮
- `error` (#ba1a1a) → 错误/警告状态
- `error-container` (#ffdad6) → 疫苗提醒背景
- `secondary-container` (#fed5b9) → TabBar激活背景、睡眠图标背景
- `tertiary-container` (#f7fff7) → 菜单卡片背景
- `on-surface` (#1e1b17) → 主要内容文字
- `on-surface-variant` (#474741) → 次要内容文字

**Typography**
- `headline-md` (20px, 600) → 区块标题
- `body-md` (16px, 400) → 正文内容
- `label-md` (14px, 600) → 标签文字
- `caption` (12px, 400) → 说明文字

**Spacing**
- `margin-mobile` (20px) → 页面边距
- `gutter-mobile` (12px) → 卡片间距
- `md` (16px) → 中等间距
- `lg` (24px) → 较大间距
- `xl` (32px) → 最大间距

**Border Radius**
- `xl` (2rem) → 卡片圆角
- `lg` (2rem) → 大圆角
- `full` (9999px) → 圆形元素

### Mock Data

**Milestones**
- First Smile (2 days ago)
- Grasping (1 week ago)
- Rolling Over (3 days ago)

**Journey Logs**
- Feeding: Formula - 120ml, 10:30 AM
- Nap Time: Deep Sleep, 1h 30m, 8:15 AM - 9:45 AM

**Today's Menu**
- Breakfast: Oatmeal & Banana
- Lunch: Sweet Potato Mash
- Dinner: Apple Puree

### Routes

| Route | Page |
|-------|------|
| `/pages/journey/index` | Journey Page |
