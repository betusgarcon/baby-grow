import type { ReactNode } from 'react'
import { View, Text } from '@tarojs/components'

interface SectionCardProps {
  title?: string
  /** 标题右侧的补充说明或操作入口 */
  extra?: ReactNode
  children: ReactNode
  /** 追加类名，用于覆盖默认底色/圆角（如整块彩色卡片） */
  className?: string
  /** 去掉内边距，交给内容自己撑满（如整宽图片、列表分隔线） */
  flush?: boolean
  onClick?: () => void
}

/**
 * 通用卡片容器。圆角与阴影走 tailwind 里的 token，页面不重复写死。
 */
export default function SectionCard({
  title,
  extra,
  children,
  className = '',
  flush = false,
  onClick,
}: SectionCardProps) {
  return (
    <View
      className={`w-full box-border bg-surface-container-lowest rounded-lg shadow-card overflow-hidden ${
        flush ? '' : 'p-md'
      } ${className}`}
      onClick={onClick}
    >
      {title || extra ? (
        <View className={`flex items-center justify-between ${flush ? 'px-md pt-md' : 'mb-sm'}`}>
          {title ? (
            <Text className="text-headline-md font-semibold text-on-surface">{title}</Text>
          ) : (
            <View />
          )}
          {extra}
        </View>
      ) : null}

      {children}
    </View>
  )
}
