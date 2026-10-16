import { useEffect, useMemo, useRef, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image, Input, MovableArea, MovableView } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import PrimaryButton from '@/components/PrimaryButton'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import ProfileInfoCard from './components/ProfileInfoCard'
import PreferenceCard from './components/PreferenceCard'
import {
  useAppState,
  loadProfile,
  setProfileInfoValue,
  setProfilePreferences,
  commitProfile,
  restoreProfile,
} from '@/store'
import AsyncSection from '@/components/AsyncSection'
import type { ProfileState } from '@/store'
import {
  babyProfile,
  computeAgeLabel,
  newPreferenceIcon,
  todayIsoDate,
  type ProfileInfoItem,
  type ProfileInfoKey,
  type ProfilePreference,
} from '@/store/profile'

/**
 * 查看 / 编辑基础信息 / 偏好管理 共用一页。
 *
 * 设计稿里这三种状态是同一版式的不同表现（「基础信息 - 编辑」与「详情」内容完全一致），
 * 所以做成同一页的模式而不是三份实现；路由上仍保留三个 id，靠 query 进入对应模式。
 */
type ProfileMode = 'view' | 'edit' | 'preferences'

const isProfileMode = (value: string | undefined): value is ProfileMode =>
  value === 'view' || value === 'edit' || value === 'preferences'

/** 偏好卡片的间距，与 tailwind 的 gap-3 对齐；拖拽换位按实测行高计算 */
const PREFERENCE_GAP = 12

/**
 * 触摸事件里我们要的部分。
 *
 * Taro 给 MovableView 的 onTouchStart / onTouchEnd 标注的是宽泛的 BaseEventOrig，
 * 上面没有 touches / changedTouches，只能自己收一个最小形状出来。
 */
type TouchPoint = { clientY?: number }
type TouchLikeEvent = { touches?: TouchPoint[]; changedTouches?: TouchPoint[] }

