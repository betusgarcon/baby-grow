import type { ReactNode } from 'react'
import { View } from '@tarojs/components'
import EmptyState from '@/components/EmptyState'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import type { LoadStatus } from '@/store'

interface AsyncSectionProps {
  status: LoadStatus
  onRetry: () => void
  children: ReactNode
  /** 骨架屏块数与高度，不同页面内容高度差别大 */
  skeletonBlocks?: number
  skeletonHeight?: number
}

/**
 * 异步区块：按加载状态渲染骨架屏 / 失败重试 / 内容。
 *
 * 之前全站没有任何 error 态，13 个页面也没有加载态——接后端之后失败路径
 * 就没有兜底。把三态收敛到一个组件里，各页只需要传 status 和重试函数。
 */
export default function AsyncSection({
  status,
  onRetry,
  children,
  skeletonBlocks = 3,
  skeletonHeight = 120,
}: AsyncSectionProps) {
  if (status === 'loading' || status === 'idle') {
    return <LoadingSkeleton blocks={skeletonBlocks} blockHeight={skeletonHeight} />
  }

  if (status === 'error') {
    return (
      <View className="pt-6">
        <EmptyState
          icon="event-medical"
          title="加载失败"
          description="没能取到数据，检查网络后可以重试。"
          actionText="重试"
          onAction={onRetry}
        />
      </View>
    )
  }

  return <>{children}</>
}
