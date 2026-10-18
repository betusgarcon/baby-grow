import { useEffect, useState } from 'react'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { View, Text, Image, Button, Canvas } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import babyAvatar from '@/assets/images/baby-journey-img.jpg'
import { posterTemplates, privacyToggles } from '@/store/family'
import { t } from '@/i18n'
import { memoryCategoryLabel } from '@/pages/family/memories/memoriesData'
import { TONE_CLASS } from '../memories/memoriesData'
import { useAppState } from '@/store'
import { getPoster } from '@/api/modules/family'

/**
 * 海报拿不到后端内容时的兜底文案。
 *
 * 必须一眼看出是占位：此前这里带着「150g 的甜南瓜泥」「12kg 黄金线」这类编造的具体
 * 数字和日期，接口一失败，用户看到的是一张**别人的**成长海报。
 */
const posterDefaults = () => ({
  title: t('poster.defaultTitle'),
  subtitle: 'GENIUS TRACK · MEMORY CAPSULE',
  badge: t('poster.defaultBadge'),
  heading: t('poster.defaultHeading'),
  body: t('poster.defaultBody'),
  meta: t('poster.defaultMeta'),
})

/** 三套画风模板的差异。之前换模板只改了 chip 的选中态，预览纹丝不动 */
const TEMPLATE_STYLE: Record<string, { wrap: string; title: string; subtitle: string; card: string }> = {
  warm: {
    wrap: 'bg-family-poster',
    title: 'text-[#ffffff]',
    subtitle: 'text-[#ffffff]',
    card: 'border-2 border-dashed border-[#ffffff] bg-surface-container-lowest',
  },
  magazine: {
    wrap: 'bg-surface-container-high',
    title: 'text-on-surface',
    subtitle: 'text-on-surface-variant',
    card: 'border-2 border-primary bg-surface-container-lowest',
  },
  timeline: {
    wrap: 'bg-tertiary-container',
    title: 'text-on-tertiary-container',
    subtitle: 'text-on-tertiary-container',
    card: 'border border-outline-variant bg-surface-container-lowest',
  },
}

