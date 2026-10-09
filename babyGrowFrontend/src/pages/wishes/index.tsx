import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import BottomTabBar from '@/components/BottomTabBar'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import RecordSheet from '@/components/RecordSheet'
import Icon from '@/components/Icon'
import { handleBottomTabNavigation } from '@/utils/analysisNavigation'
import { useAppState, loadWishes, removeWish, addWish } from '@/store'
import babyAvatar from '@/assets/images/baby-journey-img.png'
import WishCard from './components/WishCard'
import { wishesEmptyCopy, type Wish, type WishKind } from '@/store/wishes'

export default function WishesListPage() {
  // 心愿来自 store：删掉、新建之后离开页面再回来依然保留
  const { wishes, status } = useAppState()
  const [recordOpen, setRecordOpen] = useState(false)
  /** 新建心愿的草稿。为 null 时表单不显示 */
  const [draft, setDraft] = useState<{ title: string; description: string; goal: string; kind: WishKind } | null>(
    null,
  )

  useEffect(() => {
    loadWishes()
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

    removeWish(wish.id)
  }

  const commitDraft = () => {
    const title = draft?.title.trim()

    if (!title) {
      Taro.showToast({ title: '请填写心愿名称', icon: 'none' })
      return
    }

    const goal = Math.max(Number(draft?.goal) || 1, 1)
    const isCounter = draft?.kind === 'counter'
    const id = `wish-${Date.now()}`

    addWish({
      id,
      icon: 'star',
      circleClass: 'bg-wish-swim',
      title,
      description: draft?.description.trim() || '新的成长目标',
      detailSubtitle: draft?.description.trim() || '新的成长目标',
      goal,
      unitLabel: isCounter ? 'Times' : 'Steps',
      checklistTitle: isCounter ? undefined : `${title} Checklist`,
      // 新心愿的去向由自己生成，指向带自己 id 的详情页
      path: isCounter
        ? `/pages/wishes/counter/index?wish=${id}`
        : `/pages/wishes/detail/index?wish=${id}`,
      kind: isCounter ? 'counter' : 'checklist',
      checklist: isCounter ? undefined : [],
      counter: isCounter ? { current: 0, target: goal, unit: 'Times' } : undefined,
    })
    setDraft(null)
    Taro.showToast({ title: '已新建', icon: 'none' })
  }

  return (
    <PageContainer
      bottomBar={<BottomTabBar activeKey="wishes" onTabChange={handleBottomTabNavigation} />}
      header={<PageHeader title="Wishes" profile={{ avatar: babyAvatar, ageLabel: '6M' }} />}
    >
      <View className="flex flex-col gap-4">
        <AsyncSection status={status.wishes} onRetry={loadWishes} skeletonBlocks={3} skeletonHeight={180}>
          {wishes.length > 0 ? (
            <View className="flex flex-col gap-4">
              {wishes.map((wish) => (
                <WishCard
                  key={wish.id}
                  wish={wish}
                  onClick={() => Taro.navigateTo({ url: wish.path })}
                  onRemove={() => confirmRemove(wish)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="star"
              title={wishesEmptyCopy.title}
              description={wishesEmptyCopy.description}
              actionText="去记录一条"
              onAction={() => setRecordOpen(true)}
            />
          )}

          {/* 新建入口。此前心愿只能看和删、不能建 */}
          {draft ? (
            <View className="w-full box-border p-4 rounded-3xl border border-outline-variant flex flex-col gap-3">
              <Input
                className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                placeholder="心愿名称，如 学会游泳"
                placeholderClass="text-on-surface-variant"
                value={draft.title}
                onInput={(event) => setDraft((p) => (p ? { ...p, title: event.detail.value } : p))}
              />

              <Input
                className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                placeholder="一句话说明，可留空"
                placeholderClass="text-on-surface-variant"
                value={draft.description}
                onInput={(event) => setDraft((p) => (p ? { ...p, description: event.detail.value } : p))}
              />

              <Input
                className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                type="number"
                placeholder="目标数量，如 4"
                placeholderClass="text-on-surface-variant"
                value={draft.goal}
                onInput={(event) => setDraft((p) => (p ? { ...p, goal: event.detail.value } : p))}
              />

              <View className="flex items-center gap-2">
                {(['checklist', 'counter'] as WishKind[]).map((kind) => (
                  <View
                    key={kind}
                    className={`py-2 px-4 rounded-full border ${
                      draft.kind === kind
                        ? 'bg-tertiary-fixed border-on-tertiary-container'
                        : 'bg-surface-container border-transparent'
                    }`}
                    onClick={() => setDraft((p) => (p ? { ...p, kind } : p))}
                  >
                    <Text className="text-sm font-semibold text-on-surface">
                      {kind === 'checklist' ? '清单式（逐项勾选）' : '计数式（按次累加）'}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex items-center justify-end gap-4">
                <Text
                  className="text-base font-semibold text-on-surface-variant"
                  onClick={() => setDraft(null)}
                >
                  取消
                </Text>
                <Text className="text-base font-semibold text-tertiary" onClick={commitDraft}>
                  新建
                </Text>
              </View>
            </View>
          ) : (
            <View
              className="w-full box-border py-4 rounded-full border border-dashed border-outline flex items-center justify-center gap-2"
              onClick={() => setDraft({ title: '', description: '', goal: '4', kind: 'checklist' })}
            >
              <Icon name="add-circle" className="w-5 h-5" />
              <Text className="text-base font-semibold text-on-surface-variant">New Wish</Text>
            </View>
          )}
        </AsyncSection>
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
