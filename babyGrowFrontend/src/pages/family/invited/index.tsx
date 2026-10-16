import { useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import { enterApp } from '@/utils/enterApp'
import babyAvatar from '@/assets/images/baby-journey-img.jpg'
import { invitedView, withBabyName } from '@/store/family'
import { useAppState } from '@/store'
import { acceptInvite } from '@/api/modules/family'

/**
 * 受邀者落地页 / 长辈视角预览，同一版式的两种模式。
 *
 * - **带口令**（从分享链接进来，`?code=XXXX`）：真的受邀者。按钮调接受接口。
 * - **不带口令**（从家庭页的「长辈视角」进来）：只是预览对方会看到什么，
 *   所以按钮改成对当前用户真正有用的动作——去邀请家人。
 *
 * 之所以用「有没有口令」而不是再加一个路由参数来区分：口令的有无本来就精确对应
 * 这两种来路，多一个参数只会多一处可能不一致的状态。
 */
export default function FamilyInvitedViewPage() {
  const router = useRouter()
  const { babyHeader } = useAppState()

  // 口令由分享链接带上：/pages/family/invited/index?code=XXXX
  const inviteCode = (router.params.code ?? '').trim().toUpperCase()
  const isInvitee = inviteCode.length > 0

  const [accepting, setAccepting] = useState(false)

  // 这一页里的文案会出现在受邀者看到的内容里，宝宝名不能是写死的「Leo」。
  const invitedTitle = withBabyName(invitedView.title, babyHeader.name)
  const invitedBody = withBabyName(invitedView.body, babyHeader.name)

  const accept = async () => {
    if (accepting) return

    if (!isInvitee) {
      // 预览态没有口令，接受不了。原先这里弹一句「已加入（本地）」就跳走——
      // 一个看起来接受了、实际什么都没做的按钮。改成去邀请页发真正的口令。
      navigateToRoute('family-invite-token')
      return
    }

    setAccepting(true)
    try {
      const response = await acceptInvite(inviteCode)
      if (response.code !== 0) throw new Error(response.message)

      Taro.showToast({ title: '已加入', icon: 'none' })
      await enterApp()
    } catch (error) {
      console.error('[invited] 接受邀请失败', error)
      // 把服务端的话原样带出来。口令无效 / 已过期 / 你已经有家庭了，是三种不同的原因，
      // 用一句笼统的「口令可能已失效」会把用户引到错误的排查方向。
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message || '加入失败，请稍后再试', icon: 'none' })
    } finally {
      setAccepting(false)
    }
  }

  return (
    <PageContainer
      header={
        <PageHeader
          // 受邀者是从分享卡片直接落进来的，栈里没有上一页，不该给返回键；
          // 预览是从家庭页压栈进来的，需要能退回去。
          showBack={!isInvitee}
          title={isInvitee ? '邀请加入' : '长辈受邀界面'}
          right={
            isInvitee ? undefined : (
              <View className="py-1 px-3 rounded-full bg-surface-container-high flex items-center gap-1">
                <Text className="text-caption font-semibold text-on-surface">管理视角</Text>
                <Icon name="chevron-right" className="w-2 h-3" />
              </View>
            )
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

          {/* 这里原本有一行「邀请人：Mom (You)」。那是编的——接受接口只回
              familyId 与 role，没有任何邀请人信息，谁都显示不出来。已删除；
              要真的显示邀请人，需要一个「凭口令预览邀请」的接口。 */}
        </View>

        <View
          className={`w-full box-border py-4 rounded-full flex items-center justify-center gap-2 ${
            accepting ? 'bg-family-clay opacity-60' : 'bg-family-clay'
          }`}
          onClick={accept}
        >
          <Icon name={isInvitee ? 'heart' : 'member-invite'} className="w-5 h-5" />
          <Text className="text-base font-semibold text-[#ffffff]">
            {isInvitee
              ? accepting
                ? '加入中…'
                : invitedView.action
              : '去邀请家人'}
          </Text>
        </View>

        {/* 受邀者的退路：他可能不想加入，也可能这串口令已失效。
            给一个真正能走下去的出口，而不是把人堵在这一页。 */}
        {isInvitee ? (
          <Text
            className="text-sm text-on-surface-variant text-center"
            onClick={() => navigateToRoute('onboarding')}
          >
            口令无效，或想自己创建一个空间
          </Text>
        ) : null}
      </View>
    </PageContainer>
  )
}
