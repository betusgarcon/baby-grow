import Taro from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import EventInfoRow from './components/EventInfoRow'
import EventSectionCard from './components/EventSectionCard'
import { vaccineDetail } from './vaccineData'

const notImplemented = (label: string) =>
  Taro.showToast({ title: `${label}待开发`, icon: 'none' })

export default function JourneyVaccinePage() {
  const detail = vaccineDetail

  const confirmDelete = async () => {
    const result = await Taro.showModal({
      title: 'Delete this record?',
      content: '这条接种记录会被移除，且无法撤销。',
      confirmText: '删除',
      confirmColor: '#ba1a1a',
      cancelText: '取消',
    })

    if (result.confirm) notImplemented('删除')
  }

  return (
    <PageContainer
      header={
        <PageHeader
          showBack
          titleAlign="start"
          title="Event Details"
          right={
            <View
              className="w-9 h-9 flex items-center justify-center"
              onClick={() => notImplemented('分享')}
            >
              <Icon name="event-share" className="w-5 h-5" />
            </View>
          }
        />
      }
    >
      <View className="flex flex-col gap-4">
        <View className="w-full box-border p-6 rounded-3xl bg-surface-container flex flex-col items-center gap-3">
          <View className="w-14 h-14 rounded-full bg-tertiary-fixed flex items-center justify-center">
            <Icon name="calendar-vaccine" className="w-6 h-6" />
          </View>

          <Text className="text-2xl font-bold text-on-surface">{detail.title}</Text>

          <View className="flex items-center gap-2">
            <Icon name="calendar" className="w-4 h-4" />
            <Text className="text-sm text-on-surface-variant">{detail.datetime}</Text>
          </View>
        </View>

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

        <View className="flex flex-col gap-3">
          <View className="flex items-center justify-between">
            <View className="flex items-center gap-2">
              <Icon name="event-attachment" className="w-5 h-5" />
              <Text className="text-lg font-semibold text-on-surface">Attachments</Text>
            </View>

            <Text
              className="text-sm font-semibold text-on-surface-variant"
              onClick={() => notImplemented('添加照片')}
            >
              Add Photo
            </Text>
          </View>

          {/* 附件预览位。没有真实图片资源，渲染占位块而不是塞一张不相干的照片 */}
          <View className="relative w-full h-44 rounded-3xl bg-surface-variant overflow-hidden flex items-center justify-center">
            <Icon name="event-attachment" className="w-8 h-8" />

            <View className="absolute left-0 right-0 bottom-0 p-3">
              <Text className="text-caption text-on-surface">{detail.attachment.name}</Text>
            </View>
          </View>
        </View>

        <View className="flex flex-col gap-3 pt-2">
          <View
            className="w-full h-12 rounded-full bg-primary flex items-center justify-center gap-2"
            onClick={() => notImplemented('编辑')}
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
      </View>
    </PageContainer>
  )
}
