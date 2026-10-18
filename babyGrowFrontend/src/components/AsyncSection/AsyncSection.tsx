import type { ReactNode } from 'react'
import { View } from '@tarojs/components'
import EmptyState from '@/components/EmptyState'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import { t } from '@/i18n'
import type { LoadStatus } from '@/store'

interface AsyncSectionProps {
  status: LoadStatus
  onRetry: () => void
  children: ReactNode
  /** 骨架屏块数与高度，不同页面内容高度差别大 */
  skeletonBlocks?: number
  skeletonHeight?: number
  /**
   * 数据为空（加载成功但没有内容）。与 `emptyState` 一起用。
   *
   * 「空」原本不在这个组件里，于是每个列表页都得在 children 里自己写一遍
   * `length ? … : …`，漏写就是一片空白容器——family 页与首页 Recent Milestones
   * 就是这么漏的。把它提升成与 loading / error 并列的第四态，页面就没法只处理一半。
   *
   * 传值时写成 `data?.hasData === false` 这类**严格比较**，不要写 `!data?.hasData`：
   * 后端还没上线这个字段时 `undefined` 会被当成「空」，反而把有数据的页面显示成空态
   * （前端先于后端发布就会踩到）。
   */
  isEmpty?: boolean
  /** 为空时渲染什么。内容由页面给（各页图示/文案/按钮都不同），组件只负责不让它被漏掉 */
  emptyState?: ReactNode
}

/**
 * 异步区块：按状态渲染 骨架屏 / 失败重试 / 空态 / 内容。
 *
 * 之前全站没有任何 error 态，13 个页面也没有加载态——接后端之后失败路径
 * 就没有兜底。把四态收敛到一个组件里，各页只需要传 status 和重试函数。
 */
export default function AsyncSection({
  status,
  onRetry,
  children,
  skeletonBlocks = 3,
  skeletonHeight = 120,
  isEmpty = false,
  emptyState,
}: AsyncSectionProps) {
  if (status === 'loading' || status === 'idle') {
    return <LoadingSkeleton blocks={skeletonBlocks} blockHeight={skeletonHeight} />
  }

  if (status === 'error') {
    return (
      <View className="pt-6">
        <EmptyState
          icon="event-medical"
          title={t('state.loadingFailed')}
          description={t('state.loadingFailedDesc')}
          actionText={t('common.retry')}
          onAction={onRetry}
        />
      </View>
    )
  }

  // 只在真的传了空态时才拦：没传的页面（例如详情页自己处理「找不到」）
  // 仍然原样渲染 children，行为与改动前一致。
  if (isEmpty && emptyState) {
    return <>{emptyState}</>
  }

  return <>{children}</>
}
