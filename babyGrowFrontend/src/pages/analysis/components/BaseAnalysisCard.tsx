import type { CSSProperties } from 'react'
import type { PropsWithChildren } from 'react'
import { View } from '@tarojs/components'
import { analysisColors } from './analysisTokens'

interface BaseAnalysisCardProps extends PropsWithChildren {
  className?: string
  padded?: boolean
  elevated?: boolean
  muted?: boolean
  style?: CSSProperties
}

/**
 * BaseAnalysisCard
 *
 * analysis 模块里大量卡片都共享同一套“白底、圆角、边框、阴影”的骨架。
 * 抽出这一层后，具体业务卡片只需要关心“内容长什么样”，
 * 不需要每次都重新拼接一套相同的容器样式。
 */
export default function BaseAnalysisCard({
  className,
  padded = true,
  elevated = false,
  muted = false,
  style,
  children,
}: BaseAnalysisCardProps) {
  // 这里把 analysis 模块最常见的容器风格统一收口。
  // 页面层只要关心“是否要内边距 / 是否要更浅背景 / 是否要更明显阴影”即可。
  return (
    <View
      className={`w-full rounded-[32px] ${padded ? 'p-4' : ''} ${className || ''}`}
      style={{
        backgroundColor: muted ? analysisColors.cardMutedBg : '#FFFFFF',
        border: `1px solid ${muted ? analysisColors.cardMutedBorder : analysisColors.cardBorder}`,
        boxShadow: elevated ? '0 30px 60px -15px rgba(0,0,0,0.04)' : '0 4px 30px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {children}
    </View>
  )
}
