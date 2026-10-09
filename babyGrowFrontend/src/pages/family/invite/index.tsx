import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import { navigateBack, navigateToRoute } from '@/utils/routes'
import { inviteePresets, inviteRoleOptions, type FamilyRole } from '@/store/family'

export default function FamilyInvitePage() {
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<FamilyRole>('viewer')

  const sendInvite = () => {
    if (!nickname.trim()) {
      Taro.showToast({ title: '请先填写称呼', icon: 'none' })
      return
    }

    // 生成入场凭证是下一步，称呼与角色带过去由那页展示
    navigateToRoute('family-invite-token')
  }

  return (
    <PageContainer
      header={
        <PageHeader
          showBack
          title="成员加入设置"
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
        <View className="flex flex-col gap-3">
          <Text className="text-sm font-semibold text-on-surface-variant px-1">预设亲友身份</Text>

          <View className="w-full box-border p-4 rounded-3xl bg-surface-container-lowest flex flex-col gap-3">
            <Input
              className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
              placeholder="请填入称呼，如：外公、小姨…"
              placeholderClass="text-on-surface-variant"
              value={nickname}
              onInput={(event) => setNickname(event.detail.value)}
            />

            <View className="flex flex-wrap gap-2">
              {inviteePresets.map((preset) => (
                <View
                  key={preset}
                  className={`py-2 px-4 rounded-full border ${
                    nickname === preset
                      ? 'bg-tertiary-fixed border-on-tertiary-container'
                      : 'bg-surface-container border-transparent'
                  }`}
                  onClick={() => setNickname(preset)}
                >
                  <Text className="text-sm font-semibold text-on-surface">{preset}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="flex flex-col gap-3">
          <Text className="text-sm font-semibold text-on-surface-variant px-1">分配空间权限</Text>

          {inviteRoleOptions.map((option) => {
            const selected = option.key === role

            return (
              <View
                key={option.key}
                className={`w-full box-border p-4 rounded-3xl flex items-start gap-3 ${
                  selected
                    ? 'bg-surface-container-lowest border-2 border-primary'
                    : 'bg-surface-container-lowest border-2 border-transparent'
                }`}
                onClick={() => setRole(option.key)}
              >
                {/* 单选圈：选中的中心实心 */}
                <View className="w-6 h-6 shrink-0 rounded-full border-2 border-outline-variant flex items-center justify-center mt-0.5">
                  {selected ? <View className="w-3 h-3 rounded-full bg-primary" /> : null}
                </View>

                <View className="flex-1 flex flex-col gap-1">
                  <Text className="text-base font-bold text-on-surface">{option.title}</Text>
                  <Text className="text-caption text-on-surface-variant">{option.description}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <View className="flex items-center gap-3 pt-2">
          <View
            className="flex-1 py-4 rounded-full bg-surface-container-high flex items-center justify-center"
            onClick={navigateBack}
          >
            <Text className="text-base font-semibold text-on-surface">取消</Text>
          </View>

          <View
            className="flex-1 py-4 rounded-full bg-secondary flex items-center justify-center gap-2"
            onClick={sendInvite}
          >
            <Text className="text-base font-semibold text-[#ffffff]">邀请</Text>
            <Icon name="chevron-right" className="w-2 h-3" />
          </View>
        </View>
      </View>
    </PageContainer>
  )
}
