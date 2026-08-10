# 常见问题与解决方案

## 问题 1：Tailwind 任意值语法未被 pxtransform 处理

### 问题
使用 `w-[168px]`、`text-[14px]` 等任意值语法时，Taro 的 postcss-pxtransform 可能未正确转换，导致微信小程序中尺寸显示异常。

### 原因
- Tailwind 任意值生成的 CSS 可能未被 pxtransform 插件捕获
- 任意值的 CSS 类名是动态生成的，转换插件无法预知

### 解决方案

**方案 A：优先使用 Tailwind 内置类**
```tsx
// ❌ 可能有问题
<View className="w-[168px] text-[14px] p-[24px]">

// ✅ 推荐：使用内置类
// w-44 = 176px (最接近 168px)
// text-sm = 14px
// p-6 = 24px
<View className="w-44 text-sm p-6">
```

**方案 B：配置 safelist 保留任意值类**
```typescript
// tailwind.config.js
module.exports = {
  safelist: [
    // 列出项目中使用的所有任意值类
    'w-[168px]', 'text-[14px]', 'p-[24px]',
    'bg-[#FFF8F1]', 'text-[#1E1B17]',
  ],
}
```

### 代码示例
```tsx
// ✅ 最佳实践：封装尺寸常量
const SIZES = {
  avatar: 'w-44 h-44',      // 176px
  cardPadding: 'p-6',        // 24px
  smallText: 'text-sm',      // 14px
}

<View className={`${SIZES.avatar} ${SIZES.cardPadding}`}>
  <Text className={SIZES.smallText}>Hello</Text>
</View>
```

---

## 问题 2：绝对定位导致布局错位

### 问题
使用 `absolute` 定位的元素在不同屏幕或不同内容下位置错误，与其他元素重叠。

### 原因
- 绝对定位脱离文档流，不占据空间
- 父容器未设置 `relative`，定位参考了错误的祖先元素
- 动态内容变化时，绝对定位元素不会随之调整

### 解决方案

**确保父容器有 relative**
```tsx
// ❌ 问题代码
<View>
  <View className="absolute top-4 right-4">
    {/* 定位可能不准确 */}
  </View>
  <Image src={avatar} />
</View>

// ✅ 正确代码
<View className="relative">
  <View className="absolute top-4 right-4 z-10">
    {/* 相对最近的 relative 父容器定位 */}
  </View>
  <Image src={avatar} />
</View>
```

**使用 Flex 布局替代绝对定位**
```tsx
// ❌ 不推荐：用绝对定位实现头像右下角按钮
<View className="relative w-40 h-40">
  <Image src={avatar} className="w-full h-full rounded-full" />
  <View className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full">
    <Icon />
  </View>
</View>

// ✅ 推荐：使用 Flex 布局
<View className="relative w-40 h-40 flex items-end justify-end p-2">
  <Image src={avatar} className="absolute inset-0 rounded-full" />
  <View className="w-8 h-8 rounded-full z-10">
    <Icon />
  </View>
</View>
```

### 代码示例
```tsx
// 通用的头像+编辑按钮组件
const AvatarWithEdit = ({ src, size = 160 }) => (
  <View className="relative" style={{ width: size, height: size }}>
    <Image 
      src={src} 
      className="w-full h-full rounded-full border-4 border-white" 
    />
    <View 
      className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full 
                 bg-white shadow-lg flex items-center justify-center"
      onClick={handleEdit}
    >
      <Icon name="edit" size={18} />
    </View>
  </View>
)
```

---

## 问题 3：内联 style 硬编码样式

### 问题
在 `style={{}}` 中硬编码颜色、尺寸等值，导致无法通过 Token 统一管理。

### 原因
- 内联 style 覆盖 CSS 类，无法被 Tailwind 或 Token 系统处理
- 动态值需要用 style，但静态值应使用 className

### 解决方案

**静态样式 → className**
```tsx
// ❌ 不推荐：静态样式用内联
<Text style={{ color: '#2E2822', fontSize: 16, fontWeight: 60 }}>
  Title
</Text>

// ✅ 推荐：静态样式用 className
<Text className="text-base font-semibold text-[#2E2822]">
  Title
</Text>
```

**动态样式 → style + Token**
```tsx
// ✅ 动态样式可以用 style，但引用 Token
import { analysisColors } from '../tokens'

<View style={{ backgroundColor: isActive ? analysisColors.activeBg : analysisColors.inactiveBg }}>
  <Text style={{ color: isActive ? analysisColors.activeText : analysisColors.inactiveText }}>
    {label}
  </Text>
</View>
```

### 代码示例
```tsx
// ❌ 问题代码
const StatusBadge = ({ status }) => {
  const colors = {
    active: { bg: '#D9E7CE', text: '#5B7358' },
    inactive: { bg: '#EFEEEB', text: '#7A766F' },
  }
  const current = colors[status]
  
  return (
    <View style={{ backgroundColor: current.bg, borderRadius: 9999 }}>
      <Text style={{ color: current.text, fontSize: 14 }}>
        {status}
      </Text>
    </View>
  )
}

// ✅ 推荐代码
import { analysisColors } from '../tokens'

const StatusBadge = ({ status }) => {
  const isActive = status === 'active'
  
  return (
    <View 
      className={`rounded-full ${isActive ? 'bg-[#D9E7CE]' : 'bg-[#EFEEEB]'}`}
    >
      <Text 
        className={`text-sm ${isActive ? 'text-[#5B7358]' : 'text-[#7A766F]'}`}
      >
        {status}
      </Text>
    </View>
  )
}
```

