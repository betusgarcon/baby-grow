import { useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image, Input } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import PrimaryButton from '@/components/PrimaryButton'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import ProfileInfoCard from './components/ProfileInfoCard'
import PreferenceCard from './components/PreferenceCard'
import { babyProfile, preferenceTemplates, type ProfileInfoItem, type ProfilePreference } from './babyProfileData'

/**
 * 查看 / 编辑基础信息 / 偏好管理 共用一页。
 *
 * 设计稿里这三种状态是同一版式的不同表现（「基础信息 - 编辑」与「详情」内容完全一致），
 * 所以做成同一页的模式而不是三份实现；路由上仍保留三个 id，靠 query 进入对应模式。
 */
type ProfileMode = 'view' | 'edit' | 'preferences'

const isProfileMode = (value: string | undefined): value is ProfileMode =>
  value === 'view' || value === 'edit' || value === 'preferences'

export default function BabyProfilePage() {
  const router = useRouter()
  const [mode, setMode] = useState<ProfileMode>(
    isProfileMode(router.params.mode) ? router.params.mode : 'view',
  )

  const [name, setName] = useState(babyProfile.name)
  const [info, setInfo] = useState<ProfileInfoItem[]>(babyProfile.info)
  const [preferences, setPreferences] = useState<ProfilePreference[]>(babyProfile.preferences)

  const isEditing = mode !== 'view'

  const updateInfoValue = (key: ProfileInfoItem['key'], value: string) => {
    setInfo((previous) => previous.map((item) => (item.key === key ? { ...item, value } : item)))
  }

  const removePreference = (id: string) => {
    setPreferences((previous) => previous.filter((item) => item.id !== id))
  }

  const addPreference = () => {
    const next = preferenceTemplates.find(
      (template) => !preferences.some((item) => item.id === template.id),
    )

    if (!next) {
      Taro.showToast({ title: '没有更多可添加的偏好了', icon: 'none' })
      return
    }

    setPreferences((previous) => [...previous, next])
  }

  const save = () => {
    // 后端未实现，先回退到查看态并把改动留在本页 state 里
    Taro.showToast({ title: '已保存（本地）', icon: 'none' })
    setMode('view')
  }

  const cancel = () => {
    setName(babyProfile.name)
    setInfo(babyProfile.info)
    setPreferences(babyProfile.preferences)
    setMode('view')
  }

  return (
    <PageContainer
      header={
        <PageHeader
          showBack
          title="Baby Profile"
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
        <View className="pt-4 flex flex-col items-center gap-3">
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

          {mode === 'edit' ? (
            <View className="w-full box-border px-4 py-2 rounded-full bg-surface-container-lowest flex items-center gap-2">
              <Input
                className="flex-1 text-2xl font-bold text-on-surface text-center"
                value={name}
                onInput={(event) => setName(event.detail.value)}
              />
              <Icon name="edit-muted" className="w-4 h-4" />
            </View>
          ) : (
            <Text className="text-2xl font-bold text-on-surface">{name}</Text>
          )}

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
              item={item}
              editing={mode === 'edit'}
              onValueChange={(value) => updateInfoValue(item.key, value)}
            />
          ))}
        </View>

        <View className="flex flex-col gap-3">
          <View className="flex items-center justify-between px-1 pt-2">
            <Text className="text-xl font-semibold text-on-surface">Preferences</Text>
            <Text
              className="text-sm font-semibold text-on-surface-variant"
              onClick={() => (mode === 'preferences' ? cancel() : setMode('preferences'))}
            >
              {mode === 'preferences' ? 'Done' : 'Edit All'}
            </Text>
          </View>

          {preferences.map((preference) => (
            <PreferenceCard
              key={preference.id}
              preference={preference}
              editable={mode === 'preferences'}
              onRemove={() => removePreference(preference.id)}
            />
          ))}

          {mode === 'preferences' ? (
            <View
              className="w-full box-border py-4 rounded-full border border-dashed border-outline flex items-center justify-center gap-2"
              onClick={addPreference}
            >
              <Icon name="add-circle" className="w-5 h-5" />
              <Text className="text-base font-semibold text-on-surface-variant">Add Preference</Text>
            </View>
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
