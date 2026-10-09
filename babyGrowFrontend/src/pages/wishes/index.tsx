import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import BottomTabBar from '@/components/BottomTabBar'
import EmptyState from '@/components/EmptyState'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Icon from '@/components/Icon'
import { handleBottomTabNavigation } from '@/utils/analysisNavigation'
import { navigateToRoute, openRecordSheet } from '@/utils/routes'
import type { SectionState } from '@/types/common'
import babyAvatar from '@/assets/images/baby-journey-img.png'
import WishCard from './components/WishCard'
import { wishes as initialWishes, wishesEmptyCopy, wishesIntro, type Wish } from './wishesData'

export default function WishesListPage() {
  const [wishes, setWishes] = useState<Wish[]>([])
  const [state, setState] = useState<SectionState>('loading')

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
      header={
        <PageHeader
          title="Wishes"
          leading={
            <>
              <View className="w-10 h-10 rounded-full overflow-hidden bg-surface-container">
                <Image src={babyAvatar} className="w-full h-full" mode="aspectFill" />
              </View>
              <Text className="px-2 py-0.5 rounded-full bg-secondary-container text-sm font-bold text-on-secondary-container">
                6M
              </Text>
            </>
          }
          right={
            <View
              className="w-9 h-9 flex items-center justify-center"
              onClick={() => Taro.showToast({ title: '更多操作待开发', icon: 'none' })}
            >
              <Icon name="more-vert" className="w-5 h-5" />
            </View>
          }
        />
      }
    >
      <View className="flex flex-col gap-4">
        <View className="flex flex-col gap-2 pt-2">
          <Text className="text-4xl font-bold text-on-surface">Wishes</Text>
          <Text className="text-base text-on-surface-variant">{wishesIntro}</Text>
        </View>

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
            onAction={openRecordSheet}
          />
        ) : null}
      </View>
    </PageContainer>
  )
}
