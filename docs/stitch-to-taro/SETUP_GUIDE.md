# Nurture & Bloom 小程序项目搭建手册

## 项目概述

**Nurture & Bloom** 是一款宝宝成长记录小程序，采用莫兰迪色系设计风格，包含5个核心业务模块：

| 模块 | 功能描述 |
|------|----------|
| **Journey** | 时光旅程，记录宝宝成长轨迹 |
| **Record** | 记录中心，支持文本/图片/AI识别记录 |
| **Wishes** | 心愿清单，记录宝宝成长心愿 |
| **Family Share** | 家庭共享，支持家庭成员协作 |
| **Baby Data** | 数据空间，展示宝宝饮食/睡眠/成长数据 |

---

## 第1章：环境准备

### 1.1 Node.js 版本锁定

> ⚠️ **关键注意事项**：基于经验教训（experience_id: 988310），Taro 3.x + webpack4 与高版本 Node(20+) 存在严重兼容性问题，必须使用 **Node 18 LTS**。

**操作步骤：**

```bash
# 安装 nvm（如未安装）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 重启终端后执行
nvm install 18.20.3
nvm use 18.20.3
nvm alias default 18.20.3

# 验证版本
node --version
# 预期输出: v18.20.3
npm --version
# 预期输出: 9.x.x
```

**失败排查：**
- 若出现 `ERR_OSSL_EVP_UNSUPPORTED` 错误，说明 Node 版本过高，切换到 18.x
- 若 nvm 命令不生效，重启终端或执行 `source ~/.zshrc`

### 1.2 微信开发者工具

**下载地址：** https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

**安装配置：**
1. 安装微信开发者工具（稳定版）
2. 登录微信账号
3. 开启「不校验合法域名」（开发阶段）：
   - 设置 → 项目设置 → 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」

### 1.3 项目目录结构

```
baby-growth/
├── design_sources/          # 设计源文件（不可直接用于小程序）
│   ├── stitch/              # Stitch 导出的 HTML/PNG 设计稿
│   │   ├── family_share/
│   │   ├── journey/
│   │   ├── record/
│   │   ├── baby_data/
│   │   ├── wishes/
│   │   └── prototype_demo/
│   └── figma_notes/         # Figma 精修笔记
├── miniapp/                 # Taro 小程序源码（实际开发目录）
│   └── src/
│       ├── components/      # 通用组件
│       ├── pages/           # 页面目录
│       ├── tokens/          # Design Token
│       ├── styles/          # 全局样式
│       ├── assets/          # 静态资源
│       ├── types/           # TypeScript 类型定义
│       └── utils/           # 工具函数
└── docs/                    # 项目文档
    └── stitch-to-taro/      # Stitch → Taro 映射文档
```

---

## 第2章：Taro 项目初始化

### 2.1 安装 Taro CLI

```bash
# 使用 npm 全局安装（推荐）
npm install -g @tarojs/cli@3.6.32

# 验证安装
taro --version
# 预期输出: 3.6.32
```

**版本说明：**
- Taro 3.6.32 是经过验证的稳定版本
- 若使用更高版本（如 3.7+），需注意 webpack5 迁移问题

### 2.2 创建 Taro 项目

```bash
# 在 miniapp 目录下初始化
cd /Users/betus/Documents/trae_projects/baby-growth/miniapp

# 使用 Taro CLI 创建项目
taro init .

# 按照提示选择：
# ? 请输入项目名称: baby-growth
# ? 请输入项目描述: 宝宝成长记录小程序
# ? 请选择框架: React
# ? 请选择语言: TypeScript
# ? 请选择 CSS 预处理器: Sass
# ? 是否需要使用状态管理器: Redux (可选，根据需求选择)
# ? 是否需要使用 TypeScript: Yes
```

**预期输出：**
```
✨ 项目初始化完成！
```

### 2.3 安装依赖

```bash
cd /Users/betus/Documents/trae_projects/baby-growth/miniapp

# 使用 npm 安装依赖
npm install

# 安装 tailwindcss 及小程序适配
npm install tailwindcss@3.4.14 postcss autoprefixer
npm install @tailwindcss/vite @tarojs/plugin-tailwindcss
```

**版本锁定原因：**
- `tailwindcss@3.4.14`：与 `weapp-tailwindcss` 兼容，避免 patch 路径问题
- 不使用 Tailwind 4.x，因其与小程序适配工具存在兼容性问题

---

## 第3章：配置文件修改

