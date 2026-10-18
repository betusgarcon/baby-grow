import { useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import { navigateBack, navigateToRoute } from '@/utils/routes'
import { addPendingMember } from '@/store'
import { t } from '@/i18n'
import { inviteePresets, inviteRoleOptions, type FamilyRole } from '@/store/family'

export default function FamilyInvitePage() {
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState<FamilyRole>('viewer')

  const sendInvite = () => {
    const name = nickname.trim()

    if (!name) {
      Taro.showToast({ title: t('invite.nameRequired'), icon: 'none' })
      return
    }

    // 先把受邀人作为「待接受」写进成员列表，再进凭证页——
    // 否则走完邀请流程回到首页，成员还是原来那几个，看不出邀请发生过
    addPendingMember(name, role)
    navigateToRoute('family-invite-token')
  }

  return (
    <PageContainer
      header={
        // 这里原先在 right 里挂了一个「长辈视角」胶囊。两个问题：把居中的长标题
        // 「成员加入设置」挤到重叠，而且它压根没有 onClick——点了没有任何反应。
        // 已把它移到内容区，做成真正可点的入口（见下方）。
        <PageHeader showBack title={t('invite.settingsTitle')} />
      }
    >
      <View className="flex flex-col gap-6">
        {/* 长辈视角：这一页是管理视角，那边是受邀亲友看到的样子，属于预览入口。 */}
        <View
          className="w-full box-border p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant flex items-center justify-between"
          onClick={() => navigateToRoute('family-invited-view')}
        >
          <View className="flex items-center gap-3">
            <View className="w-10 h-10 shrink-0 rounded-full bg-tertiary-fixed flex items-center justify-center">
              <Icon name="eye" className="w-5 h-5" />
            </View>
            <View className="flex flex-col">
              <Text className="text-card-title text-on-surface">{t('family.elderView')}</Text>
              <Text className="text-caption text-on-surface-variant">{t('family.elderViewDesc')}</Text>
            </View>
          </View>

          <Icon name="chevron-right" className="w-2 h-3" />
        </View>

        <View className="flex flex-col gap-3">
          <Text className="text-label font-medium text-on-surface-variant px-1">{t('invite.presetRelation')}</Text>

          <View className="w-full box-border p-4 rounded-3xl bg-surface-container-lowest flex flex-col gap-3">
            <Input
              className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
              placeholder={t('invite.namePlaceholder')}
              placeholderClass="text-on-surface-variant"
              value={nickname}
              onInput={(event) => setNickname(event.detail.value)}
            />

            <View className="flex flex-wrap gap-2">
              {inviteePresets.map((preset) => {
                // preset 是文案键；存进 nickname 的必须是翻译后的称呼，
                // 否则邀请记录里会写着一个键名。
                const label = t(preset)

                return (
                <View
                  key={preset}
                  className={`py-2 px-4 rounded-full border ${
                    nickname === label
                      ? 'bg-tertiary-fixed border-on-tertiary-container'
                      : 'bg-surface-container border-transparent'
                  }`}
                  onClick={() => setNickname(label)}
                >
                  <Text className="text-label font-medium text-on-surface">{label}</Text>
                </View>
                )
              })}
            </View>
          </View>
        </View>

        <View className="flex flex-col gap-3">
          <Text className="text-label font-medium text-on-surface-variant px-1">{t('invite.accessLevel')}</Text>

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
                  <Text className="text-card-title text-on-surface">{t(option.titleKey)}</Text>
                  <Text className="text-caption text-on-surface-variant">
                    {t(option.descriptionKey)}
                  </Text>
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
            <Text className="text-card-title text-on-surface">{t('common.cancel')}</Text>
          </View>

          <View
            className="flex-1 py-4 rounded-full bg-secondary flex items-center justify-center gap-2"
            onClick={sendInvite}
          >
            <Text className="text-card-title text-[#ffffff]">{t('family.invite')}</Text>
            <Icon name="chevron-right" className="w-2 h-3" />
          </View>
        </View>
      </View>
    </PageContainer>
  )
}
