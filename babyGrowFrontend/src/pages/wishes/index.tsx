import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import BottomTabBar from '@/components/BottomTabBar'
import EmptyState from '@/components/EmptyState'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import RecordSheet from '@/components/RecordSheet'
import { handleBottomTabNavigation } from '@/utils/analysisNavigation'
import { navigateToRoute } from '@/utils/routes'
import type { SectionState } from '@/types/common'
import babyAvatar from '@/assets/images/baby-journey-img.png'
import WishCard from './components/WishCard'
import { wishes as initialWishes, wishesEmptyCopy, type Wish } from './wishesData'

export default function WishesListPage() {
  const [wishes, setWishes] = useState<Wish[]>([])
  const [state, setState] = useState<SectionState>('loading')
  const [recordOpen, setRecordOpen] = useState(false)

  useEffect(() => {
    // 后端未实现，用一次短延时顶替接口请求，好让加载态是真实可达的状态
    // 而不是永远走不到的死分支。接入 API 后换成真实请求即可。
    const timer = setTimeout(() => {
      setWishes(initialWishes)
      setState(initialWishes.length > 0 ? 'content' : 'empty')
    }, 400)

    return () => clearTimeout(timer)
  }, [])

  const confirmRemove = async (wish: Wish) => {
    const result = await Taro.showModal({
      title: `删除「${wish.title}」？`,
      content: '删除后这个心愿及其进度会一并移除。',
      confirmText: '删除',
      confirmColor: '#ba1a1a',
      cancelText: '取消',
    })

    if (!result.confirm) return

    setWishes((previous) => {
      const next = previous.filter((item) => item.id !== wish.id)

      setState(next.length > 0 ? 'content' : 'empty')

      return next
    })
  }

  return (
    <PageContainer
      bottomBar={
        <BottomTabBar activeKey="wishes" onTabChange={handleBottomTabNavigation} />
      }
      header={<PageHeader title="Wishes" profile={{ avatar: babyAvatar, ageLabel: '6M' }} />}
    >
      <View className="flex flex-col gap-4">
        {/* 标题与说明已由顶部导航栏承担，这里不再重复一遍 */}

        {state === 'loading' ? <LoadingSkeleton blocks={3} blockHeight={180} /> : null}

        {state === 'content' ? (
          <View className="flex flex-col gap-4">
            {wishes.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                onClick={() => navigateToRoute(wish.route)}
                onRemove={() => confirmRemove(wish)}
              />
            ))}
          </View>
        ) : null}

        {state === 'empty' ? (
          <EmptyState
            icon="star"
            title={wishesEmptyCopy.title}
            description={wishesEmptyCopy.description}
            actionText="去记录一条"
            onAction={() => setRecordOpen(true)}
          />
        ) : null}
      </View>

      {/* 记录弹层由页面自己持有；接上后会回调刷新列表 */}
      <RecordSheet
        visible={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSaved={() => setRecordOpen(false)}
      />
    </PageContainer>
  )
}