### 3.1 配置 tailwind.config.js

```bash
npx tailwindcss init -p
```

修改 `tailwind.config.js`：

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: '#fbf9f6',
        'surface-dim': '#dbdad7',
        'surface-bright': '#fbf9f6',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f5f3f0',
        'surface-container': '#efeeeb',
        'surface-container-high': '#eae8e5',
        'surface-container-highest': '#e4e2df',
        'on-surface': '#1b1c1a',
        'on-surface-variant': '#424849',
        'inverse-surface': '#30312f',
        'inverse-on-surface': '#f2f0ed',
        outline: '#72787a',
        'outline-variant': '#c2c7c9',
        'surface-tint': '#496269',
        primary: '#496269',
        'on-primary': '#ffffff',
        'primary-container': '#8fa9b0',
        'on-primary-container': '#253e44',
        'inverse-primary': '#b1cbd2',
        secondary: '#56624e',
        'on-secondary': '#ffffff',
        'secondary-container': '#d9e7ce',
        'on-secondary-container': '#5c6854',
        tertiary: '#835332',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#d39872',
        'on-tertiary-container': '#593012',
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
      },
      fontFamily: {
        'plus-jakarta': ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      spacing: {
        md: '24px',
        lg: '40px',
        xl: '64px',
        gutter: '20px',
      },
    },
  },
  plugins: [],
}
```

### 3.2 配置 Taro 构建

修改 `config/index.js`：

```js
module.exports = {
  projectName: 'baby-growth',
  date: '2026-07-20',
  designWidth: 390,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    390: 1,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [
    '@tarojs/plugin-tailwindcss',
  ],
  defineConstants: {
  },
  copy: {
    patterns: [],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: true,
  },
  mini: {
    postcss: {
      autoprefixer: {
        enable: true,
        config: {
          overrideBrowserslist: ['iOS >= 9', 'Android >= 4.4'],
        },
      },
      pxtransform: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
        config: {
          overrideBrowserslist: ['iOS >= 9', 'Android >= 4.4'],
        },
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
}
```

### 3.3 创建全局样式文件

修改 `src/app.scss`：

```scss
@import "tailwindcss";

@theme {
  --color-surface: #fbf9f6;
  --color-surface-dim: #dbdad7;
  --color-surface-bright: #fbf9f6;
  --color-surface-container-lowest: #ffffff;
  --color-surface-container-low: #f5f3f0;
  --color-surface-container: #efeeeb;
  --color-surface-container-high: #eae8e5;
  --color-surface-container-highest: #e4e2df;
  --color-on-surface: #1b1c1a;
  --color-on-surface-variant: #424849;
  --color-inverse-surface: #30312f;
  --color-inverse-on-surface: #f2f0ed;
  --color-outline: #72787a;
  --color-outline-variant: #c2c7c9;
  --color-surface-tint: #496269;
  --color-primary: #496269;
  --color-on-primary: #ffffff;
  --color-primary-container: #8fa9b0;
  --color-on-primary-container: #253e44;
  --color-inverse-primary: #b1cbd2;
  --color-secondary: #56624e;
  --color-on-secondary: #ffffff;
  --color-secondary-container: #d9e7ce;
  --color-on-secondary-container: #5c6854;
  --color-tertiary: #835332;
  --color-on-tertiary: #ffffff;
  --color-tertiary-container: #d39872;
  --color-on-tertiary-container: #593012;
  --color-error: #ba1a1a;
  --color-on-error: #ffffff;
  --color-error-container: #ffdad6;
  --color-on-error-container: #93000a;
  
  --font-family-plus-jakarta: 'Plus Jakarta Sans', sans-serif;
  
  --radius-sm: 0.5rem;
  --radius-md: 1.5rem;
  --radius-lg: 2rem;
  --radius-xl: 3rem;
  --radius-full: 9999px;
  
  --shadow-card: 0 10px 30px rgba(31, 42, 46, 0.08);
  --shadow-float: 0 16px 32px rgba(73, 98, 105, 0.24);
  --shadow-modal: 0 24px 60px rgba(31, 42, 46, 0.16);
}

page {
  background-color: var(--color-surface);
  color: var(--color-on-surface);
  font-family: var(--font-family-plus-jakarta);
  -webkit-font-smoothing: antialiased;
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.custom-scrollbar::-webkit-scrollbar {
  display: none;
}
```

---

## 第4章：Design Token 使用指南

### 4.1 Token 文件结构

```
src/tokens/
├── colors.ts        # 颜色系统
├── typography.ts    # 字体层级
├── spacing.ts       # 间距规则
├── rounded.ts       # 圆角规则
├── shadows.ts       # 阴影规则
├── zIndex.ts        # 层级规则
└── index.ts         # 统一导出
```

### 4.2 使用示例

```tsx
import { colors, typography, spacing, rounded, shadows } from '../tokens'

const MyComponent = () => (
  <View 
    style={{
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: rounded.lg,
      padding: spacing.md,
      shadow: shadows.card,
    }}
  >
    <Text style={{
      fontSize: typography.headlineMd.fontSize,
      fontWeight: typography.headlineMd.fontWeight,
      lineHeight: typography.headlineMd.lineHeight,
    }}>
      Hello World
    </Text>
  </View>
)
```

### 4.3 第一批必须掌握的 Token

**颜色：**
| Token | 值 | 用途 |
|-------|-----|------|
| primary | #496269 | 主色调，按钮/链接 |
| secondary | #56624e | 次色调，成功状态 |
| tertiary | #835332 | 强调色，通知/高亮 |
| surface | #fbf9f6 | 页面背景 |
| surface-container-lowest | #ffffff | 卡片背景 |
| on-surface | #1b1c1a | 主文本色 |

**字体：**
| Token | 字号 | 行高 | 用途 |
|-------|------|------|------|
| headlineMd | 24px | 32px | 页面标题 |
| bodyMd | 16px | 24px | 正文内容 |
| labelMd | 14px | 20px | 标签/按钮文本 |
| labelSm | 12px | 16px | 小标题/辅助文字 |

---

## 第5章：Stitch HTML → Taro 转换规则

### 5.1 不可直接使用的内容清单

| Stitch 内容 | 问题 | 小程序替代方案 |
|-------------|------|----------------|
| Google Fonts 外链 | 小程序不支持第三方字体外链 | 使用系统字体或 `@font-face` 本地引入 |
| Material Symbols | 图标字体，小程序不支持 | 使用 SVG 图标或 `iconfont` |
| Tailwind CDN | 小程序不支持 CDN 脚本 | 使用 Taro 插件集成 |
| backdrop-filter | 浏览器特性，小程序部分支持 | 使用 `wx.createCanvasContext` 或降级方案 |
| `env(safe-area-inset-*)` | 浏览器写法 | 使用 Taro 提供的 `safeArea` API |
| `::-webkit-scrollbar` | 浏览器伪元素 | 使用小程序滚动容器 |
| `hover:*` | 鼠标悬停状态 | 使用 `tap` 事件和状态变量 |

### 5.2 转换流程

```
1. 看 PNG 设计稿 → 划分页面区块
2. 看 HTML 结构 → 提取布局信息
3. 划 Page / Section / Component → 组件化
4. 映射到 Token → 统一样式
5. 写 Taro 代码 → 对照 PNG 微调
```

### 5.3 组件化规则

**页面级组件（Page）：**
- `JourneyPage` - 时光旅程首页
- `RecordPage` - 记录中心
- `WishesPage` - 心愿清单
- `FamilySharePage` - 家庭共享
- `BabyDataPage` - 数据空间

**基础组件（Component）：**
- `NavBar` - 顶部导航栏
- `TabBar` - 底部导航栏
- `Card` - 卡片容器
- `Button` - 按钮组件
- `Avatar` - 头像组件
- `Tag` - 标签组件
- `EmptyState` - 空状态
- `LoadingSkeleton` - 骨架屏

---

## 第6章：微信开发者工具联调

### 6.1 构建项目

```bash
cd /Users/betus/Documents/trae_projects/baby-growth/miniapp

# 构建微信小程序
npm run build:weapp

# 或使用开发模式（热更新）
npm run dev:weapp
```

**预期输出：**
```
✅ 编译成功
```

**失败排查：**
- `ERR_OSSL_EVP_UNSUPPORTED`：检查 Node 版本，必须使用 18.x
- 依赖缺失：执行 `rm -rf node_modules package-lock.json && npm install`
- TypeScript 错误：检查代码类型定义

### 6.2 导入项目到微信开发者工具

1. 打开微信开发者工具
2. 点击「导入项目」
3. 选择目录：`/Users/betus/Documents/trae_projects/baby-growth/miniapp/dist`
4. 输入 AppID（开发阶段可使用测试号）
5. 点击「确定」

### 6.3 调试技巧

- **真机调试**：工具栏 → 真机调试 → 扫码在手机上预览
- **Console 调试**：查看小程序日志和错误
- **Network 面板**：查看 API 请求
- **Wxml 面板**：查看组件树结构

---

## 第7章：第一批页面开发流程

### 7.1 页面优先级

| 优先级 | 页面 | 状态 | 设计源 |
|--------|------|------|--------|
| P0 | JourneyIndex | 默认/加载/空 | design_sources/stitch/journey/journey_index/ |
| P0 | Record | 默认/AI识别 | design_sources/stitch/record/record/ |
| P0 | FamilyShare | 默认/邀请 | design_sources/stitch/family_share/family_sharing_index/ |
| P1 | BabyProfile | 默认/编辑 | design_sources/stitch/journey/baby_profile_view/ |
| P1 | RecordTextAI | AI识别流程 | design_sources/stitch/record/record_text_ai/ |

### 7.2 开发模板

每个页面按以下步骤开发：

```
1. 创建页面目录和文件
2. 配置路由（app.config.ts）
3. 创建页面结构组件
4. 提取页面私有组件
5. 对照 PNG 设计稿调整样式
6. 补全 loading/empty/error 状态
7. 记录映射关系（docs/stitch-to-taro/page-inventory.md）
```

### 7.3 创建页面示例

```bash
# 创建 Journey 首页
cd /Users/betus/Documents/trae_projects/baby-growth/miniapp

# 使用 Taro CLI 创建页面
taro create page journey/index
```

**页面文件结构：**
```
src/pages/journey/
├── index.tsx        # 页面主文件
├── index.scss       # 页面样式
└── components/      # 页面私有组件
    └── JourneyCard.tsx
```

---

## 第8章：常见问题排查

### 8.1 构建失败

**问题：** `ERR_OSSL_EVP_UNSUPPORTED`

**解决方案：**
```bash
# 方法1：切换 Node 版本
nvm use 18.20.3

# 方法2：临时设置环境变量（不推荐）
export NODE_OPTIONS=--openssl-legacy-provider
npm run build:weapp
```

### 8.2 Tailwind CSS 不生效

**问题：** 样式没有应用到页面

**解决方案：**
1. 检查 `tailwind.config.js` 的 `content` 配置
2. 确保 `src/app.scss` 引入了 `@import "tailwindcss"`
3. 检查 Taro 插件配置 `@tarojs/plugin-tailwindcss`

### 8.3 微信开发者工具报错

**问题：** `未找到入口文件`

**解决方案：**
1. 确认构建成功（`dist` 目录存在）
2. 检查 `project.config.json` 配置
3. 重新导入项目

### 8.4 图标不显示

**问题：** Material Symbols 图标无法显示

**解决方案：**
1. 将图标转换为 SVG
2. 使用 `iconfont` 替代
3. 创建自定义 Icon 组件

---

## 第9章：后续计划

### 9.1 第二阶段：核心组件开发

- `NavBar` - 顶部导航栏
- `TabBar` - 底部导航栏（含中间圆形按钮）
- `Card` - 卡片容器
- `Button` - 按钮组件（主/次/线框/图标）
- `Avatar` - 头像组件
- `Tag` - 标签组件
- `EmptyState` - 空状态组件
- `LoadingSkeleton` - 骨架屏组件

### 9.2 第三阶段：业务页面开发

按优先级逐步实现各模块页面：
1. Journey（时光旅程）
2. Record（记录中心）
3. Family Share（家庭共享）
4. Baby Data（数据空间）
5. Wishes（心愿清单）

### 9.3 第四阶段：交互与状态补全

- 补全 loading/empty/error/disabled 状态
- 实现页面间跳转
- 接入 API 接口
- 实现家庭邀请流程

---

## 附录：命令速查表

| 命令 | 用途 |
|------|------|
| `taro init .` | 初始化 Taro 项目 |
| `npm run dev:weapp` | 开发模式（热更新） |
| `npm run build:weapp` | 构建微信小程序 |
| `taro create page <name>` | 创建页面 |
| `npx tailwindcss init -p` | 初始化 Tailwind CSS |
| `node --version` | 查看 Node 版本 |
| `nvm use 18.20.3` | 切换 Node 版本 |

---

**文档版本：** v1.0  
**创建日期：** 2026-07-20  
**适用项目：** Nurture & Bloom 宝宝成长记录小程序