import { useEffect, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input, Image, Picker } from '@tarojs/components'
import Icon from '@/components/Icon'
import { t } from '@/i18n'
import { uploadMedia } from '@/api/modules/media'
import { createMemory } from '@/api/modules/memories'

interface MemoryCreateSheetProps {
  visible: boolean
  onClose: () => void
  /** 保存成功后由页面刷新列表 */
  onCreated: () => void
}

const CATEGORIES = [
  { value: 'Milestone', labelKey: 'memories.catMilestone' as const, tone: 'green' },
  { value: 'Diet', labelKey: 'memories.catDiet' as const, tone: 'peach' },
  { value: 'Smiles', labelKey: 'memories.catSmile' as const, tone: 'blue' },
  { value: 'Outdoor', labelKey: 'memories.catOutdoor' as const, tone: 'grey' },
]

function localToday(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default function MemoryCreateSheet({ visible, onClose, onCreated }: MemoryCreateSheetProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [date, setDate] = useState(localToday)
  const [photo, setPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 每次打开都从空白开始，避免上一次的草稿串到下一次
  useEffect(() => {
    if (visible) {
      setTitle('')
      setCategory(CATEGORIES[0].value)
      setDate(localToday())
      setPhoto(null)
      setSaving(false)
    }
  }, [visible])

  if (!visible) return null

  const pickPhoto = () => {
    Taro.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (result) => {
        const picked = result.tempFilePaths?.[0]
        if (picked) setPhoto(picked)
      },
      fail: () => undefined,
    })
  }

  const save = async () => {
    const trimmed = title.trim()
    if (!trimmed) {
      Taro.showToast({ title: t('memories.titleRequired'), icon: 'none' })
      return
    }
    if (saving) return

    setSaving(true)
    Taro.showLoading({ title: t('common.saving') })

    try {
      let mediaId: number | null = null
      if (photo) {
        const uploaded = await uploadMedia(photo)
        mediaId = uploaded.mediaId
      }

      const selected = CATEGORIES.find((item) => item.value === category) ?? CATEGORIES[0]
      await createMemory({
        category: selected.value,
        title: trimmed,
        date,
        tone: selected.tone,
        tags: [selected.value],
        media: photo ? 'Media' : 'Text',
        mediaId,
      })

      Taro.hideLoading()
      Taro.showToast({ title: t('memories.createdToast'), icon: 'none' })
      onCreated()
      onClose()
    } catch (error) {
      Taro.hideLoading()
      Taro.showToast({
        title: error instanceof Error ? error.message : t('memories.createFailedToast'),
        icon: 'none',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View className="fixed inset-0 z-50 bg-black/40 flex flex-col justify-end" onClick={onClose}>
      {/* 阻止冒泡：点表单内部不应关闭弹层 */}
      <View
        className="w-full box-border bg-surface rounded-t-3xl px-5 pt-4 pb-6 flex flex-col gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <View className="flex items-center justify-between">
          <Text className="text-section-title text-on-surface">{t('memories.createTitle')}</Text>
          <View className="w-9 h-9 flex items-center justify-center" onClick={onClose}>
            <Icon name="close" className="w-5 h-5" />
          </View>
        </View>

        <View className="flex flex-col gap-2">
          <Text className="text-label font-medium text-on-surface-variant">{t('memories.fieldTitle')}</Text>
          <Input
            className="w-full box-border h-11 px-4 rounded-full bg-surface-container-lowest text-base"
            value={title}
            maxlength={128}
            placeholder={t('memories.titlePlaceholder')}
            placeholderClass="text-on-surface-variant"
            onInput={(event) => setTitle(event.detail.value)}
          />
        </View>

        <View className="flex flex-col gap-2">
          <Text className="text-label font-medium text-on-surface-variant">{t('memories.fieldPhoto')}</Text>
          {photo ? (
            <View className="relative w-24 h-24 rounded-2xl overflow-hidden">
              <Image src={photo} className="w-full h-full" mode="aspectFill" />
              <View
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                onClick={() => setPhoto(null)}
              >
                <Icon name="close" className="w-3.5 h-3.5" />
              </View>
            </View>
          ) : (
            <View
              className="w-24 h-24 rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center justify-center gap-1"
              onClick={pickPhoto}
            >
              <Icon name="photo-gallery" className="w-6 h-6" />
              <Text className="text-caption text-on-surface-variant">{t('memories.addPhoto')}</Text>
            </View>
          )}
        </View>

        <View className="flex flex-col gap-2">
          <Text className="text-label font-medium text-on-surface-variant">{t('memories.fieldCategory')}</Text>
          <View className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => {
              const selected = item.value === category
              return (
                <View
                  key={item.value}
                  className={`py-2 px-4 rounded-full border ${
                    selected
                      ? 'bg-tertiary-fixed border-on-tertiary-container'
                      : 'bg-surface-container border-transparent'
                  }`}
                  onClick={() => setCategory(item.value)}
                >
                  <Text className="text-label font-medium text-on-surface">{t(item.labelKey)}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <View className="flex flex-col gap-2">
          <Text className="text-label font-medium text-on-surface-variant">{t('memories.fieldDate')}</Text>
          <Picker mode="date" value={date} end={localToday()} onChange={(event) => setDate(event.detail.value)}>
            <View className="w-full box-border h-11 px-4 rounded-full bg-surface-container-lowest flex items-center">
              <Text className="text-base text-on-surface">{date}</Text>
            </View>
          </Picker>
        </View>

        <View className="flex items-center gap-3 pt-1">
          <View
            className="flex-1 py-4 rounded-full bg-surface-container-high flex items-center justify-center"
            onClick={onClose}
          >
            <Text className="text-card-title text-on-surface">{t('common.cancel')}</Text>
          </View>
          <View
            className={`flex-1 py-4 rounded-full bg-tertiary flex items-center justify-center ${
              saving ? 'opacity-60' : 'active:opacity-80'
            }`}
            onClick={save}
          >
            <Text className="text-card-title text-[#ffffff]">{t('memories.save')}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
