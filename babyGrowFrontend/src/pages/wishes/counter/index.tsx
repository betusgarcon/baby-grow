import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import PrimaryButton from '@/components/PrimaryButton'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import ProgressBar from '../components/ProgressBar'
import ExpertTipCard from '../components/ExpertTipCard'
import { useAppState, setWishCounter, loadWishes } from '@/store'

export default function WishCounterDetailPage() {
  const router = useRouter()
  // 心愿来自 store：加减之后离开页面再回来依然是加减后的数字
  const { wishes, status } = useAppState()
  const wish = wishes.find((item) => item.id === router.params.wish)

  useEffect(() => {
    loadWishes()
  }, [])

  const [mode, setMode] = useState<'view' | 'edit'>(
    router.params.mode === 'edit' ? 'edit' : 'view',
  )
  /** 上次保存的值，Cancel 用它还原 */
  const [savedCurrent, setSavedCurrent] = useState<number | null>(null)

  if (!wish || !wish.counter) {
    return (
      <PageContainer header={<PageHeader showBack title="Wishes" />}>
        {/* 可能还在加载、可能加载失败、也可能真的不存在 */}
        <AsyncSection status={status.wishes} onRetry={loadWishes}>
          <EmptyState
            icon="star"
            title="找不到这个心愿"
            description="链接里的心愿可能已被删除。"
            actionText="回到心愿清单"
            onAction={() => navigateToRoute('wishes-list')}
          />
        </AsyncSection>
      </PageContainer>
    )
  }

  const { current, target, unit } = wish.counter
  const progress = target > 0 ? Math.min(current / target, 1) : 0

  const writeCurrent = (next: number) => setWishCounter(wish.id, next)

  const step = (delta: number) => {
    // 加减号只是暂存改动，必须先进编辑态把保存/取消露出来，
    // 否则点一下就直接生效，用户没有确认的机会
    if (mode !== 'edit') {
      setSavedCurrent(current)
      setMode('edit')
    }

    writeCurrent(Math.min(Math.max(current + delta, 0), target))
  }

  const cancelEdit = () => {
    if (savedCurrent !== null) writeCurrent(savedCurrent)

    setSavedCurrent(null)
    setMode('view')
  }

  const saveEdit = () => {
    // 改动已随每次加减写进 store，这里只需要退出编辑态
    Taro.showToast({ title: '已保存', icon: 'none' })
    setSavedCurrent(null)
    setMode('view')
  }

  return (
    <PageContainer
      header={<PageHeader showBack title="Wishes" />}
    >
      <View className="flex flex-col gap-6">
        {/* 设计稿这里是书架照片，没有可用资源，用同色系浅底占位 */}
        <View
          className="relative w-full h-52 rounded-3xl overflow-hidden flex flex-col justify-end p-6 gap-2"
          style={{ backgroundImage: 'linear-gradient(160deg, #faf2ea 0%, #e8e1d9 100%)' }}
        >
          {wish.badge ? (
            <View className="self-start py-1 px-3 rounded-full bg-secondary-container">
              <Text className="text-caption font-bold text-on-secondary-container">{wish.badge}</Text>
            </View>
          ) : null}

          <Text className="text-2xl font-bold text-on-surface">{wish.title}</Text>
        </View>

        <View className="w-full box-border p-6 rounded-xl bg-surface-container-lowest shadow-card-soft flex flex-col gap-4">
          <Text className="text-base text-on-surface-variant">Reading Progress</Text>

          <View className="flex items-end justify-between">
            <View className="flex items-end gap-1">
              <Text className="text-4xl font-bold text-primary">{current}</Text>
              <Text className="text-lg text-on-surface-variant">/{target}</Text>
            </View>

            <Text className="text-base font-semibold text-secondary">
              {Math.round(progress * 100)}% Completed
            </Text>
          </View>

          <ProgressBar value={progress} barClassName="bg-wish-active" />

          <View className="flex items-center justify-between pt-2">
            <View
              className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center"
              onClick={() => step(-1)}
            >
              <Icon name="minus-circle" className="w-6 h-6" />
            </View>

            <View className="flex flex-col items-center gap-1">
              <Text
                className="text-caption text-on-surface-variant"
                style={{ letterSpacing: '0.1em' }}
              >
                QUICK ADD
              </Text>

              <View
                className="py-3 px-6 rounded-full bg-wish-active"
                onClick={() => step(1)}
              >
                <Text className="text-base font-semibold text-[#ffffff]">
                  +1 {unit}
                </Text>
              </View>
            </View>

            <View
              className="w-14 h-14 rounded-full bg-tertiary-fixed flex items-center justify-center"
              onClick={() => step(1)}
            >
              <Icon name="add-circle" className="w-6 h-6" />
            </View>
          </View>
        </View>

        {wish.expertTip ? <ExpertTipCard tip={wish.expertTip} /> : null}

        {mode === 'edit' ? (
          <>
            <PrimaryButton block onClick={saveEdit}>
              Save Changes
            </PrimaryButton>

            <View className="py-3 flex items-center justify-center" onClick={cancelEdit}>
              <Text className="text-base font-semibold text-on-surface-variant">Cancel</Text>
            </View>
          </>
        ) : null}
      </View>
    </PageContainer>
  )
}
