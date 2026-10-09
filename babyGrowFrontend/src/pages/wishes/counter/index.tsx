import { useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import PrimaryButton from '@/components/PrimaryButton'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import ProgressBar from '../components/ProgressBar'
import ExpertTipCard from '../components/ExpertTipCard'
import { findWish } from '../wishesData'
import babyAvatar from '@/assets/images/baby-journey-img.png'

export default function WishCounterDetailPage() {
  const router = useRouter()
  const wish = findWish(router.params.wish)

  const [current, setCurrent] = useState(wish?.counter?.current ?? 0)
  const [mode, setMode] = useState<'view' | 'edit'>(
    router.params.mode === 'edit' ? 'edit' : 'view',
  )

  if (!wish || !wish.counter) {
    return (
      <PageContainer header={<PageHeader showBack title="Wishes" />}>
        <EmptyState
          icon="star"
          title="找不到这个心愿"
          description="链接里的心愿可能已被删除。"
          actionText="回到心愿清单"
          onAction={() => navigateToRoute('wishes-list')}
        />
      </PageContainer>
    )
  }

  const { target, unit } = wish.counter
  const progress = target > 0 ? Math.min(current / target, 1) : 0

  const step = (delta: number) => {
    setCurrent((previous) => Math.min(Math.max(previous + delta, 0), target))
  }

  return (
    <PageContainer
      header={
        <PageHeader
          showBack
          title="Wishes"
          right={
            <View className="w-10 h-10 rounded-full border border-outline-variant overflow-hidden flex items-center justify-center">
              <Image src={babyAvatar} className="w-9 h-9 rounded-full" mode="aspectFill" />
            </View>
          }
        />
      }
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

          <Text className="text-3xl font-bold text-on-surface">{wish.title}</Text>
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
          <PrimaryButton
            block
            onClick={() => {
              Taro.showToast({ title: '已保存（本地）', icon: 'none' })
              setMode('view')
            }}
          >
            Save Changes
          </PrimaryButton>
        ) : null}
      </View>
    </PageContainer>
  )
}
