import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Textarea } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import BottomTabBar from '@/components/BottomTabBar'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { handleBottomTabNavigation } from '@/utils/analysisNavigation'
import { useAppState, loadWishes, removeWish, addWish } from '@/store'
import WishCard from './components/WishCard'
import { t } from '@/i18n'
import type { Wish, WishKind } from '@/store/wishes'

export default function WishesListPage() {
  // 心愿来自 store：删掉、新建之后离开页面再回来依然保留
  const { wishes, status, babyHeader } = useAppState()
  /** 新建心愿的草稿。为 null 时表单不显示 */
  const [draft, setDraft] = useState<{ title: string; description: string; goal: string; kind: WishKind } | null>(
    null,
  )
  /**
   * 新建请求是否在飞行中。
   *
   * 没有它的话，「新建」这个 Text 在整个 await 期间一直可点，而每次调用都会生成
   * 一个新的 `wish-${Date.now()}` —— 两次点击只要不在同一毫秒，就会建出两条心愿。
   * 与 RecordSheet 的 saving 是同一个模式。
   */
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadWishes()
  }, [])

  const confirmRemove = async (wish: Wish) => {
    const result = await Taro.showModal({
      title: t('wishes.deleteTitle', { title: wish.title }),
      content: t('wishes.deleteDesc'),
      confirmText: t('common.delete'),
      confirmColor: '#ba1a1a',
      cancelText: t('common.cancel'),
    })

    if (!result.confirm) return

    removeWish(wish.id)
  }

  const commitDraft = async () => {
    // 连点保护：第一次点击之后到请求返回之前，不再受理第二次
    if (saving) return

    const title = draft?.title.trim()

    if (!title) {
      Taro.showToast({ title: t('wishes.nameRequired'), icon: 'none' })
      return
    }

    setSaving(true)

    try {
      const isCounter = draft?.kind === 'counter'
      // 目标次数只对计数式有意义。清单式的目标数由后端按清单实际条数派生，
      // 这里传什么都不作数——否则界面上会出现「填 4 但只有 2 条」这种对不上的显示
      const goal = Math.max(Number(draft?.goal) || 1, 1)
      const description = draft?.description.trim() || t('wishes.defaultGoal')
      const id = `wish-${Date.now()}`

      await addWish({
        id,
        icon: 'star',
        circleClass: 'bg-wish-swim',
        title,
        description,
        detailSubtitle: description,
        goal: isCounter ? goal : 0,
        unitLabel: isCounter ? t('wishes.unitTimes') : t('wishes.unitSteps'),
        checklistTitle: isCounter ? undefined : `${title} Checklist`,
        // 新心愿的去向由自己生成，指向带自己 id 的详情页
        path: isCounter
          ? `/pages/wishes/counter/index?wish=${id}`
          : `/pages/wishes/detail/index?wish=${id}`,
        kind: isCounter ? 'counter' : 'checklist',
        checklist: isCounter ? undefined : [],
        counter: isCounter ? { current: 0, target: goal, unit: t('wishes.unitTimes') } : undefined,
      })
      setDraft(null)
      Taro.showToast({ title: t('wishes.created'), icon: 'none' })
    } catch (error) {
      console.error('[wishes] 新建心愿失败', error)
      Taro.showToast({ title: t('wishes.createFailed'), icon: 'none' })
    } finally {
      // 成败都要放开，否则一次失败会让按钮永久失效
      setSaving(false)
    }
  }

  return (
    <PageContainer
      bottomBar={<BottomTabBar activeKey="wishes" onTabChange={handleBottomTabNavigation} />}
      header={
        <PageHeader
          title={t('wishes.title')}
          profile={{ avatar: babyHeader.avatar, ageLabel: babyHeader.ageLabel }}
        />
      }
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
              title={t('wishes.empty')}
              description={t('wishes.emptyDesc')}
            />
          )}

          {/* 新建入口。此前心愿只能看和删、不能建 */}
          {draft ? (
            <View className="w-full box-border p-4 rounded-3xl border border-outline-variant flex flex-col gap-3">
              <Input
                className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                placeholder={t('wishes.namePlaceholder')}
                placeholderClass="text-on-surface-variant"
                value={draft.title}
                onInput={(event) => setDraft((p) => (p ? { ...p, title: event.detail.value } : p))}
              />

              <View className="flex flex-col gap-1">
                <Textarea
                  className="w-full box-border h-24 p-4 rounded-3xl bg-surface-container text-base text-on-surface"
                  placeholder={t('wishes.descPlaceholder')}
                  placeholderClass="text-on-surface-variant"
                  maxlength={300}
                  value={draft.description}
                  onInput={(event) =>
                    setDraft((p) => (p ? { ...p, description: event.detail.value } : p))
                  }
                />
                <Text className="px-1 text-caption text-on-surface-variant">
                  {t('wishes.descHint')}
                </Text>
              </View>

              {draft.kind === 'counter' ? (
                <View className="flex flex-col gap-1">
                  <Input
                    className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                    type="number"
                    placeholder={t('wishes.goalPlaceholder')}
                    placeholderClass="text-on-surface-variant"
                    value={draft.goal}
                    onInput={(event) =>
                      setDraft((p) => (p ? { ...p, goal: event.detail.value } : p))
                    }
                  />
                  <Text className="px-1 text-caption text-on-surface-variant">
                    {t('wishes.goalHint')}
                  </Text>
                </View>
              ) : (
                <Text className="px-1 text-caption text-on-surface-variant">
                  {t('wishes.checklistGoalHint')}
                </Text>
              )}

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
                      {kind === 'checklist' ? t('wishes.kindChecklist') : t('wishes.kindCounter')}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex items-center justify-end gap-4">
                <Text
                  className="text-base font-semibold text-on-surface-variant"
                  onClick={() => setDraft(null)}
                >
                  {t('common.cancel')}
                </Text>
                <Text className="text-base font-semibold text-tertiary" onClick={commitDraft}>
                  {t('common.create')}
                </Text>
              </View>
            </View>
          ) : (
            <View
              className="w-full box-border py-4 rounded-full border border-dashed border-outline flex items-center justify-center gap-2"
              onClick={() => setDraft({ title: '', description: '', goal: '4', kind: 'checklist' })}
            >
              <Icon name="add-circle" className="w-5 h-5" />
              <Text className="text-base font-semibold text-on-surface-variant">{t('wishes.new')}</Text>
            </View>
          )}
        </AsyncSection>
      </View>
    </PageContainer>
  )
}