---

## 问题 4：禁用类名列表中的陷阱

### 问题
以下类名容易被误用，应避免使用：

| 禁用类名 | 原因 | 替代方案 |
|---------|------|----------|
| `text-black` | Tailwind 默认值，与设计稿的 `#1E1B17` 不匹配 | `text-[#1E1B17]` |
| `text-white` | 设计稿中的白色可能有不同透明度 | `text-[#FFFFFF]` |
| `bg-gray-100` | Tailwind 灰可能与设计稿不一致 | `bg-[#F4F1EC]` |
| `bg-stone-200` | Tailwind 默认色板 | `bg-[#E8E1D9]` |
| `border-gray-300` | 不匹配设计稿的边框色 | `border-[#C8C7BE]` |

### 原因
Tailwind 的默认色板是通用设计系统，不一定与项目的 Figma 设计稿匹配。

### 解决方案
**创建项目专用色板配置**
```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // 项目专用色板
        baby: {
          bg: '#FFF8F1',
          bgDark: '#FAF2EA',
          primary: '#406651',
          orange: '#FED5B9',
          text: {
            primary: '#1E1B17',
            secondary: '#474741',
            tertiary: '#5F5F59',
          },
        },
      },
      borderRadius: {
        '4xl': '32px',
      },
    },
  },
}
```

### 代码示例
```tsx
// ❌ 不推荐
<View className="bg-gray-100 text-black rounded-lg">

// ✅ 推荐：使用项目专用色板
<View className="bg-baby-bg text-baby-text-primary rounded-4xl">
```

---

## 问题 5：底部内容被 TabBar 遮挡

### 问题
页面底部的内容被自定义 TabBar 遮挡，用户无法看到完整内容。

### 原因
- 内容区域的 `padding-bottom` 未考虑 TabBar 高度
- iPhone 安全区域（Home Indicator）的额外高度未计算

### 解决方案

**计算需要的底部间距**
```typescript
// TabBar 高度：约 64px (h-16)
// iPhone 安全区域：约 34px
// 缓冲空间：约 14px
// 总计：约 112px = pb-28

const BOTTOM_SAFE_SPACE = 28  // pb-28 = 112px

<View className={`min-h-screen pb-${BOTTOM_SAFE_SPACE}`}>
  {/* 页面内容 */}
</View>
```

**动态计算高度**
```tsx
import Taro from '@tarojs/taro'

const PageLayout = ({ children }) => {
  const [bottomSpace, setBottomSpace] = useState(0)
  
  useEffect(() => {
    const { safeArea } = Taro.getSystemInfoSync()
    const tabBarHeight = 64
    const safeBottom = safeArea ? safeArea.bottom : 0
    setBottomSpace(tabBarHeight + safeBottom + 16)
  }, [])
  
  return (
    <View style={{ paddingBottom: bottomSpace }}>
      {children}
    </View>
  )
}
```

---

## 问题 6：页面路由路径错误

### 问题
新增的页面在 Taro 编译时找不到，报 "doesn't exist" 错误。

### 原因
- 页面路径配置错误
- 目录结构与路径不匹配

### 解决方案

**正确配置路径**
```typescript
// src/app.config.ts
export default defineAppConfig({
  pages: [
    // 路径格式：相对于 src 目录
    'pages/index/index',                    // src/pages/index/index.tsx
    'pages/analysis/growth/index',          // src/pages/analysis/growth/index.tsx
    'figma_demo/pages/home/index',          // src/figma_demo/pages/home/index.tsx
  ],
})
```

**目录结构对应**
```
src/
├── pages/
│   ├── index/
│   │   └── index.tsx
│   └── analysis/
│       └── growth/
│           └── index.tsx
└── figma_demo/
    └── pages/
        └── home/
            └── index.tsx
```

### 代码示例
```bash
# ✅ 正确的目录结构
babycare/src/
├── figma_demo/
│   ├── pages/
│   │   ├── home/
│   │   │   ├── index.tsx
│   │   │   └── index.config.ts
│   │   └── change-photo/
│   │       ├── index.tsx
│   │       └── index.config.ts
│   └── images/
│       └── *.svg
├── pages/
│   └── analysis/
│       └── growth/
│           └── index.tsx
└── app.config.ts
```

---

## 总结：最佳实践清单

1. **样式管理**
   - ✅ 使用 Token 变量管理颜色、圆角
   - ✅ 优先使用 Tailwind 内置类
   - ❌ 避免硬编码样式值

2. **布局处理**
   - ✅ 使用 Flex 布局
   - ✅ 绝对定位时确保父容器有 `relative`
   - ✅ 预留底部安全空间

3. **代码规范**
   - ✅ 颜色使用任意值语法（`bg-[#FFF8F1]`）
   - ❌ 避免内联 style 写静态样式
   - ❌ 禁用 Tailwind 默认色板

4. **项目结构**
   - ✅ 页面路径与目录结构一致
   - ✅ 组件按功能模块拆分
