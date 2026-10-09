import { useState } from 'react'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { View, Text, Image, Button } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import babyAvatar from '@/assets/images/baby-journey-img.png'
import { posterContent, posterTemplates, privacyToggles } from '@/store/family'

export default function FamilyPosterPage() {
  const [template, setTemplate] = useState(posterTemplates[0].key)
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(privacyToggles.map((item) => [item.key, item.defaultOn])),
  )

  useShareAppMessage(() => ({
    title: posterContent.title,
    path: '/pages/family/poster/index',
  }))

  const saveToAlbum = () => {
    // 海报是运行时合成的图，还没有做离屏绘制，所以先把这一步标成待开发，
    // 而不是假装保存成功
    Taro.showToast({ title: '海报导出待开发', icon: 'none' })
  }

  return (
    <PageContainer
      header={
        <PageHeader
          showBack
          title="Poster Preview"
          right={
            <View className="py-1 px-3 rounded-full bg-surface-container-high flex items-center gap-1">
              <Icon name="menu" className="w-4 h-4" />
              <Text className="text-caption font-semibold text-on-surface">Layout</Text>
            </View>
          }
        />
      }
    >
      <View className="flex flex-col gap-5">
        {/* 海报预览。底色与内页留白按设计稿，照片位没有资源用浅底占位 */}
        <View className="w-full box-border p-5 rounded-3xl bg-family-poster flex flex-col items-center gap-4">
          <View className="flex flex-col items-center gap-1">
            <Text className="text-2xl font-bold text-[#ffffff]">{posterContent.title}</Text>
            <Text className="text-caption font-semibold text-[#ffffff]" style={{ letterSpacing: '0.12em' }}>
              {posterContent.subtitle}
            </Text>
          </View>

          <View className="w-full box-border p-4 rounded-3xl border-2 border-dashed border-[#ffffff] bg-surface-container-lowest flex flex-col gap-3">
            <View className="w-full h-40 rounded-2xl overflow-hidden bg-surface-container flex items-center justify-center">
              <Image src={babyAvatar} className="w-full h-full" mode="aspectFill" />
            </View>

            <View className="self-start py-1 px-3 rounded-full bg-tertiary-fixed flex items-center gap-1">
              <Icon name="fork_knife" className="w-3.5 h-3.5" />
              <Text className="text-caption font-bold text-on-tertiary-container">
                {posterContent.badge}
              </Text>
            </View>

            <Text className="text-2xl font-bold text-on-surface">{posterContent.heading}</Text>
            <Text className="text-sm text-on-surface-variant">{posterContent.body}</Text>

            <View className="w-full h-px bg-analysis-divider" />

            <View className="flex items-center justify-between">
              <Text className="text-caption text-on-surface-variant">{posterContent.meta}</Text>
              <Icon name="heart" className="w-5 h-5" />
            </View>
          </View>

          <View className="flex flex-col items-center">
            {[0, 1].map((index) => (
              <Icon key={index} name="chevron-down" className="w-4 h-3" />
            ))}
          </View>
        </View>

        <View className="flex flex-col gap-3">
          <Text className="text-sm font-semibold text-on-surface-variant px-1">选择画风模板</Text>

          <View className="flex flex-wrap gap-2">
            {posterTemplates.map((item) => {
              const selected = item.key === template

              return (
                <View
                  key={item.key}
                  className={`py-2 px-4 rounded-full border-2 flex items-center gap-2 ${
                    selected
                      ? 'bg-surface-container-lowest border-tertiary'
                      : 'bg-surface-container-lowest border-transparent'
                  }`}
                  onClick={() => setTemplate(item.key)}
                >
                  <Icon name={item.icon} className="w-4 h-4" />
                  <Text className="text-sm font-semibold text-on-surface">{item.label}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <View className="flex flex-col gap-3">
          <Text className="text-sm font-semibold text-on-surface-variant px-1">隐私脱敏保护</Text>

          <View className="flex gap-3">
            {privacyToggles.map((item) => {
              const on = toggles[item.key]

              return (
                <View
                  key={item.key}
                  className="flex-1 box-border p-3 rounded-3xl bg-surface-container-lowest flex flex-col gap-2"
                  onClick={() => setToggles((previous) => ({ ...previous, [item.key]: !on }))}
                >
                  <Icon name={item.key === 'growth' ? 'eye' : 'sunny'} className="w-5 h-5" />
                  <Text className="text-sm font-semibold text-on-surface">{item.label}</Text>
                  <Text className="text-caption text-on-surface-variant">{item.note}</Text>

                  {/* 开关：小程序没有原生 switch 的样式自由，用色块自绘 */}
                  <View
                    className={`w-12 h-7 rounded-full p-1 flex items-center box-border ${
                      on ? 'bg-tertiary justify-end' : 'bg-outline-variant justify-start'
                    }`}
                  >
                    <View className="w-5 h-5 rounded-full bg-surface-container-lowest" />
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        <View className="flex items-center gap-3 pt-1">
          <View
            className="flex-1 py-4 rounded-full bg-surface-container-high flex items-center justify-center gap-2"
            onClick={saveToAlbum}
          >
            <Icon name="photo-gallery" className="w-5 h-5" />
            <Text className="text-base font-semibold text-on-surface">保存到相册</Text>
          </View>

          {/* 必须用 openType="share" 才能拉起小程序的分享面板 */}
          <Button
            openType="share"
            className="share-button flex-1 py-4 rounded-full bg-tertiary flex items-center justify-center gap-2"
          >
            <Text className="text-base font-semibold text-[#ffffff]">分享至微信</Text>
          </Button>
        </View>
      </View>
    </PageContainer>
  )
}
