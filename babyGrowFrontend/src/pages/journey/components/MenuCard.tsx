import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon' // 引入通用 Icon 组件

interface MenuCardProps {
  icon?: string      // 1. 声明可选的 icon 属性
  mealType: string
  title: string
  description: string
}

/**
 * 餐次 → 卡片底色。
 *
 * 配色放在前端而不是由后端（实际是模型）下发一个 Tailwind 类名：
 * 数据层不该知道 UI 层的类名，而且实测模型给的是 `bg-stone-50`——
 * 冷灰压在暖色页面上，卡片就整个糊掉了。早餐淡绿、午餐淡橙取自设计稿。
 */
const MEAL_BACKGROUND: Record<string, string> = {
  breakfast: 'bg-tertiary-container',
  lunch: 'bg-card',
  dinner: 'bg-card',
  snack: 'bg-card',
}

export default function MenuCard({ icon, mealType, title, description }: MenuCardProps) {
  const background = MEAL_BACKGROUND[mealType.trim().toLowerCase()] ?? 'bg-card'

  /**
   * 描述默认只露两行——带配料的文案很长，全展开会把卡片撑得没法横向浏览。
   * 想看全就点一下卡片就地展开，不必再跳一个详情页。
   */
  const [expanded, setExpanded] = useState(false)

  // 两行大约放得下这么多字；比这短就没被截断，不用摆「展开」提示
  const truncated = description.length > 28

  return (
    /*
     * 定宽 + 描述默认限两行。
     * 后端给的描述可能很长（带配料与克数），不限制的话卡片会被撑得很宽，
     * 横向滑动时一屏只露半张，反而看不出今天推荐了几顿。
     */
    <View
      className={`w-[200px] shrink-0 p-4 ${background} rounded-[32px] flex flex-col items-start gap-2`}
      onClick={() => setExpanded((current) => !current)}
    >
      {/* 第一行：Icon 与 mealType 在同一行，且左对齐 */}
      <View className="flex flex-row items-center gap-1.5">
        <Icon name={icon || 'breakfast'} className="w-4 h-4 text-stone-700" />
        <Text className="text-neutral-600 text-xs font-semibold uppercase">{mealType}</Text>
      </View>

      <Text className="text-stone-900 text-base font-semibold">{title}</Text>

      {/* 左对齐：描述是正文，居中会让长短不一的几行看起来散 */}
      <Text className={`text-stone-700 text-xs leading-5 ${expanded ? '' : 'line-clamp-2'}`}>
        {description}
      </Text>

      {truncated ? (
        <Text className="text-[10px] text-stone-500">{expanded ? '收起' : '展开全部'}</Text>
      ) : null}
    </View>
  )
}
