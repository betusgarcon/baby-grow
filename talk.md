我先把这件事拆成“如何最快补设计”和“怎样让 AI 真正高还原编码”两部分，给你一套可落地的执行路线。**总体策略**
- 现在最省时间的做法，不是把每一张 Figma 页面都修到完美，而是先把“会影响前端还原度的关键信息”补齐成一套最小可交付规范。
- 对 AI 前端架构师来说，真正决定还原度的不是页面数量，而是这 5 类信息是否清晰：`统一尺寸`、`设计 token`、`组件规范`、`状态矩阵`、`页面结构与交互规则`。
- 你当前的情况非常适合采用“`Figma 做结构和视觉基线 + 文本规格补细节 + AI 批量编码`”的方式，而不是继续手工在 Figma 里逐页精修。
- 简单说：先把 Figma 从“灵感草图集合”升级成“可开发原型源”，再让 AI 编码；不要反过来。

**执行目标**
- 先用最小成本让设计稿具备“能被高还原编码”的条件。
- 再按“页面优先级 + 组件复用”推进开发，而不是逐页从头写。
- 把大量细节修补，尽量收敛到组件层和状态层，避免每个页面单独修。

**推荐执行路径**
- 第 1 阶段：`整理与定标`
  - 先确定小程序设计基准尺寸，建议统一用 `390 x 844` 作为主设计稿尺寸。
  - 明确安全区规则：顶部状态栏、导航栏高度、底部 Home Indicator 安全区、底部浮动操作区距离底边。
  - 把所有页面按模块归类，例如：`首页时光轴`、`记录中心`、`心愿清单`、`家庭与分享`、`个人资料`、`数据空间`。
  - 给每个页面标记优先级：`P0 必做主流程`、`P1 高频辅助流程`、`P2 低频或后补页面`。
- 第 2 阶段：`补基础规范`
  - 在 Figma 里单独建一页 `00_Foundation`，只做颜色、字体、圆角、间距、阴影、描边、图标尺寸。
  - 在 Figma 里单独建一页 `01_Components`，沉淀按钮、输入框、卡片、顶部栏、标签、筛选项、空状态、弹窗、Toast、底部浮动栏。
  - 每个组件补齐状态：`default`、`pressed`、`disabled`、`loading`、`selected`、`error`、`empty`。
  - 优先把重复出现的临时拼接元素替换成组件，而不是继续修单页。
- 第 3 阶段：`补页面结构与关键状态`
  - 每个页面只保留 1 个主态，加上必须的 2 到 4 个关键状态页。
  - 例如首页时光轴，至少要有：`默认态`、`加载态`、`空态`、`筛选结果态`。
  - 例如 AI 识别链路，至少要有：`上传前`、`上传中`、`识别中`、`识别成功`、`识别失败`。
  - 例如家庭邀请链路，至少要有：`未发送`、`已发送`、`已接受`、`已过期`。
- 第 4 阶段：`补文字规格，不再硬画`
  - 凡是 Figma 调整起来很繁琐的内容，不要死磕视觉稿，直接用文本规格补。
  - 比如：点击行为、关闭规则、错误提示、空状态文案、权限说明、接口异常提示、校验规则、二次确认弹窗。
  - 这些内容 AI 编码时非常重要，但不一定非要画成完整高保真页面。
- 第 5 阶段：`打包给 AI 编码`
  - 把 Figma 页面、组件页、状态页、文档说明一起作为“开发输入包”。
  - 然后按模块让 AI 编码，不要一次把整个产品全丢给 AI。

**Figma 里最该优先修的内容**
- `统一画板尺寸`
  - 所有移动端页面统一成同一基准宽度，不再混用不同宽高。
  - 建议先统一主流页面，历史草稿可以保留，但不要作为开发源。
- `改 Auto Layout`
  - 你很多 AI 生成草图可能是绝对定位堆出来的，这会严重影响开发还原。
  - 凡是列表、卡片、区块、按钮组、头部、筛选区，都尽量改成 `Auto Layout`。
  - 只要能改成流式布局，AI 才能更稳定地映射成前端结构。
- `做组件，不修碎片`
  - 同类按钮、卡片、Tab、状态块不要各画各的，要抽成组件。
  - 一旦组件规范好了，页面上的细节会自动收敛。
- `补状态，不补装饰`
  - 当前最缺的不是更多装饰，而是交互状态。
  - 优先补：`loading`、`empty`、`error`、`disabled`、`success`、`selected`、`editing`、`confirm modal`。
- `补文本与规则注释`
  - 对 AI 来说，“这个按钮点了之后发生什么”往往比“按钮阴影模糊值”更重要。
  - 可在 Figma 旁边用注释块标明：触发动作、接口结果、跳转目标、关闭规则、异常提示。

**哪些细节必须在 Figma 补，哪些可以交给文档**
- 必须在 Figma 补的：
  - 页面结构层级
  - 主视觉样式
  - 核心组件外观
  - 关键状态页
  - 尺寸基线与间距规律
  - 图标、图片、插画等视觉资产
- 更适合用文档补的：
  - 表单校验规则
  - 接口失败提示文案
  - 权限申请说明
  - 弹窗触发条件
  - Toast 出现时机与文案
  - 加载超时处理
  - 空状态的 CTA 行为
- 可以让 AI 按规范推断的：
  - 少量重复页的间距微调
  - 一致性边角与阴影
  - 同类卡片在不同页面的布局复用
  - 标准小程序交互习惯下的基础反馈

**让 AI 高还原度编码的前提条件**
- `有唯一设计源`
  - 不能让 AI 面对多个风格相近但不一致的页面同时决策。
  - 每个模块需要一个“最终参考页面”。
- `有统一命名`
  - 页面名、组件名、状态名必须统一。
  - 例如：`Timeline/Card/Default`、`Timeline/Card/Selected`、`Button/Primary/Loading`。
