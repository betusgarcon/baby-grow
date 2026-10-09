import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import { navigateBack } from '@/utils/routes'
import { babyProfile } from '@/store/profile'

export default function BabyProfilePhotoPage() {
  // 选中的本地图片路径。上传与持久化待后端，这里先在本页显示出来。
  const [photo, setPhoto] = useState<string | null>(null)

  const pickImage = (source: 'camera' | 'album') => {
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

  const confirmRemove = async () => {
    const result = await Taro.showModal({
      title: '移除当前头像？',
      content: '移除后将回退到默认头像。',
      confirmText: '移除',
      confirmColor: '#ba1a1a',
      cancelText: '取消',
    })

    if (result.confirm) setPhoto(null)
  }

  return (
    <PageContainer
      header={<PageHeader showBack title="修改头像" />}
    >
      <View className="flex flex-col gap-6">
        <View className="pt-2 flex items-center justify-center">
          {/* 虚线外圈表示头像可更换；编辑按钮叠在右下角 */}
          <View className="relative w-44 h-44 flex items-center justify-center">
            <View className="absolute inset-0 rounded-full border border-dashed border-outline" />

            <View className="w-36 h-36 rounded-full border-4 border-surface-container-lowest overflow-hidden bg-surface-container">
              <Image
                src={photo ?? babyProfile.avatar}
                className="w-full h-full"
                mode="aspectFill"
              />
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
