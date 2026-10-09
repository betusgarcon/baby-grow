import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'

interface EventSectionCardProps {
  icon: string
  title: string
  children: ReactNode
  /** 底色等外观由调用方决定，这里只固定结构、圆角与边框 */
  className?: string
}

export default function EventSectionCard({
  icon,
  title,
  children,
  className = 'bg-surface-container-lowest',
}: EventSectionCardProps) {
  return (
    <View
      className={`w-full box-border p-4 rounded-3xl border border-outline-variant flex flex-col gap-3 ${className}`}
    >
      <View className="flex items-center gap-2">
        <Icon name={icon} className="w-5 h-5" />
        <Text className="text-sm font-semibold text-on-surface-variant">{title}</Text>
      </View>

      {children}
    </View>
  )
}
