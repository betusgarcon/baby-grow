import { View } from '@tarojs/components'

interface LoadingSkeletonProps {
  /** 骨架块数量 */
  blocks?: number
  /** 每块高度，单位 px */
  blockHeight?: number
  className?: string
}

/**
 * 加载态骨架屏。
 * 小程序对复杂动效支持不稳定，所以只用 Tailwind 自带的 pulse 做静态呼吸，
 * 不引入额外的动画库。
 */
export default function LoadingSkeleton({
  blocks = 3,
  blockHeight = 96,
  className = '',
}: LoadingSkeletonProps) {
  return (
    <View className={`w-full flex flex-col gap-gutter-mobile ${className}`}>
      {Array.from({ length: blocks }, (_, index) => (
        <View
          key={index}
          className="w-full rounded-lg bg-surface-container animate-pulse"
          style={{ height: `${blockHeight}px` }}
        />
      ))}
    </View>
  )
}