- `有 token`
  - 至少明确这些值：主色、辅色、文字层级、背景层级、边框色、圆角、阴影、间距规则。
  - 如果没有 token，AI 会在编码时自行猜测，结果就会越来越飘。
- `有状态矩阵`
  - 每个核心组件和核心页面要知道有哪些状态，而不是只给默认态。
- `有交互规则`
  - 尤其是筛选、弹窗、上传、保存、邀请、切换身份、编辑保存这些流程。
- `有可导出的资产`
  - 图标尽量 SVG，插图和照片明确导出规则。
- `有开发约束`
  - 明确是微信小程序 / Taro，小程序端优先，不要让 AI 按 Web 站思路自由发挥。

**建议你在 Figma 中新增的 5 个页面**
- `00_Foundation`
  - 颜色、字体、字号层级、圆角、阴影、描边、间距、图标尺寸。
- `01_Components`
  - 按钮、输入框、卡片、顶部栏、Tab、筛选器、标签、空状态、弹窗、Toast、底部操作栏。
- `02_Patterns`
  - 列表页模板、详情页模板、编辑页模板、表单页模板、弹层模板。
- `03_Screens_Ready`
  - 只放准备交给开发的主页面与关键状态页。
- `04_Notes`
  - 写交互规则、接口状态、权限说明、边界情况。

**建议你先补齐的组件清单**
- `Top App Bar`
  - 返回、标题、右侧操作、身份切换 pill、头像入口。
- `Button`
  - 主按钮、次按钮、线框按钮、危险按钮、图标按钮、加载态、禁用态。
- `Card`
  - 记录卡片、分析卡片、邀请卡片、家庭成员卡片、心愿卡片。
- `Filter`
  - 筛选入口、下拉面板、标签选择、时间范围、清空、应用。
- `Feedback`
  - Skeleton、loading spinner、empty state、error state、toast、confirm dialog。
- `Media`
  - 图片上传卡片、视频上传卡片、识别进度条、分析结果块。
- `Form`
  - 输入框、选择器、日期选择、角色选择、错误提示、已保存反馈。

**建议你先补齐的页面状态清单**
- `列表页`
  - 默认、加载、空、错误、筛选结果为空、无更多数据。
- `表单页`
  - 默认、编辑中、字段报错、提交中、提交成功、提交失败、离开确认。
- `上传/识别页`
  - 未上传、上传中、识别中、成功、失败、重试。
- `邀请/分享页`
  - 未发出、已发出、已接受、已过期、已撤回。
- `详情页`
  - 默认、编辑态、保存中、删除确认、保存成功。

**你可以怎么快速修补 Figma，而不陷入繁琐劳动**
- 只修 `P0 主流程` 对应页面，P1/P2 先挂起。
- 每补一个页面，先问自己：这页是不是其实能由已有模板 + 组件拼出来。
- 对重复页面，不要重新画，直接基于组件和模板出变体。
- 能靠组件解决的问题，不在页面里单独修。
- 能靠文本注释说明的问题，不在 Figma 里硬画出 10 个状态页。
- 把“装饰性细节”延后，把“影响交互闭环的细节”前置。

**推荐的 AI 协作方式**
- 第一轮，不让 AI 直接写全项目，只做：
  - 页面路由规划
  - 设计 token 落地
  - 通用组件库骨架
  - 关键页面框架
- 第二轮，再让 AI 做：
  - 单模块页面开发
  - 页面状态补齐
  - 交互逻辑串联
- 第三轮，再做：
  - 视觉细节收敛
  - 间距与层级统一
  - 代码结构优化
  - 多端适配与性能整理
- 这样比“一次性高保真生成全量页面”成功率高得多。

**给 AI 编码前，你最好准备这份输入包**
- `Figma 链接`
  - 指定哪些页面是最终参考，哪些是废弃草稿。
- `页面清单`
  - 路由名、页面用途、优先级、对应 Figma frame 名。
- `组件清单`
  - 组件名称、变体、状态、复用范围。
- `设计 token 表`
  - 颜色、字号、字重、圆角、阴影、间距、层级。
- `交互说明`
  - 页面进入方式、点击行为、关闭规则、异常态、空态、成功态。
- `业务规则`
  - 权限、角色、邀请状态、保存逻辑、筛选逻辑、上传逻辑。
- `文案表`
  - 标题、按钮文案、提示文案、空状态文案、报错文案。
- `资产表`
  - SVG、PNG、头像占位图、插图、图片比例要求。

**如果要让 AI 前端架构师输出更稳，建议给它下这样的任务顺序**
- 第一步：`先读 Figma 和页面清单，输出设计系统与页面架构方案`
- 第二步：`先实现 token + 基础组件 + 页面模板，不写业务接口`
- 第三步：`按模块实现页面静态高还原`
- 第四步：`补 loading/empty/error/disabled 等关键状态`
- 第五步：`接入业务逻辑与接口`
- 第六步：`做逐页视觉回归修正`

**高还原编码时最常见的失败原因**
- 页面尺寸不统一，AI 不知道以哪个为准。
- 同一组件在不同页面风格不一致，AI 被迫自己折中。
- 只有默认态，没有 loading/empty/error，导致代码里临时补得很乱。
- 设计稿大量绝对定位，前端结构难以复现。
- 没有交互规则，AI 只能猜点击后的行为。
- 没有组件化设计稿，导致页面越做越散。

**最适合你当前情况的落地步骤**
- 第 1 天：
  - 清点所有 Figma 页面，按模块分类。
  - 选出 `P0` 主流程页面。
  - 统一基准尺寸，标记最终参考页。
- 第 2 到 3 天：
  - 补 `Foundation` 和 `Components`。
  - 先统一按钮、顶部栏、卡片、筛选器、空状态、弹窗。
