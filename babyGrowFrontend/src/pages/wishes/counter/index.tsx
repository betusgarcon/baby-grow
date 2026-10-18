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
import WishHero from '../components/WishHero'
import { useAppState, setWishCounter, commitWishCounter, loadWishes, regenerateWishCover } from '@/store'
import { t } from '@/i18n'

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
      <PageContainer header={<PageHeader showBack title={t('wishes.title')} />}>
        {/* 可能还在加载、可能加载失败、也可能真的不存在 */}
        <AsyncSection status={status.wishes} onRetry={loadWishes}>
          <EmptyState
            icon="star"
            title={t('wishes.notFound')}
            description={t('wishes.notFoundDesc')}
            actionText={t('wishes.backToList')}
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
    // 加减号期间只写进了本地，到这里才提交一次——连点十下也只有一个请求
    commitWishCounter(wish.id)
    Taro.showToast({ title: t('common.saved'), icon: 'none' })
    setSavedCurrent(null)
    setMode('view')
  }

  const retryCover = () => {
    regenerateWishCover(wish.id).catch((error) => {
      console.error('[wish] 重新生成头图失败', error)
      Taro.showToast({ title: t('wishes.coverFailed'), icon: 'none' })
    })
  }

  return (
    <PageContainer
      header={<PageHeader showBack title={t('wishes.title')} />}
    >
      <View className="flex flex-col gap-6">
        {/* 与详情页共用同一个头图组件；这里原本也有一份逐字重复的渐变占位 */}
        <WishHero wish={wish} onRetryCover={retryCover} />

        <View className="w-full box-border p-6 rounded-xl bg-surface-container-lowest shadow-card-soft flex flex-col gap-4">
          <Text className="text-base text-on-surface-variant">{t('wishes.readingProgress')}</Text>

          <View className="flex items-end justify-between">
            <View className="flex items-end gap-1">
              <Text className="text-[2.5rem] leading-none font-semibold font-numeric tabular-nums text-primary">{current}</Text>
              <Text className="text-lg text-on-surface-variant">/{target}</Text>
            </View>

            <Text className="text-card-title text-secondary">
              {t('wishes.completedPercent', { percent: Math.round(progress * 100) })}
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
                {t('wishes.quickAdd')}
              </Text>

              <View
                className="py-3 px-6 rounded-full bg-wish-active"
                onClick={() => step(1)}
              >
                <Text className="text-card-title text-[#ffffff]">
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
              {t('common.saveChanges')}
            </PrimaryButton>

            <View className="py-3 flex items-center justify-center" onClick={cancelEdit}>
              <Text className="text-label font-medium text-on-surface-variant">{t('common.cancel')}</Text>
            </View>
          </>
        ) : null}
      </View>
    </PageContainer>
  )
}
