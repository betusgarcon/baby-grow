import { useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { View, Text, Input, Picker } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import PrimaryButton from '@/components/PrimaryButton'
import Icon from '@/components/Icon'
import { createFamily, acceptInvite } from '@/api/modules/family'
import { enterApp } from '@/utils/enterApp'
import { todayIsoDate } from '@/store/profile'

/**
 * 首次进入应用时的引导页：创建一个成长空间，或用家人的口令加入已有的空间。
 *
 * 为什么需要这一页：家庭此前是服务端在**登录时自动建好**的，于是「首次登录」必然
 * 产出一个孤儿家庭；而加入家庭的接口又用「你已经有家庭了」把受邀者挡在门外——
 * 结果是被邀请的人永远加入不了。把「创建家庭」改成显式动作之后，这一页就是新用户
 * 的第一站，两个出口都在这里。
 */
export default function OnboardingPage() {
  const router = useRouter()

  const [babyName, setBabyName] = useState('')
  const [birthday, setBirthday] = useState('')
  // 口令允许随链接带进来（?code=XXXX），免得用户手抄一串大小写混排的字符
  const [code, setCode] = useState((router.params.code ?? '').trim().toUpperCase())
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  const submitCreate = async () => {
    if (creating) return

    const name = babyName.trim()
    if (!name) {
      Taro.showToast({ title: '请填写宝宝的名字', icon: 'none' })
      return
    }

    setCreating(true)
    try {
      const response = await createFamily(name, birthday || undefined)
      if (response.code !== 0) throw new Error(response.message)

      Taro.showToast({ title: '已创建', icon: 'none' })
      await enterApp()
    } catch (error) {
      console.error('[onboarding] 创建家庭失败', error)
      Taro.showToast({ title: '创建失败，请稍后再试', icon: 'none' })
    } finally {
      setCreating(false)
    }
  }

  const submitJoin = async () => {
    if (joining) return

    // 口令是大小写不敏感的：后端按大写查找，用户手抄时经常写成小写
    const token = code.trim().toUpperCase()
    if (!token) {
      Taro.showToast({ title: '请填写邀请口令', icon: 'none' })
      return
    }

    setJoining(true)
    try {
      const response = await acceptInvite(token)
      if (response.code !== 0) throw new Error(response.message)

      Taro.showToast({ title: '已加入', icon: 'none' })
      await enterApp()
    } catch (error) {
      console.error('[onboarding] 加入家庭失败', error)
      // 服务端会区分「口令无效 / 已过期 / 你已经有家庭了」，原样带出来，
      // 而不是用一句笼统的「口令可能已失效」把人引到错误的排查方向。
      const message = error instanceof Error ? error.message : ''
      Taro.showToast({ title: message || '加入失败，请稍后再试', icon: 'none' })
    } finally {
      setJoining(false)
    }
  }

  return (
    <PageContainer header={<PageHeader title="欢迎" />}>
      <View className="flex flex-col gap-5 pb-6">
        <View className="flex flex-col gap-2 px-1">
          <Text className="text-2xl font-bold text-on-surface">先给宝宝安个家</Text>
          <Text className="text-sm leading-6 text-on-surface-variant">
            创建一个属于你们的成长空间，或者用家人发来的邀请口令，加入他已经建好的空间。
          </Text>
        </View>

        <View className="w-full box-border p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
          <Text className="text-base font-bold text-on-surface">创建成长空间</Text>

          <View className="flex flex-col gap-1">
            <Text className="text-caption text-on-surface-variant px-1">宝宝的名字</Text>
            <Input
              className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
              placeholder="如：小满"
              placeholderClass="text-on-surface-variant"
              value={babyName}
              maxlength={20}
              onInput={(event) => setBabyName(event.detail.value)}
            />
          </View>

          <View className="flex flex-col gap-1">
            <Text className="text-caption text-on-surface-variant px-1">宝宝生日（选填）</Text>
            <Picker
              mode="date"
              value={birthday || todayIsoDate()}
              end={todayIsoDate()}
              onChange={(event) => setBirthday(event.detail.value)}
            >
              <View className="w-full box-border h-11 px-4 rounded-full bg-surface-container flex items-center">
                <Text
                  className={
                    birthday ? 'text-base text-on-surface' : 'text-base text-on-surface-variant'
                  }
                >
                  {birthday || '选择日期'}
                </Text>
              </View>
            </Picker>
            {/* 生日在这里是可选的，但它不是可有可无的字段：月龄是喂养建议（例如
                「4 个月以下不建议添加辅食」）与生长曲线的输入，缺了它那些建议只能
                走最保守的分支。所以问一句，但不拦着用户先跳过。 */}
            <Text className="text-caption text-on-surface-variant px-1">
              填了才能按准确月龄给喂养建议；也可以之后在画像页补
            </Text>
          </View>

          <PrimaryButton block disabled={creating} onClick={submitCreate}>
            {creating ? '创建中…' : '创建并开始'}
          </PrimaryButton>
        </View>

        <View className="flex items-center gap-3 px-1">
          <View className="flex-1 h-px bg-outline-variant" />
          <Text className="text-caption text-on-surface-variant">或</Text>
          <View className="flex-1 h-px bg-outline-variant" />
        </View>

        <View className="w-full box-border p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant flex flex-col gap-3">
          <View className="flex items-center gap-2">
            <Icon name="member-invite" className="w-5 h-5" />
            <Text className="text-base font-bold text-on-surface">加入家人的空间</Text>
          </View>

          <Text className="text-caption text-on-surface-variant">
            邀请你的人会给你一串口令，形如 7K2M-9QX4
          </Text>

          <Input
            className="w-full box-border h-11 px-4 rounded-full bg-surface-container"
            placeholder="填写邀请口令"
            placeholderClass="text-on-surface-variant"
            value={code}
            maxlength={16}
            onInput={(event) => setCode(event.detail.value)}
          />

          <PrimaryButton block variant="outline" disabled={joining} onClick={submitJoin}>
            {joining ? '加入中…' : '加入'}
          </PrimaryButton>
        </View>
      </View>
    </PageContainer>
  )
}