export default function FamilyPosterPage() {
  // 记忆页勾选进来的那几条。为空时海报退回「最近一条记录」的单张形态
  const { posterMemories: selectedMemories } = useAppState()
  const [template, setTemplate] = useState<string>(posterTemplates[0].key)
  const style = TEMPLATE_STYLE[template] ?? TEMPLATE_STYLE.warm
  // 海报正文来自后端（按宝宝档案与最近一条记录推导）；拿不到时退回本地占位文案
  const [poster, setPoster] = useState(posterDefaults)
  // 本地的模板/开关是「键」，这里在渲染期翻译成显示文案；后端若下发了同名结构则直接覆盖
  const [templateOptions, setTemplateOptions] = useState<
    Array<{ key: string; label: string; icon: string }>
  >(() =>
    posterTemplates.map((item) => ({ key: item.key, icon: item.icon, label: t(item.labelKey) })),
  )
  const [toggleOptions, setToggleOptions] = useState<
    Array<{ key: string; label: string; note: string; defaultOn: boolean }>
  >(() =>
    privacyToggles.map((item) => ({
      key: item.key,
      label: t(item.labelKey),
      note: t(item.noteKey),
      defaultOn: item.defaultOn,
    })),
  )
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(privacyToggles.map((item) => [item.key, item.defaultOn])),
  )

  useEffect(() => {
    getPoster()
      .then((response) => {
        const data = response.data
        setPoster({
          title: data.title,
          subtitle: data.subtitle,
          badge: data.badge,
          heading: data.heading,
          body: data.body,
          meta: data.meta,
        })
        if (data.templates?.length) setTemplateOptions(data.templates)
        if (data.toggles?.length) {
          setToggleOptions(data.toggles)
          setToggles(Object.fromEntries(data.toggles.map((item) => [item.key, item.defaultOn])))
        }
      })
      // 拿不到就用本地的产品文案把页面渲染出来，而不是留一片空白
      .catch(() => undefined)
  }, [])

  useShareAppMessage(() => ({
    title: poster.title,
    path: '/pages/family/poster/index',
  }))

  /**
   * 存相册：把海报的标题与正文用离屏画布合成成一张图再保存。
   *
   * 这是简化版排版，不是预览的像素级截图——真正的所见即所得要等后端出图。
   * H5 端没有 createCanvasContext，会直接给提示而不是静默失败。
   */
  const saveToAlbum = () => {
    if (typeof Taro.createCanvasContext !== 'function') {
      Taro.showToast({ title: t('poster.unsupported'), icon: 'none' })
      return
    }

    const W = 300
    const H = 400
    const ctx = Taro.createCanvasContext('poster-canvas')

    ctx.setFillStyle('#c9d4bd')
    ctx.fillRect(0, 0, W, H)

    ctx.setFillStyle('#ffffff')
    ctx.setFontSize(20)
    ctx.fillText(poster.title, 24, 52)

    ctx.setFontSize(10)
    ctx.fillText(poster.subtitle, 24, 72)

    ctx.setFillStyle('#ffffff')
    ctx.fillRect(16, 96, W - 32, H - 160)

    ctx.setFillStyle('#1e1b17')
    ctx.setFontSize(16)
    ctx.fillText(poster.heading, 32, 236)

    ctx.setFontSize(11)
    poster.body.match(/.{1,16}/g)?.slice(0, 5).forEach((line, index) => {
      ctx.fillText(line, 32, 262 + index * 18)
    })

    ctx.setFillStyle('#474741')
    ctx.setFontSize(10)
    ctx.fillText(poster.meta, 32, H - 60)

    ctx.draw(false, () => {
      Taro.canvasToTempFilePath({
        canvasId: 'poster-canvas',
        success: (result) => {
          Taro.saveImageToPhotosAlbum({
            filePath: result.tempFilePath,
            success: () => Taro.showToast({ title: t('poster.saved'), icon: 'none' }),
            fail: () => Taro.showToast({ title: t('poster.saveFailed'), icon: 'none' }),
          })
        },
        fail: () => Taro.showToast({ title: t('poster.exportFailed'), icon: 'none' }),
      })
    })
  }

  // 头部原本右侧挂着一个「<三个点> Layout」的胶囊，但它没有任何点击行为，
  // 纯装饰却看着像能操作。去掉——版式选择正文里已经有一份了。
  return (
    <PageContainer header={<PageHeader showBack title={t('poster.title')} />}>
      <View className="flex flex-col gap-5">
        {/* 海报预览。底色与内页留白按设计稿，照片位没有资源用浅底占位 */}
        <View className={`w-full box-border p-5 rounded-3xl flex flex-col items-center gap-4 ${style.wrap}`}>
          <View className="flex flex-col items-center gap-1">
            <Text className={`text-page-title ${style.title}`}>{poster.title}</Text>
            <Text className={`text-caption font-medium ${style.subtitle}`} style={{ letterSpacing: '0.12em' }}>
              {poster.subtitle}
            </Text>
          </View>

          <View className={`w-full box-border p-4 rounded-3xl flex flex-col gap-3 ${style.card}`}>
            {/*
              带着勾选进来时以勾选为准：勾几条就画几张。
              没勾选才退回后端按「最近一条记录」推导的单张形态。
            */}
            {selectedMemories.length > 0 ? (
              selectedMemories.map((memory) => (
                <View
                  key={memory.id}
                  className={`w-full box-border p-3 rounded-2xl flex flex-col gap-2 ${TONE_CLASS[memory.tone].photo}`}
                >
                  <View className="self-start py-0.5 px-2 rounded-full bg-card">
                    <Text className="text-caption font-semibold text-on-surface">{memoryCategoryLabel(memory.category)}</Text>
                  </View>

                  <Text className="text-section-title text-on-surface">{memory.title}</Text>
                  <Text className="text-caption text-on-surface-variant">{memory.date}</Text>
                </View>
              ))
            ) : (
              <>
                <View className="w-full h-40 rounded-2xl overflow-hidden bg-surface-container flex items-center justify-center">
                  <Image src={babyAvatar} className="w-full h-full" mode="aspectFill" />
                </View>

                <View className="self-start py-1 px-3 rounded-full bg-tertiary-fixed flex items-center gap-1">
                  <Icon name="fork_knife" className="w-3.5 h-3.5" />
                  <Text className="text-caption font-semibold text-on-tertiary-container">
                    {poster.badge}
                  </Text>
                </View>

                <Text className="text-page-title text-on-surface">{poster.heading}</Text>
                <Text className="text-sm text-on-surface-variant">{poster.body}</Text>
              </>
            )}

            <View className="w-full h-px bg-analysis-divider" />

            <View className="flex items-center justify-between">
              <Text className="text-caption text-on-surface-variant">{poster.meta}</Text>
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
          <Text className="text-label font-medium text-on-surface-variant px-1">{t('poster.styleTitle')}</Text>

          <View className="flex flex-wrap gap-2">
            {templateOptions.map((item) => {
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
                  <Text className="text-label font-medium text-on-surface">{item.label}</Text>
                </View>
              )
            })}
          </View>
        </View>

        <View className="flex flex-col gap-3">
          <Text className="text-label font-medium text-on-surface-variant px-1">{t('poster.privacy')}</Text>

          <View className="flex gap-3">
            {toggleOptions.map((item) => {
              const on = toggles[item.key]

              return (
                <View
                  key={item.key}
                  className="flex-1 box-border p-3 rounded-3xl bg-surface-container-lowest flex flex-col gap-2"
                  onClick={() => setToggles((previous) => ({ ...previous, [item.key]: !on }))}
                >
                  <Icon name={item.key === 'growth' ? 'eye' : 'sunny'} className="w-5 h-5" />
                  <Text className="text-label font-medium text-on-surface">{item.label}</Text>
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
            <Text className="text-card-title text-on-surface">{t('poster.saveToAlbum')}</Text>
          </View>

          {/* 必须用 openType="share" 才能拉起小程序的分享面板 */}
          <Button
            openType="share"
            className="share-button flex-1 py-4 rounded-full bg-tertiary flex items-center justify-center gap-2"
          >
            <Text className="text-card-title text-[#ffffff]">{t('poster.shareToWechat')}</Text>
          </Button>
        </View>
      </View>

      {/* 离屏画布：不参与布局，只用来合成要保存的那张图 */}
      <Canvas
        canvasId="poster-canvas"
        className="fixed"
        style={{ left: '-9999px', top: '0', width: '300px', height: '400px' }}
      />
    </PageContainer>
  )
}
