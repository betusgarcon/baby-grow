import { useEffect, useState } from 'react'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { View, Text, Image, Input, Button } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { navigateBack, navigateToRoute } from '@/utils/routes'
import { useAppState, loadVaccine, updateVaccine, removeVaccine } from '@/store'
import type { VaccineDetail } from '@/store/vaccine'
import EventInfoRow from './components/EventInfoRow'
import EventSectionCard from './components/EventSectionCard'

/** 可编辑的字段。附件单独处理，不走这里 */
type EditableKey = 'title' | 'datetime' | 'location' | 'administeredBy' | 'doseLabel' | 'nextAppointment' | 'notes'

const EDIT_FIELDS: Array<{ key: EditableKey; label: string }> = [
  { key: 'title', label: 'Title' },
  { key: 'datetime', label: 'Date & Time' },
  { key: 'location', label: 'Location' },
  { key: 'administeredBy', label: 'Administered by' },
  { key: 'doseLabel', label: 'Dose Status' },
  { key: 'nextAppointment', label: 'Next Appointment' },
  { key: 'notes', label: 'Notes' },
]

export default function JourneyVaccinePage() {
  const { vaccine: detail, status } = useAppState()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<VaccineDetail>>({})

  useEffect(() => {
    loadVaccine()
  }, [])

  useShareAppMessage(() => ({
    title: detail?.title ?? 'Event Details',
    path: '/pages/journey/vaccine/index',
  }))

  // 还没加载完（或加载失败）时先给骨架屏 / 重试，不要误报成「记录已删除」
  if (status.vaccine !== 'ready') {
    return (
      <PageContainer header={<PageHeader showBack title="Event Details" />}>
        <AsyncSection status={status.vaccine} onRetry={loadVaccine} skeletonBlocks={3} skeletonHeight={120}>
          <View />
        </AsyncSection>
      </PageContainer>
    )
  }

  // 记录被删除后停在这里没有意义，给空态和回退入口
  if (!detail) {
    return (
      <PageContainer header={<PageHeader showBack title="Event Details" />}>
        <EmptyState
          icon="event-medical"
          title="记录已删除"
          description="这条接种记录已被移除。"
          actionText="回到日历"
          onAction={() => navigateToRoute('journey-calendar')}
        />
      </PageContainer>
    )
  }

  const beginEdit = () => {
    setDraft({
      title: detail.title,
      datetime: detail.datetime,
      location: detail.location,
      administeredBy: detail.administeredBy,
      doseLabel: detail.doseLabel,
      nextAppointment: detail.nextAppointment,
      notes: detail.notes,
    })
    setEditing(true)
  }

  const commitEdit = () => {
    updateVaccine(draft)
    setEditing(false)
    setDraft({})
    Taro.showToast({ title: '已保存', icon: 'none' })
  }

  const pickPhoto = () => {
    Taro.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (result) => {
        const picked = result.tempFilePaths?.[0]

        if (picked) updateVaccine({ attachment: { ...detail.attachment, image: picked } })
      },
      fail: () => undefined,
    })
  }

  const confirmDelete = async () => {
    const result = await Taro.showModal({
      title: 'Delete this record?',
      content: '这条接种记录会被移除，且无法撤销。',
      confirmText: '删除',
      confirmColor: '#ba1a1a',
      cancelText: '取消',
    })

    if (!result.confirm) return

    removeVaccine()
    navigateBack()
  }

  return (
    <PageContainer
      header={
        <PageHeader
          showBack
          title="Event Details"
          right={
            editing ? (
              <Text className="text-base font-semibold text-tertiary" onClick={commitEdit}>
                保存
              </Text>
            ) : (
              <Button
                openType="share"
                className="share-button w-16 h-9 flex items-center justify-center bg-transparent p-0"
              >
                <Icon name="event-share" className="w-5 h-5" />
              </Button>
            )
          }
        />
      }
    >
      <View className="flex flex-col gap-4">
        <View className="w-full box-border p-6 rounded-3xl bg-surface-container flex flex-col items-center gap-3">
          <View className="w-14 h-14 rounded-full bg-tertiary-fixed flex items-center justify-center">
            <Icon name="calendar-vaccine" className="w-6 h-6" />
          </View>

          {editing ? (
            <>
              <Input
                className="w-full box-border h-11 px-4 rounded-full bg-surface-container-lowest text-center"
                value={draft.title ?? ''}
                onInput={(event) => setDraft((previous) => ({ ...previous, title: event.detail.value }))}
              />
              <Input
                className="w-full box-border h-10 px-4 rounded-full bg-surface-container-lowest text-center"
                value={draft.datetime ?? ''}
                onInput={(event) => setDraft((previous) => ({ ...previous, datetime: event.detail.value }))}
              />
            </>
          ) : (
            <>
              <Text className="text-2xl font-bold text-on-surface">{detail.title}</Text>
              <View className="flex items-center gap-2">
                <Icon name="calendar" className="w-4 h-4" />
                <Text className="text-sm text-on-surface-variant">{detail.datetime}</Text>
              </View>
            </>
          )}
        </View>

        {editing ? (
          <View className="w-full box-border p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
            {EDIT_FIELDS.slice(2).map((field) => (
              <View key={field.key} className="flex flex-col gap-1">
                <Text className="text-caption text-on-surface-variant">{field.label}</Text>
                <Input
                  className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
                  value={(draft[field.key] as string) ?? ''}
                  onInput={(event) =>
                    setDraft((previous) => ({ ...previous, [field.key]: event.detail.value }))
                  }
                />
              </View>
            ))}

            <View className="flex items-center gap-3 pt-1">
              <View
                className="flex-1 py-3 rounded-full bg-surface-container-high flex items-center justify-center"
                onClick={() => {
                  setEditing(false)
                  setDraft({})
                }}
              >
                <Text className="text-base font-semibold text-on-surface">Cancel</Text>
              </View>
              <View
                className="flex-1 py-3 rounded-full bg-primary flex items-center justify-center"
                onClick={commitEdit}
              >
                <Text className="text-base font-semibold text-[#ffffff]">保存</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <EventInfoRow icon="event-location" label="Location" value={detail.location} />
            <EventInfoRow icon="event-person" label="Administered by" value={detail.administeredBy} />

            <EventSectionCard icon="event-medical" title="Dose Status">
              <Text className="text-xl font-bold text-on-surface">{detail.doseLabel}</Text>

              <View className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(detail.doseProgress * 100)}%` }}
                />
              </View>
            </EventSectionCard>

            <EventSectionCard
              icon="event-repeat"
              title="Next Appointment"
              className="bg-secondary-container"
            >
              <Text className="text-xl font-bold text-on-secondary-container">
                {detail.nextAppointment}
              </Text>
              <Text className="text-caption text-on-secondary-container">{detail.nextNote}</Text>
            </EventSectionCard>

            <EventSectionCard icon="event-notes" title="Notes">
              <View className="flex gap-3">
                <View className="w-1 rounded-full bg-tertiary" />
                <Text className="flex-1 text-base text-on-surface-variant">{detail.notes}</Text>
              </View>
            </EventSectionCard>
          </>
        )}

        <View className="flex flex-col gap-3">
          <View className="flex items-center justify-between">
            <View className="flex items-center gap-2">
              <Icon name="event-attachment" className="w-5 h-5" />
              <Text className="text-lg font-semibold text-on-surface">Attachments</Text>
            </View>

            <Text
              className="text-sm font-semibold text-on-surface-variant"
              onClick={pickPhoto}
            >
              Add Photo
            </Text>
          </View>

          {/* 没有照片时渲染占位块，选过之后显示真实图片 */}
          <View className="relative w-full h-44 rounded-3xl bg-surface-variant overflow-hidden flex items-center justify-center">
            {detail.attachment.image ? (
              <Image src={detail.attachment.image} className="w-full h-full" mode="aspectFill" />
            ) : (
              <Icon name="event-attachment" className="w-8 h-8" />
            )}

            <View className="absolute left-0 right-0 bottom-0 p-3">
              <Text className="text-caption text-on-surface">{detail.attachment.name}</Text>
            </View>
          </View>
        </View>

        {!editing ? (
          <View className="flex flex-col gap-3 pt-2">
            <View
              className="w-full h-12 rounded-full bg-primary flex items-center justify-center gap-2"
              onClick={beginEdit}
            >
              <Icon name="event-edit" className="w-5 h-5" />
              <Text className="text-base font-semibold text-[#ffffff]">Edit Entry</Text>
            </View>

            <View
              className="w-full h-12 rounded-full border border-outline-variant bg-surface-container-lowest flex items-center justify-center gap-2"
              onClick={confirmDelete}
            >
              <Icon name="event-delete" className="w-5 h-5" />
              <Text className="text-base font-semibold text-error">Delete Record</Text>
            </View>
          </View>
        ) : null}
      </View>
    </PageContainer>
  )
}
