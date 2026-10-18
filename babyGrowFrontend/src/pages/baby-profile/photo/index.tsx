import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import PrimaryButton from '@/components/PrimaryButton'
import Icon from '@/components/Icon'
import { navigateBack } from '@/utils/routes'
import { babyProfile } from '@/store/profile'
import { useAppState, loadBabyHeader } from '@/store'
import { uploadMedia } from '@/api/modules/media'
import { updateProfileAvatar } from '@/api/modules/profile'
import { t } from '@/i18n'

/**
 * 修改头像。
 *
 * 这一页此前**选完图就结束了**：临时路径只进了本地 state，既没有上传也没有保存，
 * 页面上的「移除」「取消」是仅有的两个动作——所以换头像永远不生效。
 * 现在补上真正的一步：上传 → 把 URL 记到档案上 → 刷新导航栏 → 返回。
 */
export default function BabyProfilePhotoPage() {
  const { babyHeader } = useAppState()

  /** 本地新选的图。null 表示没有待保存的改动 */
  const [photo, setPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  // 当前头像来自后端；没设置过才回落到内置的默认图。
  // 此前这里直接显示写死的示例图，于是无论存了什么，这一页看起来都没变。
  const currentAvatar = babyHeader.avatar || babyProfile.avatar
  const busy = saving || removing

  const pickImage = (source: 'camera' | 'album') => {
    if (busy) return

    Taro.chooseImage({
      count: 1,
      sourceType: [source],
      success: (result) => {
        const picked = result.tempFilePaths?.[0]

        if (picked) setPhoto(picked)
      },
      fail: () => undefined,
    })
  }

  /**
   * 保存：先把本地图片传到 /api/baby/media 拿到 URL，再把它记到档案上。
   *
   * 两步都是必须的：后端只接受「当前用户自己上传过」的 URL（会反查 media_assets
   * 校验归属），所以不能跳过上传直接写一个路径。
   */
  const save = async () => {
    if (busy || !photo) return

    setSaving(true)
    try {
      const uploaded = await uploadMedia(photo)
      await updateProfileAvatar(uploaded.url)

      // 导航栏与画像页读的是同一份数据，刷新一次两处一起变
      await loadBabyHeader()

      Taro.showToast({ title: t('common.photoUpdated'), icon: 'none' })
      navigateBack()
    } catch (error) {
      console.error('[profile-photo] 保存头像失败', error)
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message || t('common.saveFailed'), icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const confirmRemove = async () => {
    if (busy) return

    const result = await Taro.showModal({
      title: t('photo.removeTitle'),
      content: t('photo.removeDesc'),
      confirmText: t('common.remove'),
      confirmColor: '#ba1a1a',
      cancelText: t('common.cancel'),
    })

    if (!result.confirm) return

    setRemoving(true)
    try {
      // 空串表示清除。此前这个按钮只把本地 state 置空，服务端的头像还在。
      await updateProfileAvatar('')
      await loadBabyHeader()

      Taro.showToast({ title: t('common.photoReset'), icon: 'none' })
      navigateBack()
    } catch (error) {
      console.error('[profile-photo] 移除头像失败', error)
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message || t('common.removeFailed'), icon: 'none' })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <PageContainer header={<PageHeader showBack title={t('photo.title')} />}>
      <View className="flex flex-col gap-6">
        <View className="pt-2 flex items-center justify-center">
          {/* 虚线外圈表示头像可更换；编辑按钮叠在右下角 */}
          <View className="relative w-44 h-44 flex items-center justify-center">
            <View className="absolute inset-0 rounded-full border border-dashed border-outline" />

            <View className="w-36 h-36 rounded-full border-4 border-surface-container-lowest overflow-hidden bg-surface-container">
              <Image src={photo ?? currentAvatar} className="w-full h-full" mode="aspectFill" />
            </View>

            <View
              className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-secondary-container flex items-center justify-center"
              onClick={() => pickImage('album')}
            >
              <Icon name="photo-edit" className="w-5 h-5" />
            </View>
          </View>
        </View>

        <View className="flex flex-col items-center gap-2">
          <Text className="text-section-title text-on-surface">{t('photo.heading')}</Text>
          <Text className="text-base text-on-surface-variant text-center px-4">
            {t('photo.intro')}
          </Text>
        </View>

        <View className="flex flex-col gap-3">
          <View
            className="w-full box-border p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant flex items-center gap-4"
            onClick={() => pickImage('camera')}
          >
            <View className="w-11 h-11 shrink-0 rounded-full bg-secondary-container flex items-center justify-center">
              <Icon name="photo-camera" className="w-5 h-5" />
            </View>

            <View className="flex-1 flex flex-col">
              <Text className="text-card-title text-on-surface">{t('photo.takePhoto')}</Text>
              <Text className="text-caption text-on-surface-variant">{t('photo.takePhotoHint')}</Text>
            </View>

            <Icon name="chevron-right" className="w-2 h-3" />
          </View>

          <View
            className="w-full box-border p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant flex items-center gap-4"
            onClick={() => pickImage('album')}
          >
            <View className="w-11 h-11 shrink-0 rounded-full bg-tertiary-fixed flex items-center justify-center">
              <Icon name="photo-gallery" className="w-5 h-5" />
            </View>

            <View className="flex-1 flex flex-col">
              <Text className="text-card-title text-on-surface">{t('photo.fromAlbum')}</Text>
              <Text className="text-caption text-on-surface-variant">{t('photo.fromAlbumHint')}</Text>
            </View>

            <Icon name="chevron-right" className="w-2 h-3" />
          </View>
        </View>

        {/* 保存按钮只在选了新图时出现：没有改动就没有可保存的东西 */}
        {photo ? (
          <PrimaryButton block disabled={busy} onClick={save}>
            {saving ? t('common.saving') : t('photo.save')}
          </PrimaryButton>
        ) : null}

        <View className="py-2 flex items-center justify-center gap-2" onClick={confirmRemove}>
          <Icon name="event-delete" className="w-5 h-5" />
          <Text className="text-card-title text-error">{t('photo.remove')}</Text>
        </View>

        <View
          className="w-full box-border py-4 rounded-full bg-surface-container flex items-center justify-center"
          onClick={navigateBack}
        >
          <Text className="text-card-title text-on-surface-variant">{t('common.cancel')}</Text>
        </View>
      </View>
    </PageContainer>
  )
}
