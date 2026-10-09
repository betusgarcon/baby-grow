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
import { useAppState, setProfileInfoValue, setProfilePreferences, restoreProfile } from '@/store'
import type { ProfileState } from '@/store'
import {
  babyProfile,
  computeAgeLabel,
  newPreferenceIcon,
  todayIsoDate,
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

export default function BabyProfilePage() {
  const router = useRouter()
  const [mode, setMode] = useState<ProfileMode>(
    isProfileMode(router.params.mode) ? router.params.mode : 'view',
  )

  // 画像来自 store：改动在离开页面后依然生效
  const { profile } = useAppState()
  const { name, birthday, info, preferences } = profile

  /** 进入编辑前存一份快照，Cancel 用它回滚 */
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileState | null>(null)

  /** 长按某一行后就只让那一行进入编辑，不必整页变成编辑态 */
  const [editingKey, setEditingKey] = useState<ProfileInfoKey | null>(null)

  /** 新增偏好走手动输入，草稿为 null 时表单不显示 */
  const [draft, setDraft] = useState<{ label: string; value: string } | null>(null)

  /** 拖拽换位需要真实像素，行高只能实测，rem 与 movable 的 y 单位对不上 */
  const [slotHeight, setSlotHeight] = useState(0)
  const dragY = useRef<number | null>(null)

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

    setProfilePreferences([
      ...preferences,
      { id: `custom-${Date.now()}`, icon: newPreferenceIcon, label, value: value ?? '' },
    ])
    setDraft(null)
  }

  const handleDrop = (fromIndex: number) => () => {
    const droppedY = dragY.current
    dragY.current = null

    if (!slotHeight || droppedY === null) return

    const target = Math.min(
      Math.max(Math.round(droppedY / slotHeight), 0),
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

  const renderPreference = (preference: ProfilePreference, probe: boolean) => (
    <View id={probe ? 'preference-probe' : undefined}>
      <PreferenceCard
        preference={preference}
        editable={isManagingPreferences}
        onRemove={() => removePreference(preference.id)}
      />
    </View>
  )

  return (
    <PageContainer header={<PageHeader showBack title="宝宝画像" />}>
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

          <Text className="text-2xl font-bold text-on-surface">{name}</Text>

          <View className="py-1 px-3 rounded-full bg-secondary-container flex items-center gap-1">
            <Icon name="profile-lion" className="w-4 h-4" />
            <Text className="text-sm font-semibold text-on-secondary-container">
              {babyProfile.badge}
            </Text>
          </View>
        </View>

        <View className="flex flex-col gap-3">
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
            <Text
              className="text-sm font-semibold text-on-surface-variant"
              onClick={() => (isManagingPreferences ? cancel() : beginEditing('preferences'))}
            >
              {isManagingPreferences ? 'Done' : 'Edit All'}
            </Text>
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
                  onChange={(event) => {
                    dragY.current = event.detail.y
                  }}
                  onTouchEnd={handleDrop(index)}
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

          {isManagingPreferences ? (
            draft ? (
              <View className="w-full box-border p-4 rounded-3xl border border-outline-variant flex flex-col gap-3">
                {/* 输入框给足高度，否则 hint 文字会被上下裁掉 */}
                <Input
                  className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                  placeholder="偏好名称，如 Bath Time"
                  placeholderClass="text-on-surface-variant"
                  value={draft.label}
                  onInput={(event) =>
                    setDraft((previous) => ({ label: event.detail.value, value: previous?.value ?? '' }))
                  }
                />
                <Input
                  className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                  placeholder="补充说明，可留空"
                  placeholderClass="text-on-surface-variant"
                  value={draft.value}
                  onInput={(event) =>
                    setDraft((previous) => ({ label: previous?.label ?? '', value: event.detail.value }))
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
                className="w-full box-border py-4 rounded-full border border-dashed border-outline flex items-center justify-center gap-2"
                onClick={() => setDraft({ label: '', value: '' })}
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

            <View className="py-3 flex items-center justify-center" onClick={cancel}>
              <Text className="text-base font-semibold text-on-surface-variant">Cancel</Text>
            </View>
          </View>
        ) : null}
      </View>
    </PageContainer>
  )
}
