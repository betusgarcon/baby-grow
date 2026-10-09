import { useEffect } from 'react'
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { View, Text, Image, Button } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import babyAvatar from '@/assets/images/baby-journey-img.png'
import { inviteToken } from '@/store/family'

export default function FamilyInviteTokenPage() {
  useEffect(() => {
    const shareMenuOptions = {
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    }

    Taro.showShareMenu(shareMenuOptions as Parameters<typeof Taro.showShareMenu>[0])
  }, [])

  useShareAppMessage(() => ({
    title: inviteToken.title,
    path: '/pages/family/invited/index',
  }))

  useShareTimeline(() => ({
    title: inviteToken.title,
  }))

  const copyToken = async () => {
    await Taro.setClipboardData({ data: inviteToken.code })
    Taro.showToast({ title: '口令已复制', icon: 'none' })
  }

  return (
    <PageContainer
      header={
        <PageHeader
          showBack
          title="生成入场凭证"
          right={
            <View className="py-1 px-3 rounded-full bg-surface-container-high flex items-center gap-1">
              <Text className="text-caption font-semibold text-on-surface">长辈视角</Text>
              <Icon name="eye" className="w-4 h-4" />
            </View>
          }
        />
      }
    >
      <View className="flex flex-col gap-6">
        {/* 凭证本体：虚线外框示意「可撕下的入场券」 */}
        <View className="w-full box-border p-6 rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center gap-5">
          <View className="py-1 px-4 rounded-full bg-secondary-container">
            <Text className="text-caption font-bold text-on-secondary-container">CONTRIBUTOR</Text>
          </View>

          {/* 分享卡片预览。设计稿这里是一张带表情的合成图，没有可用资源，
              用同色系浅底 + 文字复现结构 */}
          <View className="w-full box-border p-4 rounded-2xl bg-surface-container-low flex items-center gap-3">
            <View className="w-12 h-12 shrink-0 rounded-full overflow-hidden bg-surface-container">
              <Image src={babyAvatar} className="w-full h-full" mode="aspectFill" />
            </View>

            <View className="flex-1 flex flex-col gap-1">
              <Text className="text-sm font-bold text-on-surface">{inviteToken.title}</Text>
              <Text className="text-caption text-on-surface-variant">{inviteToken.code}</Text>
              <Text className="text-caption text-on-surface-variant">{inviteToken.codeNote}</Text>
            </View>
          </View>

          <Text className="text-2xl font-bold text-on-surface text-center">{inviteToken.title}</Text>
          <Text className="text-base text-on-surface-variant text-center">{inviteToken.body}</Text>
        </View>

        {/* 必须用 openType="share" 才能拉起小程序的分享面板 */}
        <Button
          openType="share"
          className="share-button w-full box-border py-4 rounded-full bg-analysis-ring-text flex items-center justify-center gap-2"
        >
          <View className="w-5 h-5 rounded-full bg-[#1AAD19] flex items-center justify-center">
            <Icon name="check-light" className="w-3 h-3" />
          </View>
          <Text className="text-base font-semibold text-[#ffffff]">微信直发时光卡片</Text>
        </Button>

        <View
          className="w-full box-border py-4 rounded-full bg-surface-container-lowest flex items-center justify-center gap-2"
          onClick={copyToken}
        >
          <Icon name="event-attachment" className="w-5 h-5" />
          <Text className="text-base font-semibold text-on-surface">仅复制加密安全口令</Text>
        </View>
      </View>
    </PageContainer>
  )
}
