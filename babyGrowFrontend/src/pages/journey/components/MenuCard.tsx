import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon' // 引入通用 Icon 组件
import { t, getLanguage } from '@/i18n'
import type { MessageKey } from '@/i18n'

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

const MEAL_LABEL_KEYS: Record<string, MessageKey> = {
  breakfast: 'menu.meal.breakfast',
  lunch: 'menu.meal.lunch',
  dinner: 'menu.meal.dinner',
  snack: 'menu.meal.snack',
  meal: 'menu.meal.other',
}

export default function MenuCard({ icon, mealType, title, description }: MenuCardProps) {
  const mealKey = mealType.trim().toLowerCase()
  const background = MEAL_BACKGROUND[mealKey] ?? 'bg-card'
  const mealLabel = MEAL_LABEL_KEYS[mealKey] ? t(MEAL_LABEL_KEYS[mealKey]) : mealType

  /**
   * 描述默认只露两行——带配料的文案很长，全展开会把卡片撑得没法横向浏览。
   * 想看全就点一下卡片就地展开，不必再跳一个详情页。
   */
  const [expanded, setExpanded] = useState(false)

  // 两行大约放得下这么多字；比这短就没被截断，不用摆「展开」提示。
  // 阈值必须按语言分：中文 28 字的信息量约等于英文 60 个字符，
  // 用同一个数字会让英文卡片要么永远显示「展开」，要么永远不显示。
  const truncated = description.length > (getLanguage() === 'en' ? 60 : 28)

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
        <Icon name={icon || 'breakfast'} className="w-4 h-4 text-on-surface-variant" />
        <Text className="text-[11px] font-medium uppercase tracking-[0.08em] text-on-surface-variant">{mealLabel}</Text>
      </View>

      <Text className="text-card-title text-on-surface">{title}</Text>

      {/* 左对齐：描述是正文，居中会让长短不一的几行看起来散 */}
      <Text className={`text-on-surface-variant text-[13px] leading-5 font-normal ${expanded ? '' : 'line-clamp-2'}`}>
        {description}
      </Text>

      {truncated ? (
        <Text className="text-[11px] text-analysis-text-tertiary">
          {expanded ? t('menu.collapse') : t('menu.expand')}
        </Text>
      ) : null}
    </View>
  )
}
