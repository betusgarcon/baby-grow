import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import babyAvatar from '@/assets/images/baby-journey-img.jpg'
import { invitedView, withBabyName } from '@/store/family'
import { useAppState } from '@/store'

export default function FamilyInvitedViewPage() {
  const { babyHeader } = useAppState()

  // 这一页里的文案会出现在受邀者看到的内容里，宝宝名不能是写死的「Leo」。
  const invitedTitle = withBabyName(invitedView.title, babyHeader.name)
  const invitedBody = withBabyName(invitedView.body, babyHeader.name)

  const accept = () => {
    // 后端未实现，先给提示并回到家庭首页
    Taro.showToast({ title: '已加入（本地）', icon: 'none' })
    navigateToRoute('family-home')
  }

  return (
    <PageContainer
      header={
        <PageHeader
          showBack
          title="长辈受邀界面"
          right={
            <View className="py-1 px-3 rounded-full bg-surface-container-high flex items-center gap-1">
              <Text className="text-caption font-semibold text-on-surface">管理视角</Text>
              <Icon name="chevron-right" className="w-2 h-3" />
            </View>
          }
        />
      }
    >
      <View className="flex flex-col gap-6">
        <View className="w-full box-border p-6 rounded-3xl bg-surface-container-lowest flex flex-col items-center gap-5">
          <View className="py-2 px-5 rounded-full bg-tertiary-container">
            <Text className="text-caption font-bold text-on-tertiary-container">
              {invitedTitle.toUpperCase()}
            </Text>
          </View>

          {/* 设计稿这里是一枚勋章插画，没有可用资源，用虚线圆 + 星形代替 */}
          <View className="w-20 h-20 rounded-full border-2 border-dashed border-family-clay flex items-center justify-center">
            <View className="w-14 h-14 rounded-full bg-family-clay flex items-center justify-center">
              <Icon name="star" className="w-7 h-7" />
            </View>
          </View>

          <View className="w-full box-border p-4 rounded-2xl bg-surface-container-low flex items-center gap-3">
            <View className="w-12 h-12 shrink-0 rounded-full overflow-hidden bg-surface-container">
              <Image src={babyAvatar} className="w-full h-full" mode="aspectFill" />
            </View>

            <View className="flex-1 flex flex-col gap-1">
              <Text className="text-sm font-bold text-on-surface">{invitedView.badge}</Text>
              <Text className="text-caption text-on-surface-variant">{invitedBody}</Text>
            </View>
          </View>

          <Text className="text-2xl font-bold text-on-surface text-center">{invitedView.badge}</Text>
          <Text className="text-base text-on-surface-variant text-center">{invitedBody}</Text>

          <Text className="text-sm text-on-surface-variant">邀请人：{invitedView.inviter}</Text>
        </View>

        <View
          className="w-full box-border py-4 rounded-full bg-family-clay flex items-center justify-center gap-2"
          onClick={accept}
        >
          <Icon name="heart" className="w-5 h-5" />
          <Text className="text-base font-semibold text-[#ffffff]">{invitedView.action}</Text>
        </View>
      </View>
    </PageContainer>
  )
}
