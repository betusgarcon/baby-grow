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
        // 外面这层 w-full + justify-center 是为了让操作按钮**水平居中**。
        //
        // 不能只靠父级的 items-center：PrimaryButton 在非 block 时自带
        // `self-start`，它会盖掉父级的对齐，把按钮钉在左边——journey 首页、
        // 里程碑、心愿、记忆四个空态的按钮都是这么跑到左边去的。
        // 套一层 flex 行容器后，横向位置由这层的 justify-center 决定，
        // 而 self-start 此时作用在行容器的纵轴（垂直）上，不再影响居中。
        <View className="w-full flex justify-center">
          <PrimaryButton className="mt-lg" onClick={onAction}>
            {actionText}
          </PrimaryButton>
        </View>
      ) : null}
    </View>
  )
}