- 第 4 到 5 天：
  - 为 P0 页面补关键状态页。
  - 用注释写清流程规则，不再过度修高保真细枝末节。
- 第 6 天：
  - 整理 AI 输入包。
  - 让 AI 前端架构师先输出组件结构、页面拆分方案、token 方案。
- 第 7 天起：
  - 按模块开发。
  - 每完成一个模块，做一次 Figma 对照修正，而不是最后统一返工。

**一句话建议**
- 你现在最该做的，不是继续在 Figma 里“把所有页面修漂亮”，而是把 Figma 快速整理成“`统一尺寸 + 组件化 + 状态完整 + 交互可说明`”的开发输入源；只要这一步到位，AI 才能稳定做出高还原度的小程序前端。

**如果你愿意，我下一步可以直接帮你继续做两件事之一**
- 我帮你输出一份可直接照着整理 Figma 的 `页面/组件/状态/注释清单模板`。
- 我帮你输出一份给 AI 前端架构师使用的 `标准提示词 + 输入资料结构`，让它能按高还原度方式开始编码。





toolName: Skill
            
status: success
          
          
我先结合你当前目录里已经按模块拆好的 Stitch 导出物，判断“直接还原”与“先回 Figma 精修”两条路各自的成本、风险和最优使用场景。
        
            
toolName: search_by_regex
            
status: success
          
query: session_memory_|Stitch|figma|html|小程序|Taro
          

        
            
toolName: file_search
            
status: success
          
