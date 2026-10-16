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
import { wishesEmptyCopy, type Wish, type WishKind } from '@/store/wishes'

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
      title: `删除「${wish.title}」？`,
      content: '删除后这个心愿及其进度会一并移除。',
      confirmText: '删除',
      confirmColor: '#ba1a1a',
      cancelText: '取消',
    })

    if (!result.confirm) return

    removeWish(wish.id)
  }

  const commitDraft = async () => {
    // 连点保护：第一次点击之后到请求返回之前，不再受理第二次
    if (saving) return

    const title = draft?.title.trim()

    if (!title) {
      Taro.showToast({ title: '请填写心愿名称', icon: 'none' })
      return
    }

    setSaving(true)

    try {
      const isCounter = draft?.kind === 'counter'
      // 目标次数只对计数式有意义。清单式的目标数由后端按清单实际条数派生，
      // 这里传什么都不作数——否则界面上会出现「填 4 但只有 2 条」这种对不上的显示
      const goal = Math.max(Number(draft?.goal) || 1, 1)
      const description = draft?.description.trim() || '新的成长目标'
      const id = `wish-${Date.now()}`

      await addWish({
        id,
        icon: 'star',
        circleClass: 'bg-wish-swim',
        title,
        description,
        detailSubtitle: description,
        goal: isCounter ? goal : 0,
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
    } catch (error) {
      console.error('[wishes] 新建心愿失败', error)
      Taro.showToast({ title: '新建失败，请稍后再试', icon: 'none' })
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
          title="Wishes"
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
              title={wishesEmptyCopy.title}
              description={wishesEmptyCopy.description}
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

              <View className="flex flex-col gap-1">
                <Textarea
                  className="w-full box-border h-24 p-4 rounded-3xl bg-surface-container text-base text-on-surface"
                  placeholder="详细描述这个心愿：想达到什么、打算怎么开始"
                  placeholderClass="text-on-surface-variant"
                  maxlength={300}
                  value={draft.description}
                  onInput={(event) =>
                    setDraft((p) => (p ? { ...p, description: event.detail.value } : p))
                  }
                />
                <Text className="px-1 text-caption text-on-surface-variant">
                  写得具体些。这段描述会用作生成头图的提示词
                </Text>
              </View>

              {draft.kind === 'counter' ? (
                <View className="flex flex-col gap-1">
                  <Input
                    className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                    type="number"
                    placeholder="目标次数，如 100"
                    placeholderClass="text-on-surface-variant"
                    value={draft.goal}
                    onInput={(event) =>
                      setDraft((p) => (p ? { ...p, goal: event.detail.value } : p))
                    }
                  />
                  <Text className="px-1 text-caption text-on-surface-variant">
                    这个心愿一共要完成几次，进度按「已完成 / 目标次数」显示
                  </Text>
                </View>
              ) : (
                <Text className="px-1 text-caption text-on-surface-variant">
                  清单式的进度按清单实际条数算，不用另填目标数
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
    </PageContainer>
  )
}
