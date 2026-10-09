import { View } from '@tarojs/components'

interface ProgressBarProps {
  /** 0~1 */
  value: number
  className?: string
  /** 填充色，默认主题色；不同页面可换成对应辨识色 */
  barClassName?: string
}

/** 列表卡片、勾选式详情、计数式详情三处共用，所以单独抽出来 */
export default function ProgressBar({
  value,
  className = '',
  barClassName = 'bg-primary',
}: ProgressBarProps) {
  const percent = Math.min(Math.max(value, 0), 1) * 100

  return (
    <View className={`w-full h-2 rounded-full bg-surface-container-high overflow-hidden ${className}`}>
      <View className={`h-full rounded-full ${barClassName}`} style={{ width: `${percent}%` }} />
    </View>
  )
}
