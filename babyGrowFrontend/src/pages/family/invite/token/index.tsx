import { useEffect, useMemo } from 'react'
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { View, Text, Image, Button } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import babyAvatar from '@/assets/images/baby-journey-img.jpg'
import { inviteToken, withBabyName } from '@/store/family'
import { useAppState, loadMembers } from '@/store'

/**
 * 入场凭证页。
 *
 * 口令来自后端签发的真实邀请（`pending` 成员身上的 inviteCode），不再用写死的样例；
 * 标题与正文仍是产品文案，属于静态内容。
 */
export default function FamilyInviteTokenPage() {
  const { members, status, babyHeader } = useAppState()

  useEffect(() => {
    const shareMenuOptions = {
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    }

    Taro.showShareMenu(shareMenuOptions as Parameters<typeof Taro.showShareMenu>[0])
    loadMembers()
  }, [])

  // 没有待接受的邀请时，这一页就没有可展示的口令——如实说明，而不是显示一个假口令
  const latestInvite = useMemo(
    () => [...members].reverse().find((member) => member.status === 'pending' && member.inviteCode),
    [members],
  )

  const code = latestInvite?.inviteCode ?? ''
  const codeNote = latestInvite?.inviteExpiresAt
    ? `一次性安全钥匙 · ${hoursUntil(latestInvite.inviteExpiresAt)}小时内有效`
    : inviteToken.codeNote

  // 这几条文案会随分享卡片发到亲友那里，宝宝名不能是写死的「Leo」。
  const inviteTitle = withBabyName(inviteToken.title, babyHeader.name)
  const inviteBody = withBabyName(inviteToken.body, babyHeader.name)

  // 分享出去的链接把口令带上，对方点进来就直接是那条邀请——
  // 否则要手工抄一串大小写混排的字符（口令用的是无歧义字母表，但仍然很容易抄错）。
  // invited 页从路由参数里取 code 并直接调接受接口。
  const invitePath = code
    ? `/pages/family/invited/index?code=${encodeURIComponent(code)}`
    : '/pages/family/invited/index'

  useShareAppMessage(() => ({
    title: inviteTitle,
    path: invitePath,
  }))

  useShareTimeline(() => ({
    title: inviteTitle,
    // 分享到朋友圈走的是 query：onShareTimeline 不支持自定义 path
    query: code ? `code=${encodeURIComponent(code)}` : '',
  }))

  const copyToken = async () => {
    if (!code) {
      Taro.showToast({ title: '还没有可用的邀请口令，请先邀请成员', icon: 'none' })
      return
    }
    await Taro.setClipboardData({ data: code })
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
        {/* 此前没接 status.members：加载中、请求失败、真的没有邀请，三者都显示
            同一句「暂无待接受的邀请」，分不清也重试不了 */}
        <AsyncSection
          status={status.members}
          onRetry={loadMembers}
          skeletonBlocks={2}
          skeletonHeight={140}
          isEmpty={!latestInvite}
          emptyState={
            <View className="bg-card rounded-[24px]">
              <EmptyState
                icon="family-active"
                title="还没有待接受的邀请"
                description="先邀请一位家人，这里会生成一个一次性口令给他。"
                actionText="去邀请家人"
                onAction={() => navigateToRoute('family-invite')}
              />
            </View>
          }
        >
        {/* 凭证本体：虚线外框示意「可撕下的入场券」 */}
        <View className="w-full box-border p-6 rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest flex flex-col items-center gap-5">
          <View className="py-1 px-4 rounded-full bg-secondary-container">
            <Text className="text-caption font-bold text-on-secondary-container">
              {(latestInvite?.role ?? 'contributor').toUpperCase()}
            </Text>
          </View>

          {/* 分享卡片预览。设计稿这里是一张带表情的合成图，没有可用资源，
              用同色系浅底 + 文字复现结构 */}
          <View className="w-full box-border p-4 rounded-2xl bg-surface-container-low flex items-center gap-3">
            <View className="w-12 h-12 shrink-0 rounded-full overflow-hidden bg-surface-container">
              <Image src={babyAvatar} className="w-full h-full" mode="aspectFill" />
            </View>

            <View className="flex-1 flex flex-col gap-1">
              <Text className="text-sm font-bold text-on-surface">
                {latestInvite?.name ?? inviteTitle}
              </Text>
              <Text className="text-caption text-on-surface-variant">
                {code || '暂无待接受的邀请'}
              </Text>
              <Text className="text-caption text-on-surface-variant">{codeNote}</Text>
            </View>
          </View>

          <Text className="text-2xl font-bold text-on-surface text-center">{inviteTitle}</Text>
          <Text className="text-base text-on-surface-variant text-center">{inviteBody}</Text>
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
          className={`w-full box-border py-4 rounded-full flex items-center justify-center gap-2 ${
            code ? 'bg-surface-container-lowest' : 'bg-surface-container'
          }`}
          onClick={copyToken}
        >
          <Icon name="event-attachment" className="w-5 h-5" />
          <Text className="text-base font-semibold text-on-surface">仅复制加密安全口令</Text>
        </View>
        </AsyncSection>
      </View>
    </PageContainer>
  )
}

/** 距过期还剩几小时，向上取整；已过期或时间不可解析时返回 0 */
const hoursUntil = (iso: string) => {
  const expires = new Date(iso).getTime()
  if (Number.isNaN(expires)) return 0
  return Math.max(0, Math.ceil((expires - Date.now()) / 3_600_000))
}
