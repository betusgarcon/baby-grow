import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import { navigateBack } from '@/utils/routes'
import { babyProfile } from '../babyProfileData'

export default function BabyProfilePhotoPage() {
  /**
   * 选图走小程序原生能力，这一步是真的；
   * 上传与保存等后端未实现，所以选完之后只给提示。
   */
  const pickImage = (source: 'camera' | 'album') => {
    Taro.chooseImage({
      count: 1,
      sourceType: [source],
      success: () => Taro.showToast({ title: '已选择照片（上传待开发）', icon: 'none' }),
      fail: () => undefined,
    })
  }

  const confirmRemove = async () => {
    const result = await Taro.showModal({
      title: 'Remove current photo?',
      content: '移除后将回退到默认头像。',
      confirmText: '移除',
      confirmColor: '#ba1a1a',
      cancelText: '取消',
    })

    if (result.confirm) {
      Taro.showToast({ title: '已移除（本地）', icon: 'none' })
    }
  }

  return (
    <PageContainer
      header={
        <PageHeader
          showBack
          title="Change Photo"
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
      <View className="flex flex-col gap-6">
        <View className="pt-6 flex items-center justify-center">
          {/* 虚线外圈表示头像可更换；编辑按钮叠在右下角 */}
          <View className="relative w-44 h-44 flex items-center justify-center">
            <View className="absolute inset-0 rounded-full border border-dashed border-outline" />

            <View className="w-36 h-36 rounded-full border-4 border-surface-container-lowest overflow-hidden bg-surface-container">
              <Image src={babyProfile.avatar} className="w-full h-full" mode="aspectFill" />
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
          <Text className="text-xl font-bold text-on-surface">Capture a new memory</Text>
          <Text className="text-base text-on-surface-variant text-center px-4">
            Update the profile picture for your little one's timeline.
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
              <Text className="text-base font-semibold text-on-surface">Take Photo</Text>
              <Text className="text-caption text-on-surface-variant">Use your camera now</Text>
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
              <Text className="text-base font-semibold text-on-surface">Choose from Gallery</Text>
              <Text className="text-caption text-on-surface-variant">Select from your library</Text>
            </View>

            <Icon name="chevron-right" className="w-2 h-3" />
          </View>
        </View>

        <View className="py-2 flex items-center justify-center gap-2" onClick={confirmRemove}>
          <Icon name="event-delete" className="w-5 h-5" />
          <Text className="text-base font-semibold text-error">Remove current photo</Text>
        </View>

        <View
          className="w-full box-border py-4 rounded-full bg-surface-container flex items-center justify-center"
          onClick={navigateBack}
        >
          <Text className="text-lg font-semibold text-on-surface-variant">Cancel</Text>
        </View>
      </View>
    </PageContainer>
  )
}