export default function BabyProfilePage() {
  const router = useRouter()
  const [mode, setMode] = useState<ProfileMode>(
    isProfileMode(router.params.mode) ? router.params.mode : 'view',
  )

  // 画像来自 store：改动在离开页面后依然生效
  const { profile, status } = useAppState()
  const { name, birthday, info, preferences } = profile

  useEffect(() => {
    loadProfile()
  }, [])

  /** 进入编辑前存一份快照，Cancel 用它回滚 */
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileState | null>(null)

  /** 长按某一行后就只让那一行进入编辑，不必整页变成编辑态 */
  const [editingKey, setEditingKey] = useState<ProfileInfoKey | null>(null)

  /** 偏好草稿。带 id 表示在改已有的那条，不带则是新增 */
  const [draft, setDraft] = useState<{ id?: string; label: string; value: string } | null>(null)

  /** 拖拽换位需要真实像素，行高只能实测，rem 与 movable 的 y 单位对不上 */
  const [slotHeight, setSlotHeight] = useState(0)
  /** 按下时的屏幕 Y。松手时与它比较，判断用户到底有没有拖动 */
  const touchStartY = useRef<number | null>(null)

  const isEditing = mode !== 'view'
  const isManagingPreferences = mode === 'preferences'

  useEffect(() => {
    if (!isManagingPreferences) {
      setSlotHeight(0)
      return
    }

    const timer = setTimeout(() => {
      Taro.createSelectorQuery()
        .select('#preference-probe')
        .boundingClientRect((rect) => {
          const measured = rect as { height?: number } | null

          if (measured?.height) setSlotHeight(measured.height + PREFERENCE_GAP)
        })
        .exec()
    }, 60)

    return () => clearTimeout(timer)
  }, [isManagingPreferences])

  const ageLabel = useMemo(() => computeAgeLabel(birthday), [birthday])

  const selectInfoValue = (key: ProfileInfoKey, value: string) => {
    setProfileInfoValue(key, value)
    setEditingKey(null)

    // 长按单项修改这条路径上没有 Save 按钮，改完就得提交，否则改动只活在本页。
    // 整体编辑模式（有 Save Changes）则先留着，交给 save() 一次性提交。
    if (!isEditing) commitProfile()
  }

  const removePreference = (id: string) => {
    setProfilePreferences(preferences.filter((item) => item.id !== id))
  }

  const commitDraft = () => {
    const label = draft?.label.trim()
    const value = draft?.value.trim()

    if (!label) {
      Taro.showToast({ title: '请填写偏好名称', icon: 'none' })
      return
    }

    setProfilePreferences(
      draft?.id
        ? // 改已有的那条：只换 label / value，图标与排位保持不变
          preferences.map((item) =>
            item.id === draft.id ? { ...item, label, value: value ?? '' } : item,
          )
        : [
            ...preferences,
            { id: `custom-${Date.now()}`, icon: newPreferenceIcon, label, value: value ?? '' },
          ],
    )
    setDraft(null)
  }

  /**
   * 松手时结算顺序。
   *
   * 刻意不用 MovableView 的 `event.detail.y`：它的语义（是相对起点的偏移还是
   * 组件当前的绝对坐标）在不同平台上并不一致，实测在真机上只是点一下整行热区
   * 或铅笔，它也会带着一个非零值触发 onChange，于是「没拖也被重排」。
   *
   * 改为直接比较按下与松手时的屏幕 Y：位移不到半格就当作没拖过。
   * 点热区、点铅笔都会走到这里，但它们位移为 0，自然被挡掉。
   */
  const handleDrop = (fromIndex: number, startY: number | null, endY: number | null) => {
    if (!slotHeight || startY === null || endY === null) return

    const delta = endY - startY

    if (Math.abs(delta) < slotHeight / 2) return

    const target = Math.min(
      Math.max(fromIndex + Math.round(delta / slotHeight), 0),
      preferences.length - 1,
    )

    if (target === fromIndex) return

    const next = [...preferences]
    const [moved] = next.splice(fromIndex, 1)

    next.splice(target, 0, moved)
    setProfilePreferences(next)
  }

  /** 进入编辑或偏好管理前先存快照，Cancel 才有东西可回滚 */
  const beginEditing = (nextMode: ProfileMode) => {
    if (!profileSnapshot) setProfileSnapshot(profile)
    setMode(nextMode)
  }

  const save = () => {
    // 编辑期间的增删、换位、改名都只落在本地，到这里才提交一次
    commitProfile()
    Taro.showToast({ title: '已保存', icon: 'none' })
    setProfileSnapshot(null)
    setMode('view')
    setEditingKey(null)
  }

  const cancel = () => {
    if (profileSnapshot) restoreProfile(profileSnapshot)

    setProfileSnapshot(null)
    setEditingKey(null)
    setDraft(null)
    setMode('view')
  }

  /**
   * 一条偏好都没有时，「Add Preference」要直接出现在查看态。
   *
   * 原先它只在偏好管理态渲染，而进入管理态只能靠右上角的「Edit All」——
   * 于是「没有偏好」这个最需要「添加」的状态下，页面上反而没有任何添加入口。
   */
  const showAddPreference = isManagingPreferences || preferences.length === 0

  /** 空列表时没有「Edit All」可点，所以这里顺带把页面切进偏好管理态，编辑器才渲染得出来 */
  const startAddPreference = () => {
    if (!isManagingPreferences) beginEditing('preferences')
    setDraft({ label: '', value: '' })
  }

  const renderPreference = (preference: ProfilePreference, probe: boolean) => (
    <View id={probe ? 'preference-probe' : undefined}>
      <PreferenceCard
        preference={preference}
        editable={isManagingPreferences}
        onRemove={() => removePreference(preference.id)}
        onEdit={() =>
          setDraft({ id: preference.id, label: preference.label, value: preference.value })
        }
      />
    </View>
  )

  // 名字是档案顶层的字段，不在后端返回的 info 列表里，单独补一行。
  // 刻意复用同一种行卡片，好让它和 age / gender / constellation 的维护方式一致。
  const nameItem: ProfileInfoItem = {
    key: 'name',
    icon: 'profile-name',
    label: 'Name',
    value: name,
    circleClass: 'bg-secondary-fixed',
  }

  return (
    <PageContainer header={<PageHeader showBack title="宝宝画像" />}>
      <AsyncSection status={status.profile} onRetry={loadProfile} skeletonBlocks={4} skeletonHeight={96}>
        <View className="flex flex-col gap-4">
        <View className="flex flex-col items-center gap-3">
          {/* 编辑按钮叠在头像右下角。局部图标覆盖是项目允许用 absolute 的场景之一 */}
          <View className="relative w-28 h-28">
            <View className="w-28 h-28 rounded-full border-4 border-surface-container-lowest overflow-hidden bg-surface-container">
              <Image src={babyProfile.avatar} className="w-full h-full" mode="aspectFill" />
            </View>

            <View
              className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-primary border-4 border-surface flex items-center justify-center box-border"
              onClick={() => navigateToRoute('baby-profile-photo')}
            >
              <Icon name="edit" className="w-4 h-4" />
            </View>
          </View>

          {/* 名字直接读 store：改名保存后这里和导航栏会一起变 */}
          <Text className="text-2xl font-bold text-on-surface">{name}</Text>
        </View>

        <View className="flex flex-col gap-3">
          <ProfileInfoCard
            item={nameItem}
            editing={mode === 'edit' || editingKey === 'name'}
            onSelect={(value) => setProfileInfoValue('name', value)}
            onLongPress={() => setEditingKey('name')}
            onTextCommit={() => {
              setEditingKey(null)
              // 输入框失焦即提交；这条路径上没有 Save 按钮，不提交改动就丢了
              if (!isEditing) commitProfile()
            }}
          />

          {info.map((item) => (
            <ProfileInfoCard
              key={item.key}
              item={item.key === 'age' ? { ...item, value: ageLabel } : item}
              editing={mode === 'edit' || editingKey === item.key}
              birthday={birthday}
              maxDate={todayIsoDate()}
              onSelect={(value) => selectInfoValue(item.key, value)}
              onLongPress={() => setEditingKey(item.key)}
            />
          ))}

          {mode === 'view' && editingKey === null ? (
            <Text className="px-1 text-caption text-on-surface-variant">
              长按任意一项可单独修改
            </Text>
          ) : null}
        </View>

        <View className="flex flex-col gap-3">
          <View className="flex items-center justify-between px-1 pt-2">
            <Text className="text-xl font-semibold text-on-surface">Preferences</Text>
            {/* 一条偏好都没有时不显示 Edit All：那种状态下唯一该做的动作是「添加」，
                而「进入管理态」本身没有可管理的东西。有偏好时才需要它来做排序/编辑/删除。 */}
            {preferences.length > 0 ? (
              <Text
                className="text-sm font-semibold text-on-surface-variant"
                onClick={() => (isManagingPreferences ? cancel() : beginEditing('preferences'))}
              >
                {isManagingPreferences ? 'Done' : 'Edit All'}
              </Text>
            ) : null}
          </View>

          {isManagingPreferences && slotHeight > 0 ? (
            <MovableArea
              className="relative w-full"
              style={{ height: `${preferences.length * slotHeight}px` }}
            >
              {preferences.map((preference, index) => (
                <MovableView
                  key={preference.id}
                  direction="vertical"
                  y={index * slotHeight}
                  className="absolute left-0 w-full"
                  style={{ height: `${slotHeight}px` }}
                  onTouchStart={(event) => {
                    touchStartY.current =
                      (event as unknown as TouchLikeEvent).touches?.[0]?.clientY ?? null
                  }}
                  onTouchEnd={(event) => {
                    const startY = touchStartY.current
                    const endY =
                      (event as unknown as TouchLikeEvent).changedTouches?.[0]?.clientY ?? null

                    touchStartY.current = null
                    handleDrop(index, startY, endY)
                  }}
                >
                  <View className="pb-3">{renderPreference(preference, false)}</View>
                </MovableView>
              ))}
            </MovableArea>
          ) : (
            <View className="flex flex-col gap-3">
              {preferences.map((preference, index) => (
                <View key={preference.id}>
                  {renderPreference(preference, isManagingPreferences && index === 0)}
                </View>
              ))}
            </View>
          )}

          {showAddPreference ? (
            draft ? (
              <View className="w-full box-border p-4 rounded-3xl border border-outline-variant flex flex-col gap-3">
                {/* 输入框给足高度，否则 hint 文字会被上下裁掉 */}
                <Input
                  className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                  placeholder="偏好名称，如 Bath Time"
                  placeholderClass="text-on-surface-variant"
                  value={draft.label}
                  onInput={(event) =>
                    // 带上 previous?.id，否则改到一半 draft 就丢了 id，
                    // 一次「编辑」会退化成「新增」
                    setDraft((previous) => ({
                      id: previous?.id,
                      label: event.detail.value,
                      value: previous?.value ?? '',
                    }))
                  }
                />
                <Input
                  className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                  placeholder="补充说明，可留空"
                  placeholderClass="text-on-surface-variant"
                  value={draft.value}
                  onInput={(event) =>
                    setDraft((previous) => ({
                      id: previous?.id,
                      label: previous?.label ?? '',
                      value: event.detail.value,
                    }))
                  }
                />

                {/* 保存 / 取消做成两个真按钮，而不是两个文字链接。
                    取消用 bg-surface-container-high 与页面底色区分开——它此前完全没有
                    背景色，和页面一样，看上去不像一个可点的操作。 */}
                <View className="flex items-center gap-3">
                  <View
                    className="flex-1 py-3 rounded-full bg-surface-container-high flex items-center justify-center"
                    onClick={() => setDraft(null)}
                  >
                    <Text className="text-base font-semibold text-on-surface">取消</Text>
                  </View>

                  <View
                    className="flex-1 py-3 rounded-full bg-tertiary flex items-center justify-center"
                    onClick={commitDraft}
                  >
                    <Text className="text-base font-semibold text-[#ffffff]">
                      {draft.id ? '保存' : '添加'}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View
                className="w-full box-border py-4 rounded-full border border-dashed border-outline flex items-center justify-center gap-2"
                onClick={startAddPreference}
              >
                <Icon name="add-circle" className="w-5 h-5" />
                <Text className="text-base font-semibold text-on-surface-variant">
                  Add Preference
                </Text>
              </View>
            )
          ) : null}
        </View>

        {isEditing ? (
          <View className="flex flex-col gap-3 pt-2">
            <PrimaryButton block onClick={save}>
              Save Changes
            </PrimaryButton>

            {/* 取消要与页面底色区分开。此前它没有任何背景色、和页面一样，
                看上去不像一个可点的操作（也是用户反馈的问题）。 */}
            <View
              className="py-3 rounded-full bg-surface-container-high flex items-center justify-center"
              onClick={cancel}
            >
              <Text className="text-base font-semibold text-on-surface">Cancel</Text>
            </View>
          </View>
        ) : null}
        </View>
      </AsyncSection>
    </PageContainer>
  )
}
