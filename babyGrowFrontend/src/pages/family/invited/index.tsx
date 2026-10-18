import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import { enterApp } from '@/utils/enterApp'
import babyAvatar from '@/assets/images/baby-journey-img.jpg'
import { inviteRoleOptions } from '@/store/family'
import { useAppState } from '@/store'
import { t } from '@/i18n'
import { acceptInvite, getInvitePreview, type InvitePreview } from '@/api/modules/family'

/**
 * 受邀者落地页 / 长辈视角预览，同一版式的两种模式。
 *
 * - **带口令**（从分享链接进来，`?code=XXXX`）：真的受邀者。先拉一次邀请详情，
 *   让他看清这是哪个宝宝的空间、给的是什么权限、口令还有没有效，再决定接受。
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

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(isInvitee)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!isInvitee) return

    let cancelled = false
    setLoadingPreview(true)

    // 预览失败不拦着接受：它是锦上添花，真正的校验在接受那一步
    // （口令无效 / 已过期 / 你已经加入过，都会给出明确原因）。
    getInvitePreview(inviteCode)
      .then((response) => {
        if (!cancelled && response.code === 0) setPreview(response.data)
      })
      .catch((error) => console.error('[invited] 读取邀请信息失败', error))
      .finally(() => {
        if (!cancelled) setLoadingPreview(false)
      })

    return () => {
      cancelled = true
    }
  }, [isInvitee, inviteCode])

  // 名片上的名字优先用**邀请里的**宝宝名：受邀者本机还没有家庭，babyHeader.name 是空的，
  // 直接用它只会渲染成「宝宝」这种通用欢迎页，看不出是谁发的。
  const babyName = preview?.babyName || babyHeader.name || t('common.babyFallback')
  const invitedTitle = t('invited.passTitle', { name: babyName })
  const invitedBody = t('invited.bodyWithName', { name: babyName })

  const roleOption = preview
    ? inviteRoleOptions.find((option) => option.key === preview.role)
    : undefined
  const roleLabel = roleOption ? t(roleOption.titleKey) : preview?.role ?? ''
  const expired = preview?.expired === true

  const accept = async () => {
    if (accepting || expired) return

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

      Taro.showToast({ title: t('common.joined'), icon: 'none' })
      await enterApp()
    } catch (error) {
      console.error('[invited] 接受邀请失败', error)
      // 把服务端的话原样带出来。口令无效 / 已过期 / 你已经有家庭了，是三种不同的原因，
      // 用一句笼统的「口令可能已失效」会把用户引到错误的排查方向。
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message || t('common.joinFailed'), icon: 'none' })
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
          title={isInvitee ? t('invited.title') : t('invited.previewTitle')}
          right={
            isInvitee ? undefined : (
              <View className="py-1 px-3 rounded-full bg-surface-container-high flex items-center gap-1">
                <Text className="text-caption font-medium text-on-surface">{t('family.managementView')}</Text>
                <Icon name="chevron-right" className="w-2 h-3" />
              </View>
            )
          }
        />
      }
    >
      <View className="flex flex-col gap-6">
        {isInvitee && loadingPreview ? (
          <LoadingSkeleton blocks={1} blockHeight={260} />
        ) : (
          <View className="w-full box-border p-6 rounded-3xl bg-surface-container-lowest flex flex-col items-center gap-5">
            <View className="py-2 px-5 rounded-full bg-tertiary-container">
              <Text className="text-caption font-semibold text-on-tertiary-container">
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
                <Text className="text-label font-semibold text-on-surface">{t('invited.badge')}</Text>
                <Text className="text-caption text-on-surface-variant">{invitedBody}</Text>
              </View>
            </View>

            <Text className="text-page-title text-on-surface text-center">{t('invited.badge')}</Text>
            <Text className="text-base text-on-surface-variant text-center">{invitedBody}</Text>

            {/* 邀请详情。这几行回答的是「这是谁的空间、给了我什么权限」——
                此前这一页只有通用欢迎文案，受邀者看不出是谁发的。 */}
            {preview ? (
              <View className="w-full flex flex-col gap-2 pt-1">
                {preview.inviteeName ? (
                  <View className="flex items-center justify-between">
                    <Text className="text-caption text-on-surface-variant">{t('invited.reservedFor')}</Text>
                    <Text className="text-label font-medium text-on-surface">
                      {preview.inviteeName}
                    </Text>
                  </View>
                ) : null}

                <View className="flex items-center justify-between">
                  <Text className="text-caption text-on-surface-variant">{t('invited.accessLevel')}</Text>
                  <Text className="text-label font-medium text-on-surface">{roleLabel}</Text>
                </View>

                {/* 邀请人昵称目前几乎总是空的（从未采集过微信昵称），
                    拿不到就整行不渲染，而不是显示一个占位。 */}
                {preview.inviterName ? (
                  <View className="flex items-center justify-between">
                    <Text className="text-caption text-on-surface-variant">{t('invited.invitedBy')}</Text>
                    <Text className="text-label font-medium text-on-surface">
                      {preview.inviterName}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}

        {expired ? (
          // 已经过期就别再给一个点了必然失败的按钮，直接把原因说清楚
          <View className="w-full box-border py-4 rounded-full bg-surface-container-high flex items-center justify-center">
            <Text className="text-label font-medium text-on-surface-variant">
              {t('invited.expired')}
            </Text>
          </View>
        ) : (
          <View
            className={`w-full box-border py-4 rounded-full flex items-center justify-center gap-2 ${
              accepting ? 'bg-family-clay opacity-60' : 'bg-family-clay'
            }`}
            onClick={accept}
          >
            <Icon name={isInvitee ? 'heart' : 'member-invite'} className="w-5 h-5" />
            <Text className="text-card-title text-[#ffffff]">
              {isInvitee
                ? accepting
                  ? t('common.joining')
                  : t('invited.accept')
                : t('invite.goInvite')}
            </Text>
          </View>
        )}

        {/* 受邀者的退路：他可能不想加入，也可能这串口令已失效。
            给一个真正能走下去的出口，而不是把人堵在这一页。 */}
        {isInvitee ? (
          <Text
            className="text-sm text-on-surface-variant text-center"
            onClick={() => navigateToRoute('onboarding')}
          >
            {t('invited.codeInvalidOrCreate')}
          </Text>
        ) : null}
      </View>
    </PageContainer>
  )
}
