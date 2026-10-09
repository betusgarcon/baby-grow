import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import PrimaryButton from '@/components/PrimaryButton'

interface EmptyStateProps {
  /** 用 Icon 组件里的图标名做图示 */
  icon?: string
  /** 传自定义插画节点，优先级高于 icon */
  illustration?: ReactNode
  title: string
  description?: string
  actionText?: string
  onAction?: () => void
  className?: string
}

/**
 * 空态 = 图示 + 标题 + 说明 + 主操作。
 * 空态是独立业务状态，不是「少渲染一点」，所以操作入口是必填的。
 */
export default function EmptyState({
  icon,
  illustration,
  title,
  description,
  actionText,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <View className={`w-full py-xl flex flex-col items-center ${className}`}>
      {illustration ?? (
        <View className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center mb-md">
          {icon ? <Icon name={icon} className="w-10 h-10" /> : null}
        </View>
      )}

      <Text className="text-headline-md font-semibold text-on-surface">{title}</Text>

      {description ? (
        <Text className="mt-xs text-body-md text-on-surface-variant text-center px-lg">
          {description}
        </Text>
      ) : null}

      {actionText ? (
        <PrimaryButton className="mt-lg" onClick={onAction}>
          {actionText}
        </PrimaryButton>
      ) : null}
    </View>
  )
}
