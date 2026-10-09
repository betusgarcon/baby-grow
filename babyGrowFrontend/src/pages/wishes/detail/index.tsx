import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Input, MovableArea, MovableView } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import { moveItem, useReorderSlot } from '@/hooks/useReorderSlot'
import ProgressBar from '../components/ProgressBar'
import ChecklistItem from '../components/ChecklistItem'
import ExpertTipCard from '../components/ExpertTipCard'
import { useAppState, setWishChecklist, loadWishes } from '@/store'
import type { WishChecklistItem } from '@/store/wishes'

/** 拖拽落点按「行高 + 间距」推进，间距要与下面的 gap-3 对齐 */
const ITEM_GAP = 12

export default function WishChecklistDetailPage() {
  const router = useRouter()
  // 心愿来自 store：勾选、增删、排序离开页面后依然生效
  const { wishes, status } = useAppState()
  const wish = wishes.find((item) => item.id === router.params.wish)
  const items = wish?.checklist ?? []

  useEffect(() => {
    loadWishes()
  }, [])

  const [mode, setMode] = useState<'view' | 'edit'>(
    router.params.mode === 'edit' ? 'edit' : 'view',
  )
  const [draft, setDraft] = useState<{ title: string; note: string } | null>(null)
  /**
   * 两种状态要分开：
   * - dirty 表示「有未保存的改动」，决定底部是否出现保存/取消；
   * - mode === 'edit' 表示「在管理清单」，决定删除按钮、拖拽与新增是否出现。
   * 勾选只算改动、不算管理，所以只置 dirty——否则勾一下就挂上拖拽容器，
   * 既出现不该出现的删除按钮，也会因为重新布局而卡顿。
   */
  const [dirty, setDirty] = useState(false)
  /** 进入改动前的快照，Cancel 用它还原 */
  const [snapshot, setSnapshot] = useState<WishChecklistItem[] | null>(null)

  const isManaging = mode === 'edit'

  /** 所有清单改动都经过这里写回 store */
  const writeItems = (next: WishChecklistItem[]) => {
    if (wish) setWishChecklist(wish.id, next)
  }

  const { slotHeight, onDragChange, resolveTarget } = useReorderSlot(
    items.length,
    'checklist-probe',
    ITEM_GAP,
    isManaging,
  )

  // hooks 必须先于任何提前 return 调用，所以「找不到心愿」的判断放在这之后
  if (!wish) {
    return (
      <PageContainer header={<PageHeader showBack title="Wishes" />}>
        {/* 可能还在加载、可能加载失败、也可能真的不存在，交给 AsyncSection 区分 */}
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

  const doneCount = items.filter((item) => item.done).length
  const progress = wish.goal > 0 ? Math.min(doneCount / wish.goal, 1) : 0

  const beginChange = () => {
    // 第一次改动时留快照，之后的改动共用这一份
    if (!dirty) setSnapshot(items)
    setDirty(true)
  }

  const enterEdit = () => {
    beginChange()
    setMode('edit')
  }

  const cancelEdit = () => {
    if (snapshot) writeItems(snapshot)
    setSnapshot(null)
    setDraft(null)
    setDirty(false)
    setMode('view')
  }

  const saveEdit = () => {
    // 改动已随每次操作写进 store，这里只需要退出编辑态
    Taro.showToast({ title: '已保存', icon: 'none' })
    setSnapshot(null)
    setDraft(null)
    setDirty(false)
    setMode('view')
  }

  const toggleItem = (id: string) => {
    beginChange()

    writeItems(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))
  }

  const removeItem = (id: string) => {
    writeItems(items.filter((item) => item.id !== id))
  }

  const commitDraft = () => {
    const title = draft?.title.trim()

    if (!title) {
      Taro.showToast({ title: '请填写名称', icon: 'none' })
      return
    }

    writeItems([
      ...items,
      { id: `custom-${Date.now()}`, title, note: draft?.note.trim() ?? '', done: false },
    ])
    setDraft(null)
  }

  const handleDrop = (fromIndex: number) => () => {
    const target = resolveTarget(fromIndex)

    if (target === null) return

    writeItems(moveItem(items, fromIndex, target))
  }

  const renderItem = (item: WishChecklistItem, probe: boolean) => (
    <View id={probe ? 'checklist-probe' : undefined}>
      <ChecklistItem
        item={item}
        editing={isManaging}
        onToggle={() => toggleItem(item.id)}
        onRemove={() => removeItem(item.id)}
      />
    </View>
  )

  return (
    <PageContainer
      header={<PageHeader showBack title="Wishes" />}
    >
      <View className="flex flex-col gap-6">
        {/* 设计稿这里是插图，没有可用资源，用同色系浅底占位并把标题叠在下沿 */}
        <View
          className="relative w-full h-56 rounded-3xl overflow-hidden flex flex-col justify-end p-6 gap-2"
          style={{ backgroundImage: 'linear-gradient(160deg, #faf2ea 0%, #e8e1d9 100%)' }}
        >
          {wish.badge ? (
            <View className="self-start py-1 px-3 rounded-full bg-secondary-container">
              <Text className="text-caption font-bold text-on-secondary-container">{wish.badge}</Text>
            </View>
          ) : null}

          <Text className="text-2xl font-bold text-on-surface">{wish.title}</Text>
          <Text className="text-base text-on-surface-variant">{wish.detailSubtitle}</Text>
        </View>

        <View className="flex flex-col gap-2">
          <Text
            className="text-caption font-bold text-on-surface-variant"
            style={{ letterSpacing: '0.08em' }}
          >
            CURRENT PROGRESS
          </Text>

          <View className="flex items-end gap-2">
            <Text className="text-2xl font-bold text-on-surface">
              {Math.round(progress * 100)}% Completed
            </Text>
            <Text className="text-caption text-on-surface-variant">
              ({doneCount} of {wish.goal})
            </Text>
          </View>

          <ProgressBar value={progress} barClassName="bg-wish-active" />
        </View>

        <View className="flex flex-col gap-3">
          <View className="flex items-center justify-between">
            <Text className="text-2xl font-bold text-on-surface">{wish.checklistTitle}</Text>

            <View
              className="py-2 px-4 rounded-full bg-tertiary-fixed flex items-center gap-2"
              onClick={() => (isManaging ? saveEdit() : enterEdit())}
            >
              <Icon name="edit-muted" className="w-3.5 h-3.5" />
              <Text className="text-sm font-semibold text-on-tertiary-container">
                {isManaging ? 'Done' : 'Edit List'}
              </Text>
            </View>
          </View>

          {isManaging && slotHeight > 0 ? (
            <MovableArea
              className="relative w-full"
              style={{ height: `${items.length * slotHeight}px` }}
            >
              {items.map((item, index) => (
                <MovableView
                  key={item.id}
                  direction="vertical"
                  y={index * slotHeight}
                  className="absolute left-0 w-full"
                  style={{ height: `${slotHeight}px` }}
                  onChange={(event) => onDragChange(event.detail.y)}
                  onTouchEnd={handleDrop(index)}
                >
                  <View className="pb-3">{renderItem(item, false)}</View>
                </MovableView>
              ))}
            </MovableArea>
          ) : (
            <View className="flex flex-col gap-3">
              {items.map((item, index) => (
                <View key={item.id}>{renderItem(item, isManaging && index === 0)}</View>
              ))}
            </View>
          )}

          {isManaging ? (
            <>
              {draft ? (
                <View className="w-full box-border p-4 rounded-3xl border border-outline-variant flex flex-col gap-3">
                  {/* 输入框给足高度，否则 hint 文字会被上下裁掉 */}
                  <Input
                    className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                    placeholder="名称，如 City Aquarium"
                    placeholderClass="text-on-surface-variant"
                    value={draft.title}
                    onInput={(event) =>
                      setDraft((previous) => ({
                        title: event.detail.value,
                        note: previous?.note ?? '',
                      }))
                    }
                  />
                  <Input
                    className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                    placeholder="补充说明，可留空"
                    placeholderClass="text-on-surface-variant"
                    value={draft.note}
                    onInput={(event) =>
                      setDraft((previous) => ({
                        title: previous?.title ?? '',
                        note: event.detail.value,
                      }))
                    }
                  />

                  <View className="flex items-center justify-end gap-4">
                    <Text
                      className="text-base font-semibold text-on-surface-variant"
                      onClick={() => setDraft(null)}
                    >
                      取消
                    </Text>
                    <Text className="text-base font-semibold text-tertiary" onClick={commitDraft}>
                      添加
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  className="w-full box-border py-3 rounded-full border border-dashed border-outline flex items-center justify-center gap-2"
                  onClick={() => setDraft({ title: '', note: '' })}
                >
                  <Icon name="add-circle" className="w-5 h-5" />
                  <Text className="text-base font-semibold text-on-surface-variant">Add</Text>
                </View>
              )}

              <Text className="px-1 text-caption text-on-surface-variant">
                Drag items to change their priority in your wish list.
              </Text>
            </>
          ) : null}
        </View>

        {/* 只要有未保存的改动就给出二次确认——勾选、增删、拖拽排序都算 */}
        {dirty ? (
          <View className="flex items-center gap-3">
            <View
              className="flex-1 py-3 rounded-full bg-tertiary-fixed flex items-center justify-center"
              onClick={cancelEdit}
            >
              <Text className="text-base font-semibold text-on-tertiary-container">Cancel</Text>
            </View>

            <View
              className="flex-1 py-3 rounded-full bg-primary flex items-center justify-center"
              onClick={saveEdit}
            >
              <Text className="text-base font-semibold text-[#ffffff]">Done</Text>
            </View>
          </View>
        ) : null}

        {wish.expertTip ? <ExpertTipCard tip={wish.expertTip} /> : null}
      </View>
    </PageContainer>
  )
}
