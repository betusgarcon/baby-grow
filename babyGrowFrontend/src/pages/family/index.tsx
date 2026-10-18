import { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import BottomTabBar from '@/components/BottomTabBar'
import Icon from '@/components/Icon'
import { handleBottomTabNavigation } from '@/utils/analysisNavigation'
import { navigateToRoute } from '@/utils/routes'
import highlightImage from '@/assets/images/first-smile-img.jpg'
import MemberRow from './components/MemberRow'
import MemberPermissionSheet from './components/MemberPermissionSheet'
import { useAppState, loadMembers, setMemberRole, removeMember } from '@/store'
import { t } from '@/i18n'
import { shareHighlight, type FamilyMember, type FamilyRole } from '@/store/family'

export default function FamilyHomePage() {
  // 成员来自 store：改权限、移出成员在离开页面后依然生效
  const { members, status, babyHeader } = useAppState()

  useEffect(() => {
    loadMembers()
  }, [])

  /** 正在设置权限的成员；为 null 时弹层不显示 */
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [draftRole, setDraftRole] = useState<FamilyRole>('viewer')

  const openPermission = (member: FamilyMember) => {
    setEditingMember(member)
    setDraftRole(member.role)
  }

  const confirmRole = async () => {
    if (!editingMember) return

    const member = editingMember
    setEditingMember(null)

    // 等落库结果再报结果。此前是「发出去就弹已保存」——保存失败时用户被告知成功，
    // 而界面上的新权限会在下次刷新时变回去。store 现在会在失败时回滚，
    // 所以这里的文案也要跟着说清「已恢复」。
    const saved = await setMemberRole(member.id, draftRole)
    Taro.showToast({ title: saved ? t('common.saved') : t('family.roleSaveFailed'), icon: 'none' })
  }

  const confirmRemoveMember = async () => {
    if (!editingMember) return

    const result = await Taro.showModal({
      title: t('family.removeTitle', { name: editingMember.name }),
      content: t('family.removeDesc'),
      confirmText: t('common.remove'),
      confirmColor: '#ba1a1a',
      cancelText: t('common.cancel'),
    })

    if (!result.confirm) return

    const member = editingMember
    setEditingMember(null)

    // 失败时 store 会把这个人放回列表，这里补一句说明，否则用户只会看到
    // 他「删了又自己回来了」。
    const removed = await removeMember(member.id)
    if (!removed) {
      Taro.showToast({ title: t('common.removeFailed'), icon: 'none' })
    }
  }

  /**
   * 复制一条可分享的邀请口令。
   *
   * 原先把写死的 'https://nurture-bloom.app/s/leo-space' 塞进剪贴板——一个不存在的
   * 域名，还带着别人家孩子的名字。用户会把它发给家人，而对方点开是死链。
   * 改成复制后端真正下发的待接受口令；没有待接受邀请时如实说明。
   */
  const copySecureLink = async () => {
    const pending = members.find((member) => member.inviteCode)

    if (!pending?.inviteCode) {
      Taro.showToast({ title: t('family.noInviteCode'), icon: 'none' })
      return
    }

    await Taro.setClipboardData({ data: pending.inviteCode })
    Taro.showToast({ title: t('family.inviteCodeCopied'), icon: 'none' })
  }

  return (
    <PageContainer
      bottomBar={<BottomTabBar activeKey="family" onTabChange={handleBottomTabNavigation} />}
      header={
        <PageHeader
          title={t('family.title')}
          profile={{ avatar: babyHeader.avatar, ageLabel: babyHeader.ageLabel }}
        />
      }
    >
      <View className="flex flex-col gap-6">
        <View className="flex items-center justify-between">
          <Text className="text-section-title text-on-surface">{t('family.circle')}</Text>

          <View
            className="py-2 px-4 rounded-full bg-surface-container-high flex items-center gap-2"
            onClick={() => navigateToRoute('family-invite')}
          >
            <Icon name="member-invite" className="w-5 h-5" />
            <Text className="text-label font-semibold text-on-surface">{t('family.invite')}</Text>
          </View>
        </View>

        <AsyncSection
          status={status.members}
          onRetry={loadMembers}
          skeletonBlocks={1}
          skeletonHeight={240}
          isEmpty={members.length === 0}
          emptyState={
            <View className="bg-card rounded-[24px]">
              <EmptyState
                icon="family-active"
                title={t('family.empty')}
                description={t('family.emptyDesc')}
                actionText={t('family.inviteFamily')}
                onAction={() => navigateToRoute('family-invite')}
              />
            </View>
          }
        >
          <View className="w-full box-border px-4 rounded-lg bg-card shadow-card-soft flex flex-col">
            {members.map((member, index) => (
              <View key={member.id} className="flex flex-col">
                {index > 0 ? <View className="w-full h-px bg-analysis-divider" /> : null}

                <MemberRow member={member} onMore={() => openPermission(member)} />
              </View>
            ))}
          </View>
        </AsyncSection>

        <View className="flex items-center justify-between">
          <Text className="text-section-title text-on-surface">{t('family.whatToShare')}</Text>

          <View
            className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center"
            onClick={() => navigateToRoute('family-search-results')}
          >
            <Icon name="search" className="w-5 h-5" />
          </View>
        </View>

        <View className="flex flex-col gap-3">
          <View className="relative w-full h-72 rounded-3xl overflow-hidden box-border border-4 border-primary">
            <Image src={highlightImage} className="absolute inset-0 w-full h-full" mode="aspectFill" />

            <View
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)',
              }}
            />

            <View className="absolute left-0 right-0 bottom-0 p-5 flex flex-col gap-2">
              <View className="self-start py-1 px-3 rounded-full bg-surface-container-lowest flex items-center gap-1">
                <Icon name="star" className="w-3.5 h-3.5" />
                <Text className="text-caption font-semibold text-on-surface">{t(shareHighlight.badgeKey)}</Text>
              </View>

              <Text className="text-page-title text-[#ffffff]">
                {t(shareHighlight.titleKey, { name: babyHeader.name || t('common.babyFallback') })}
              </Text>
              <Text className="text-sm text-[#ffffff]">{t(shareHighlight.subtitleKey)}</Text>
            </View>
          </View>

          <Text className="text-center text-sm text-on-surface-variant">{t('family.longPressToShare')}</Text>

          <View className="flex items-center gap-3">
            <View
              className="flex-1 py-4 rounded-full bg-surface-container-high flex items-center justify-center gap-2"
              onClick={copySecureLink}
            >
              <Icon name="link" className="w-5 h-5" />
              <Text className="text-card-title text-on-surface">{t('family.secureLink')}</Text>
            </View>

            <View
              className="flex-1 py-4 rounded-full bg-primary flex items-center justify-center gap-2"
              onClick={() => navigateToRoute('family-poster')}
            >
              <Icon name="photo-gallery" className="w-5 h-5" />
              <Text className="text-card-title text-[#ffffff]">{t('family.longImage')}</Text>
            </View>
          </View>
        </View>
      </View>

      {editingMember ? (
        <MemberPermissionSheet
          member={editingMember}
          role={draftRole}
          onRoleChange={setDraftRole}
          onConfirm={confirmRole}
          onRemove={confirmRemoveMember}
          onClose={() => setEditingMember(null)}
        />
      ) : null}
    </PageContainer>
  )
}
