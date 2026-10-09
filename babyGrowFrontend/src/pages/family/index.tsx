import { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import BottomTabBar from '@/components/BottomTabBar'
import Icon from '@/components/Icon'
import { handleBottomTabNavigation } from '@/utils/analysisNavigation'
import { navigateToRoute } from '@/utils/routes'
import babyAvatar from '@/assets/images/baby-journey-img.png'
import highlightImage from '@/assets/images/first-smile-img.png'
import MemberRow from './components/MemberRow'
import MemberPermissionSheet from './components/MemberPermissionSheet'
import { useAppState, loadMembers, setMemberRole, removeMember } from '@/store'
import { babyAgeLabel, shareHighlight, type FamilyMember, type FamilyRole } from '@/store/family'

export default function FamilyHomePage() {
  // 成员来自 store：改权限、移出成员在离开页面后依然生效
  const { members, status } = useAppState()

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

  const confirmRole = () => {
    if (!editingMember) return

    setMemberRole(editingMember.id, draftRole)
    setEditingMember(null)
    Taro.showToast({ title: '已保存', icon: 'none' })
  }

  const confirmRemoveMember = async () => {
    if (!editingMember) return

    const result = await Taro.showModal({
      title: `移出「${editingMember.name}」？`,
      content: '移出后该成员将无法再查看这个空间的内容。',
      confirmText: '移出',
      confirmColor: '#ba1a1a',
      cancelText: '取消',
    })

    if (!result.confirm) return

    removeMember(editingMember.id)
    setEditingMember(null)
  }

  /** 分享走系统剪贴板，这步是真的；生成真实分享链接要等后端 */
  const copySecureLink = async () => {
    await Taro.setClipboardData({ data: 'https://nurture-bloom.app/s/leo-space' })
    Taro.showToast({ title: '安全链接已复制', icon: 'none' })
  }

  return (
    <PageContainer
      bottomBar={<BottomTabBar activeKey="family" onTabChange={handleBottomTabNavigation} />}
      header={<PageHeader title="Family" profile={{ avatar: babyAvatar, ageLabel: babyAgeLabel }} />}
    >
      <View className="flex flex-col gap-6">
        <View className="flex items-center justify-between">
          <Text className="text-xl font-bold text-on-surface">Family Circle</Text>

          <View
            className="py-2 px-4 rounded-full bg-surface-container-high flex items-center gap-2"
            onClick={() => navigateToRoute('family-invite')}
          >
            <Icon name="member-invite" className="w-5 h-5" />
            <Text className="text-sm font-semibold text-on-surface">Invite</Text>
          </View>
        </View>

        <AsyncSection status={status.members} onRetry={loadMembers} skeletonBlocks={1} skeletonHeight={240}>
          <View className="w-full box-border px-4 rounded-lg bg-surface-container-lowest shadow-card-soft flex flex-col">
            {members.map((member, index) => (
              <View key={member.id} className="flex flex-col">
                {index > 0 ? <View className="w-full h-px bg-analysis-divider" /> : null}

                <MemberRow member={member} onMore={() => openPermission(member)} />
              </View>
            ))}
          </View>
        </AsyncSection>

        <View className="flex items-center justify-between">
          <Text className="text-xl font-bold text-on-surface">What to Share?</Text>

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
                <Text className="text-caption font-bold text-on-surface">{shareHighlight.badge}</Text>
              </View>

              <Text className="text-2xl font-bold text-[#ffffff]">{shareHighlight.title}</Text>
              <Text className="text-sm text-[#ffffff]">{shareHighlight.subtitle}</Text>
            </View>
          </View>

          <Text className="text-center text-sm text-on-surface-variant">Long press to share</Text>

          <View className="flex items-center gap-3">
            <View
              className="flex-1 py-4 rounded-full bg-surface-container-high flex items-center justify-center gap-2"
              onClick={copySecureLink}
            >
              <Icon name="link" className="w-5 h-5" />
              <Text className="text-base font-semibold text-on-surface">Secure Link</Text>
            </View>

            <View
              className="flex-1 py-4 rounded-full bg-primary flex items-center justify-center gap-2"
              onClick={() => navigateToRoute('family-poster')}
            >
              <Icon name="photo-gallery" className="w-5 h-5" />
              <Text className="text-base font-semibold text-[#ffffff]">Long Image</Text>
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