file_pattern: **/*.{html,png,jpg,jpeg,webp}
          

        
            
toolName: view_folder
            
status: success
          
/Users/betus/Documents/trae_projects/baby-growth
          
我已经确认当前目录的导出物非常完整：不仅按业务模块分目录，还同时保留了 `html + png`，外加一个集中预览原型目录，这其实很适合做“先落地、再精修”的两阶段方案。
        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/betus/Documents/trae_projects/baby-growth/prototype_demo/app.css
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md
          
**结论**
- 这两条路里，**更好的实现路径不是二选一，而是“以思路一为主、思路二为辅”的混合方案**。
- 具体说：**不要先把所有页面重新导入 Figma 精修一遍**，这会非常耗时，而且对当前“尽快把小程序做出来”的目标帮助不成比例。
- 更推荐的路径是：
- **先直接基于 Stitch 导出的 `html + png` 落地前端页面和组件**
- **只把少量“高复用、高歧义、高复杂”的页面/组件回收到 Figma 精修**
- 这样你能同时兼顾：交付速度、视觉一致性、组件抽象、比赛节奏

**为什么我这么判断**
- 你当前目录里的导出物已经非常完整，且已经按业务模块划分：
- `family_share`
- `journey`
- `record`
- `baby_data`
- `wishes`
- 同时每个页面基本都有 `html + png` 对照，像 [family_sharing_index.html](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html) 和对应的 `png`
- 还有一个集中式的原型演示目录 [prototype_demo](file:///Users/betus/Documents/trae_projects/baby-growth/prototype_demo)，这说明你已经具备了比较好的“页面参考源”
- 更关键的是，导出物里其实已经隐含了一套设计 token：
- 在 [family_sharing_index.html:L10-L20](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html#L10-L20) 里有 Tailwind theme 配置
- 在 [DESIGN.md](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md) 里有颜色、字体、圆角、间距、风格说明
- 在 [app.css:L1-L13](file:///Users/betus/Documents/trae_projects/baby-growth/prototype_demo/app.css#L1-L13) 里也已经抽出了全局 CSS 变量

这意味着你现在最缺的不是“重新做一遍设计”，而是**把这些已有设计信息转译成小程序前端可复用的组件和样式体系**。

**两种思路分别怎么评估**

**思路一：直接参考 Stitch 导出的 HTML/CSS 还原页面**
- **优点**
- 速度最快，最适合当前阶段
- 你已经有模块化页面目录，适合直接按页面推进
- `html + png` 双参考很利于做像素级校对
- 能快速识别共性组件，反向沉淀设计系统
- 很适合比赛项目，先做出完整体验闭环

- **缺点**
- Stitch 导出是 Web/原型导向，不是小程序工程导向
- HTML 中有不少内容不能直接照搬到 Taro 小程序
- 例如外链字体、Google 图标、Tailwind CDN、浏览器特有样式，这些在小程序里都不能原样用
- 如果直接逐页翻译而不抽组件，后期会变成“页面能跑但维护灾难”

- **你这里特别要注意的点**
- [family_sharing_index.html:L10-L20](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html#L10-L20) 这种页面把 token 混在页面头部里，适合作为“设计源”，**不适合作为最终工程结构**
- [family_sharing_index.html:L174-L190](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html#L174-L190) 里有较多浏览器样式和效果类定义，小程序需要重新映射
- [app.css](file:///Users/betus/Documents/trae_projects/baby-growth/prototype_demo/app.css) 更像原型壳层样式，不是最终业务组件样式

**思路二：全部导入 Figma 精修后再开发**
- **优点**
- 设计源头会更规范
- 便于统一 Auto Layout、图层命名、组件复用
- 对多人协作或长期维护更友好
- 后续做设计系统、标注、切图会更顺

- **缺点**
- 成本极高，尤其你现在“页面很多”
- Stitch 导入 Figma 后往往还要继续清层级、补约束、调命名、改结构
- 真正耗时的不是导入，而是“整理成可开发的设计稿”
- 如果你现在目标是快速还原前端和推进比赛，这条路会拖慢整体节奏

- **最大风险**
- 容易出现“设计整理做了很多，但前端还没开始有效产出”
- 对单人项目或比赛项目来说，ROI 通常不高
- 你最后仍然要自己把设计稿再翻译成 Taro 组件，工作并没有真正减少

**哪种更好**
- **当前阶段更好的路径：思路一主导**
- **但要加一个受控版思路二：只精修少量核心页面和核心组件**

也就是：

- **不是**：全部 HTML 直接生抄
- **也不是**：全部页面先回 Figma 精修
- **而是**：先利用现有导出物快速建立前端工程和组件体系，再把最关键的设计资产补齐

**我建议的实际落地路径**

**第 1 步：先把导出物当“开发参考源”，不是最终代码源**
- 把每个 `html` 当作页面视觉和布局参考
- 把对应 `png` 当作验收基准
- 把 [DESIGN.md](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md) 和页面里的 token 配置提炼成你小程序自己的 `design tokens`
- 这一步的目标不是复制 HTML，而是提取：
- 色板
- 字体层级
- 圆角
- 阴影
- 间距
- 卡片样式
- 页面壳层结构

**第 2 步：先做“小程序设计底座”**
优先抽这些通用能力：
- 页面容器 `PageContainer`
- 顶部栏 `NavBar`
- 卡片容器 `SectionCard`
- 底部导航 `TabBar`
- 主按钮/次按钮
- 列表项 `ListCell`
- 标签 `Tag`
- 空态 `EmptyState`
- 骨架屏 `Skeleton`
- 表单输入区
- 弹层/抽屉/筛选面板

这一步会直接决定后面开发是不是顺。

**第 3 步：按“页面价值分级”决定哪些要回 Figma**
建议把页面分三类：

- **A 类：必须精修**
- 首页/主入口页
- 记录录入页
- 成长/统计页
- 宝宝档案页
- 底部导航、顶部导航、核心卡片
- 这类页面复用度高、视觉权重高，值得回 Figma 做一次结构化整理

- **B 类：可直接参考 HTML 落地**
- 列表页
- 空态页
- loading 页
- 搜索结果页
- 管理页
- 这类页面可以边开发边归纳组件，不需要先回 Figma

- **C 类：尽量不回 Figma**
- 低频状态页
- 临时活动页
- 海报页
- 说明页
- 这类页面直接按 HTML + PNG 还原即可

**第 4 步：Figma 精修只做“组件级整理”，不要做“全页面重建”**
如果走思路二的部分补充，我建议你在 Figma 里只做这些：
- 统一命名核心 frame
- 抽出核心组件
- 整理 Auto Layout
- 标注关键间距与尺寸
- 梳理 icon / image 资源
- 必要切图

不要做这些：
- 不要把所有页面都重新一层层整理
- 不要为了整洁而大规模返工已经可以直接实现的页面
- 不要把 Figma 当成当前阶段的主战场

**对你当前项目最合适的推荐**
结合你的目标“小程序实现 + 学习全栈 + 比赛提交”，我给你的建议是：

**最佳路径：70% 思路一 + 30% 思路二**
- **70%** 用现有 Stitch 导出物直接驱动前端开发
- **30%** 只对关键设计资产做 Figma 精修

这是最平衡的路线，因为它同时满足：
- 尽快出代码
- 保留设计统一性
- 不被 Figma 整理吞掉时间
- 给后续组件化、测试、CI/CD 留出时间

**如果你选纯思路一，怎么避免翻车**
- 不逐页复制 HTML
- 先抽 token，再抽组件，再拼页面
- 不把 Tailwind class 原样搬进 Taro
- 不依赖外链字体和 Google icon
- 用页面 `png` 做视觉比对，不以 HTML 结构为唯一标准

**如果你选纯思路二，什么时候才值得**
只有在下面情况同时成立时，才建议你大规模回 Figma：
- 设计还会频繁改
- 有专门设计角色参与
- 项目周期较长
- 比赛之外还要长期产品化运营
- 需要多人长期协同开发

按你现在的描述，我判断**并不满足这个条件**。

**一句话判断**
- **更好的实现路径是：先用 Stitch 导出物直接推进小程序前端开发，把 Figma 精修收缩为“核心组件和关键页面”的补充动作，而不是先全量回炉到 Figma。**

**我建议你接下来就这么做**
- 先从 [DESIGN.md](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md) 和导出 HTML 中提炼统一设计 token
- 再选 5 个核心页面做第一批还原：
- `journey_index`
- `record`
- `record_text_ai`
- `baby_profile_view`
- `family_sharing_index`
- 同时抽第一版通用组件库
- 只有在还原过程中发现“结构歧义很大、复用价值很高”的页面，再回 Figma 精修

如果你愿意，我下一步可以直接继续帮你出一份：
- **“基于当前目录的页面优先级清单”**
- **“哪些页面该直接开发，哪些页面该先回 Figma”**
- **“第一批应该抽的组件清单”**


**落地规范**
- 下面这份规范的目标只有一个：**让你现在能快速把 Stitch 导出页落成 Taro 页面，同时保证后面 Figma 精修时尽量少返工**
- 核心原则是 6 个字：**设计源分离、结构翻译**
- 你当前已有的设计信息可以直接作为规范来源，尤其是 [DESIGN.md](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md) 和 [family_sharing_index.html](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html)

**1. 目录怎么放**
- 把项目分成 3 个区：`设计源`、`前端源码`、`映射文档`
- 不要把 Stitch 的 `html/png` 和 Taro 源码混在一起长期维护
- 推荐结构：

```text
baby-growth/
  design_sources/
    stitch/
      family_share/
        family_sharing_index/
          family_sharing_index.html
          family_sharing_index.png
          meta.md
      journey/
      record/
      baby_data/
      wishes/
    figma_notes/
      components.md
      page_mapping.md

  miniapp/
    src/
      app.tsx
      app.config.ts
      pages/
      packages/
      components/
      features/
      styles/
      tokens/
      assets/
      types/

  docs/
    stitch-to-taro/
      page-inventory.md
      component-mapping.md
      token-mapping.md
      refactor-log.md
```

- `design_sources/stitch`：只放 Stitch 导出物
- `miniapp/src`：只放真正的小程序源码
- `docs/stitch-to-taro`：记录“这个页面映射成了哪些组件、哪些 token、哪些状态”

**推荐每个 Stitch 页面目录加一个 `meta.md`**
- 记录页面用途
- 当前对应的 Taro 页面路径
- 页面状态列表
- 是否已组件化
- 是否后续要回 Figma 精修

**2. 页面状态怎么命名**
- 状态页一定要显式命名，不要只叫一个通用页面名
- 推荐统一格式：

```text
{page-name}.{state}.{ext}
```

- 例如：
```text
record_text.default.html
record_text.ai_suggested.html
record_text.loading.html
record_text.empty.html
record_text.error.html
```

- 如果是多维状态，继续补后缀：
```text
family_search.results.filtered.html
family_search.results.empty.html
family_search.loading.initial.html
family_search.loading.next_page.html
```

**前端文件也建议保持相似命名语义**
- 页面组件：
```text
RecordTextPage.tsx
RecordTextLoading.tsx
RecordTextEmpty.tsx
```
- 组件状态 variant：
```tsx
<RecordTextState variant="loading" />
<RecordTextState variant="empty" />
```

**状态命名建议统一枚举**
- `default`
- `loading`
- `empty`
- `error`
- `disabled`
- `selected`
- `editing`
- `success`
- `ai_pending`
- `ai_result`
- `ai_error`

**原则**
- 页面状态名要表达“用户看到什么”
- 不要用模糊词，比如 `new`、`final`、`v2`

**3. 哪些样式该抽成 token**
- 只要是**跨页面反复出现**的样式，都应该抽成 token
- 你现在已经有很好的 token 来源：
- [DESIGN.md](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md)
- [family_sharing_index.html:L15-L80](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html#L15-L80)
- [app.css:L1-L13](file:///Users/betus/Documents/trae_projects/baby-growth/prototype_demo/app.css#L1-L13)

**第一批必须抽的 token**
- **颜色**
  - `color-bg-page`
  - `color-bg-card`
  - `color-text-primary`
  - `color-text-secondary`
  - `color-primary`
  - `color-secondary`
  - `color-tertiary`
  - `color-border`
  - `color-success`
  - `color-error`

- **字体**
  - `font-size-display`
  - `font-size-title-lg`
  - `font-size-title-md`
  - `font-size-body`
  - `font-size-caption`
  - `line-height-*`
  - `font-weight-*`

- **间距**
  - `spacing-4`
  - `spacing-8`
  - `spacing-12`
  - `spacing-16`
  - `spacing-20`
  - `spacing-24`
  - `spacing-32`

- **圆角**
  - `radius-sm`
  - `radius-md`
  - `radius-lg`
  - `radius-xl`
  - `radius-pill`

- **阴影**
  - `shadow-card`
  - `shadow-float`
  - `shadow-modal`

- **层级**
  - `z-header`
  - `z-tabbar`
  - `z-modal`
  - `z-toast`

**第二批可抽 token**
- 动效时长
- 动效缓动
- 边框粗细
- 安全区高度
- 页面最大宽度
- 图标尺寸档位

**不建议抽成 token 的东西**
- 单页面特有的 `width: 173px`
- 某个页面独有的背景插画尺寸
- 一次性营销卡片的特定渐变角度

**判断标准**
- 出现 3 次以上，考虑抽 token
- 明显属于品牌规范，直接抽 token
- 只服务单页面的魔法数字，不要急着抽 token

**4. 哪些结构该抽成组件**
- 不要按 HTML 节点抽组件，要按**语义和复用**抽组件
- 判断标准：
- 会不会复用
- 有没有独立状态
- 有没有稳定输入输出
- 是否表达一个完整视觉单元

**第一批必须抽的基础组件**
- `PageContainer`
- `PageHeader`
- `BottomTabBar`
- `SectionCard`
- `PrimaryButton`
- `SecondaryButton`
- `IconButton`
- `Tag`
- `Avatar`
- `EmptyState`
- `LoadingSkeleton`
- `ListCell`
- `FormField`
- `SearchBar`

**第二批业务组件**
- `BabyProfileCard`
- `FamilyMemberItem`
- `FamilyInviteCard`
- `MilestoneCard`
- `JourneyListItem`
- `RecordInputCard`
- `RecordPhotoGrid`
- `GrowthStatCard`
- `TrendChartCard`
- `AIInsightCard`

**组件拆分规则**
- 页面级：`Page`
- 区块级：`Section`
- 卡片级：`Card`
- 列表项：`Item`
- 状态块：`State`
- 操作条：`ActionBar`

**推荐命名**
- `FamilySharingPage`
- `FamilyCircleSection`
- `FamilyMemberItem`
- `InviteActionCard`

**不推荐命名**
- `Frame1`
- `WrapBox`
- `InnerTop`
- `LeftPart`

**一个实用公式**
- Stitch 的一个大块区域
- 如果在多个页面出现，就抽组件
- 如果只在一个页面出现，但内部结构复杂，也抽页面私有组件
- 如果只是排版容器，就保留为布局节点，不单独抽组件

**5. 哪些 HTML 结构可以忽略**
- Stitch HTML 里很多内容是“能显示出来”的辅助结构，不是你前端必须保留的结构
- 这些通常可以忽略或重写：

**可以忽略的 1：页面头部依赖**
- 外链 Google Fonts
- Google Material Symbols
- Tailwind CDN
- 浏览器专用 meta
- 原型页注入脚本

例如 [family_sharing_index.html:L5-L10](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html#L5-L10) 这类内容，在 Taro 小程序里都不该原样继承

**可以忽略的 2：浏览器专属样式**
- `::-webkit-scrollbar`
- `env(safe-area-inset-bottom)` 的浏览器写法
- `hover:*`
- `sticky` 的浏览器实现细节
- `backdrop-filter` 的强依赖写法

**可以忽略的 3：为视觉导出服务的中间层**
- 没有语义的多层包裹 div
- 只为定位子元素存在的空容器
- 一串 class 拼出来的样式节点

**可以忽略的 4：原型态交互结构**
- demo drawer
- iframe 壳层
- 原型路由脚本
- 页面切换容器

像 [app.css](file:///Users/betus/Documents/trae_projects/baby-growth/prototype_demo/app.css) 里很多是原型预览壳，不应该进入小程序正式代码

**不能忽略的东西**
- 页面结构层次
- 颜色与字号规律
- 卡片边界和间距
- 列表布局和信息优先级
- 组件重复模式

**一句话原则**
- **保留设计规律，丢掉原型实现细节**

**6. 如何从 Stitch 结构翻译成 Taro 结构**
- 推荐你每个页面都按这 5 步处理：

**第 1 步：看 PNG**
- 先看视觉结果，不先看 HTML
- 判断页面分成几块区域

**第 2 步：再看 HTML**
- 只提取：
  - 布局方向
  - 间距关系
  - 文本层级
  - 卡片结构
  - 图片/图标位置

**第 3 步：划 Page / Section / Component**
- 每个页面写一个简短映射草图：
```text
FamilySharingPage
  PageHeader
  FamilyCircleSection
    FamilyMemberList
    InviteActionCard
  SharedMemoriesSection
  BottomActionBar
```

**第 4 步：映射到 token**
- 标记这个页面用到哪些：
  - 颜色
  - 圆角
  - 间距
  - 阴影
  - 字号

**第 5 步：只在最后写代码**
- 先写组件结构
- 再填样式
- 最后对齐 PNG 微调

**7. 如何保证以后 Figma 精修时最小返工**
这部分最关键。

**原则一：不要把 Stitch 节点层级当成最终结构**
- 现在写代码时，要主动做“结构重建”
- 不是把 HTML 一层层翻成 JSX

**原则二：先抽 token，再写页面**
- 后续 Figma 精修时，最容易变的是：
- 间距
- 圆角
- 阴影
- 标题层级
- 组件边界
- 如果这些已经抽成 token，返工就会小很多

**原则三：页面只做组合，不做样式堆积**
- 页面文件里尽量只写：
- 页面结构
- 数据绑定
- 组件组合
- 样式细节尽量收进组件内部

**原则四：组件支持 variant，不要复制多份**
- 比如不要写：
- `EmptyCardA`
- `EmptyCardB`
- `EmptyCardC`
- 而写：
```tsx
<EmptyState variant="search" />
<EmptyState variant="record" />
```

**原则五：图片区和内容区分离**
- 图片、图标、插画资源统一放 `assets`
- 组件只关心“传什么资源”和“怎么摆”
- 后面换图或精修时不会波及结构代码

**原则六：保留映射文档**
- 每个核心页面记录：
- 当前基于哪个 Stitch 页面实现
- 当前抽出了哪些组件
- 哪些地方未来可能按 Figma 重构
- 这样后续让 AI 重构时，输入会清楚很多

**8. 推荐的前端实现约束**
- 每个页面最多 3 层结构语义：
- `Page`
- `Section`
- `Component`
- 每个页面至少拆出 2 到 4 个私有组件，不要把整页写在一个文件里
- 每个组件样式尽量不超过 1 个职责
- 一组重复样式超过 3 次，立即抽组件或 token
- 不用导出 HTML 的 class 名命名业务组件
- 不依赖 Google icon，统一走本地 `Icon` 组件
- 不把字体外链当正式方案，优先系统字体或本地有限引入

**9. 一份可直接执行的页面开发模板**
- 每做一个 Stitch 页面，按这个模板走：

```text
1. 确认页面名称与状态
2. 查看 png，划分 Page / Section / Component
3. 查看 html，提取布局与层级信息
4. 标出复用组件候选
5. 标出使用到的 token
6. 在 Taro 中先搭页面骨架
7. 抽基础组件和业务组件
8. 对照 png 微调
9. 补 empty/loading/error/ai 等状态
10. 在 docs 中记录映射关系
```

**10. 你现在最适合先做的事**
- 先从 [DESIGN.md](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md) 抽第一版 token
- 选 5 个核心页面作为试点：
- `journey_index`
- `record`
- `record_text_ai`
- `baby_profile_view`
- `family_sharing_index`
- 先抽出第一批组件：
- `PageHeader`
- `SectionCard`
- `Avatar`
- `Tag`
- `PrimaryButton`
- `ListCell`
- `EmptyState`
- `BottomTabBar`
- 同步建立 `docs/stitch-to-taro/component-mapping.md`

**一句话版规范**
- 把 Stitch 当设计输入，不当源码模板；把页面翻译成 `Page / Section / Component`；把重复视觉规则抽成 token；把状态显式命名；把映射过程记录下来，这样后面无论补 Stitch 页面还是回 Figma 精修，返工都会小很多。

如果你愿意，我下一步可以继续直接给你一份：
- **基于你当前项目目录的“首批 token 清单”**
- 或者一份 **`family_sharing_index` 页面从 Stitch 到 Taro 的组件拆解示例**。

**落地规范**
- 下面这份规范的目标只有一个：**让你现在能快速把 Stitch 导出页落成 Taro 页面，同时保证后面 Figma 精修时尽量少返工**
- 核心原则是 6 个字：**设计源分离、结构翻译**
- 你当前已有的设计信息可以直接作为规范来源，尤其是 [DESIGN.md](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md) 和 [family_sharing_index.html](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html)

**1. 目录怎么放**
- 把项目分成 3 个区：`设计源`、`前端源码`、`映射文档`
- 不要把 Stitch 的 `html/png` 和 Taro 源码混在一起长期维护
- 推荐结构：

```text
baby-growth/
  design_sources/
    stitch/
      family_share/
        family_sharing_index/
          family_sharing_index.html
          family_sharing_index.png
          meta.md
      journey/
      record/
      baby_data/
      wishes/
    figma_notes/
      components.md
      page_mapping.md

  miniapp/
    src/
      app.tsx
      app.config.ts
      pages/
      packages/
      components/
      features/
      styles/
      tokens/
      assets/
      types/

  docs/
    stitch-to-taro/
      page-inventory.md
      component-mapping.md
      token-mapping.md
      refactor-log.md
```

- `design_sources/stitch`：只放 Stitch 导出物
- `miniapp/src`：只放真正的小程序源码
- `docs/stitch-to-taro`：记录“这个页面映射成了哪些组件、哪些 token、哪些状态”

**推荐每个 Stitch 页面目录加一个 `meta.md`**
- 记录页面用途
- 当前对应的 Taro 页面路径
- 页面状态列表
- 是否已组件化
- 是否后续要回 Figma 精修

**2. 页面状态怎么命名**
- 状态页一定要显式命名，不要只叫一个通用页面名
- 推荐统一格式：

```text
{page-name}.{state}.{ext}
```

- 例如：
```text
record_text.default.html
record_text.ai_suggested.html
record_text.loading.html
record_text.empty.html
record_text.error.html
```

- 如果是多维状态，继续补后缀：
```text
family_search.results.filtered.html
family_search.results.empty.html
family_search.loading.initial.html
family_search.loading.next_page.html
```

**前端文件也建议保持相似命名语义**
- 页面组件：
```text
RecordTextPage.tsx
RecordTextLoading.tsx
RecordTextEmpty.tsx
```
- 组件状态 variant：
```tsx
<RecordTextState variant="loading" />
<RecordTextState variant="empty" />
```

**状态命名建议统一枚举**
- `default`
- `loading`
- `empty`
- `error`
- `disabled`
- `selected`
- `editing`
- `success`
- `ai_pending`
- `ai_result`
- `ai_error`

**原则**
- 页面状态名要表达“用户看到什么”
- 不要用模糊词，比如 `new`、`final`、`v2`

**3. 哪些样式该抽成 token**
- 只要是**跨页面反复出现**的样式，都应该抽成 token
- 你现在已经有很好的 token 来源：
- [DESIGN.md](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md)
- [family_sharing_index.html:L15-L80](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html#L15-L80)
- [app.css:L1-L13](file:///Users/betus/Documents/trae_projects/baby-growth/prototype_demo/app.css#L1-L13)

**第一批必须抽的 token**
- **颜色**
  - `color-bg-page`
  - `color-bg-card`
  - `color-text-primary`
  - `color-text-secondary`
  - `color-primary`
  - `color-secondary`
  - `color-tertiary`
  - `color-border`
  - `color-success`
  - `color-error`

- **字体**
  - `font-size-display`
  - `font-size-title-lg`
  - `font-size-title-md`
  - `font-size-body`
  - `font-size-caption`
  - `line-height-*`
  - `font-weight-*`

- **间距**
  - `spacing-4`
  - `spacing-8`
  - `spacing-12`
  - `spacing-16`
  - `spacing-20`
  - `spacing-24`
  - `spacing-32`

- **圆角**
  - `radius-sm`
  - `radius-md`
  - `radius-lg`
  - `radius-xl`
  - `radius-pill`

- **阴影**
  - `shadow-card`
  - `shadow-float`
  - `shadow-modal`

- **层级**
  - `z-header`
  - `z-tabbar`
  - `z-modal`
  - `z-toast`

**第二批可抽 token**
- 动效时长
- 动效缓动
- 边框粗细
- 安全区高度
- 页面最大宽度
- 图标尺寸档位

**不建议抽成 token 的东西**
- 单页面特有的 `width: 173px`
- 某个页面独有的背景插画尺寸
- 一次性营销卡片的特定渐变角度

**判断标准**
- 出现 3 次以上，考虑抽 token
- 明显属于品牌规范，直接抽 token
- 只服务单页面的魔法数字，不要急着抽 token

**4. 哪些结构该抽成组件**
- 不要按 HTML 节点抽组件，要按**语义和复用**抽组件
- 判断标准：
- 会不会复用
- 有没有独立状态
- 有没有稳定输入输出
- 是否表达一个完整视觉单元

**第一批必须抽的基础组件**
- `PageContainer`
- `PageHeader`
- `BottomTabBar`
- `SectionCard`
- `PrimaryButton`
- `SecondaryButton`
- `IconButton`
- `Tag`
- `Avatar`
- `EmptyState`
- `LoadingSkeleton`
- `ListCell`
- `FormField`
- `SearchBar`

**第二批业务组件**
- `BabyProfileCard`
- `FamilyMemberItem`
- `FamilyInviteCard`
- `MilestoneCard`
- `JourneyListItem`
- `RecordInputCard`
- `RecordPhotoGrid`
- `GrowthStatCard`
- `TrendChartCard`
- `AIInsightCard`

**组件拆分规则**
- 页面级：`Page`
- 区块级：`Section`
- 卡片级：`Card`
- 列表项：`Item`
- 状态块：`State`
- 操作条：`ActionBar`

**推荐命名**
- `FamilySharingPage`
- `FamilyCircleSection`
- `FamilyMemberItem`
- `InviteActionCard`

**不推荐命名**
- `Frame1`
- `WrapBox`
- `InnerTop`
- `LeftPart`

**一个实用公式**
- Stitch 的一个大块区域
- 如果在多个页面出现，就抽组件
- 如果只在一个页面出现，但内部结构复杂，也抽页面私有组件
- 如果只是排版容器，就保留为布局节点，不单独抽组件

**5. 哪些 HTML 结构可以忽略**
- Stitch HTML 里很多内容是“能显示出来”的辅助结构，不是你前端必须保留的结构
- 这些通常可以忽略或重写：

**可以忽略的 1：页面头部依赖**
- 外链 Google Fonts
- Google Material Symbols
- Tailwind CDN
- 浏览器专用 meta
- 原型页注入脚本

例如 [family_sharing_index.html:L5-L10](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/family_sharing_index/family_sharing_index.html#L5-L10) 这类内容，在 Taro 小程序里都不该原样继承

**可以忽略的 2：浏览器专属样式**
- `::-webkit-scrollbar`
- `env(safe-area-inset-bottom)` 的浏览器写法
- `hover:*`
- `sticky` 的浏览器实现细节
- `backdrop-filter` 的强依赖写法

**可以忽略的 3：为视觉导出服务的中间层**
- 没有语义的多层包裹 div
- 只为定位子元素存在的空容器
- 一串 class 拼出来的样式节点

**可以忽略的 4：原型态交互结构**
- demo drawer
- iframe 壳层
- 原型路由脚本
- 页面切换容器

像 [app.css](file:///Users/betus/Documents/trae_projects/baby-growth/prototype_demo/app.css) 里很多是原型预览壳，不应该进入小程序正式代码

**不能忽略的东西**
- 页面结构层次
- 颜色与字号规律
- 卡片边界和间距
- 列表布局和信息优先级
- 组件重复模式

**一句话原则**
- **保留设计规律，丢掉原型实现细节**

**6. 如何从 Stitch 结构翻译成 Taro 结构**
- 推荐你每个页面都按这 5 步处理：

**第 1 步：看 PNG**
- 先看视觉结果，不先看 HTML
- 判断页面分成几块区域

**第 2 步：再看 HTML**
- 只提取：
  - 布局方向
  - 间距关系
  - 文本层级
  - 卡片结构
  - 图片/图标位置

**第 3 步：划 Page / Section / Component**
- 每个页面写一个简短映射草图：
```text
FamilySharingPage
  PageHeader
  FamilyCircleSection
    FamilyMemberList
    InviteActionCard
  SharedMemoriesSection
  BottomActionBar
```

**第 4 步：映射到 token**
- 标记这个页面用到哪些：
  - 颜色
  - 圆角
  - 间距
  - 阴影
  - 字号

**第 5 步：只在最后写代码**
- 先写组件结构
- 再填样式
- 最后对齐 PNG 微调

**7. 如何保证以后 Figma 精修时最小返工**
这部分最关键。

**原则一：不要把 Stitch 节点层级当成最终结构**
- 现在写代码时，要主动做“结构重建”
- 不是把 HTML 一层层翻成 JSX

**原则二：先抽 token，再写页面**
- 后续 Figma 精修时，最容易变的是：
- 间距
- 圆角
- 阴影
- 标题层级
- 组件边界
- 如果这些已经抽成 token，返工就会小很多

**原则三：页面只做组合，不做样式堆积**
- 页面文件里尽量只写：
- 页面结构
- 数据绑定
- 组件组合
- 样式细节尽量收进组件内部

**原则四：组件支持 variant，不要复制多份**
- 比如不要写：
- `EmptyCardA`
- `EmptyCardB`
- `EmptyCardC`
- 而写：
```tsx
<EmptyState variant="search" />
<EmptyState variant="record" />
```

**原则五：图片区和内容区分离**
- 图片、图标、插画资源统一放 `assets`
- 组件只关心“传什么资源”和“怎么摆”
- 后面换图或精修时不会波及结构代码

**原则六：保留映射文档**
- 每个核心页面记录：
- 当前基于哪个 Stitch 页面实现
- 当前抽出了哪些组件
- 哪些地方未来可能按 Figma 重构
- 这样后续让 AI 重构时，输入会清楚很多

**8. 推荐的前端实现约束**
- 每个页面最多 3 层结构语义：
- `Page`
- `Section`
- `Component`
- 每个页面至少拆出 2 到 4 个私有组件，不要把整页写在一个文件里
- 每个组件样式尽量不超过 1 个职责
- 一组重复样式超过 3 次，立即抽组件或 token
- 不用导出 HTML 的 class 名命名业务组件
- 不依赖 Google icon，统一走本地 `Icon` 组件
- 不把字体外链当正式方案，优先系统字体或本地有限引入

**9. 一份可直接执行的页面开发模板**
- 每做一个 Stitch 页面，按这个模板走：

```text
1. 确认页面名称与状态
2. 查看 png，划分 Page / Section / Component
3. 查看 html，提取布局与层级信息
4. 标出复用组件候选
5. 标出使用到的 token
6. 在 Taro 中先搭页面骨架
7. 抽基础组件和业务组件
8. 对照 png 微调
9. 补 empty/loading/error/ai 等状态
10. 在 docs 中记录映射关系
```

**10. 你现在最适合先做的事**
- 先从 [DESIGN.md](file:///Users/betus/Documents/trae_projects/baby-growth/family_share/nurture_bloom/DESIGN.md) 抽第一版 token
- 选 5 个核心页面作为试点：
- `journey_index`
- `record`
- `record_text_ai`
- `baby_profile_view`
- `family_sharing_index`
- 先抽出第一批组件：
- `PageHeader`
- `SectionCard`
- `Avatar`
- `Tag`
- `PrimaryButton`
- `ListCell`
- `EmptyState`
- `BottomTabBar`
- 同步建立 `docs/stitch-to-taro/component-mapping.md`

**一句话版规范**
- 把 Stitch 当设计输入，不当源码模板；把页面翻译成 `Page / Section / Component`；把重复视觉规则抽成 token；把状态显式命名；把映射过程记录下来，这样后面无论补 Stitch 页面还是回 Figma 精修，返工都会小很多。

如果你愿意，我下一步可以继续直接给你一份：
- **基于你当前项目目录的“首批 token 清单”**
- 或者一份 **`family_sharing_index` 页面从 Stitch 到 Taro 的组件拆解示例**。





