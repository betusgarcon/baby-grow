import { useEffect, useState } from 'react'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { View, Text, Image, Canvas } from '@tarojs/components'
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
import {
  composePoster,
  redactGrowthText,
  POSTER_CANVAS_ID,
  POSTER_CANVAS_MAX_HEIGHT,
  POSTER_CANVAS_WIDTH,
  type PosterSpec,
} from './posterCanvas'

/** 预览里的墨镜贴纸。导出时由 Canvas 画同样的形状 */
function FaceSticker() {
  return (
    <View className="absolute left-1/2 top-[30%] -translate-x-1/2 flex items-center">
      <View className="w-10 h-6 rounded-full bg-[#1e1b17]/90" />
      <View className="w-3 h-1 bg-[#1e1b17]/90" />
      <View className="w-10 h-6 rounded-full bg-[#1e1b17]/90" />
    </View>
  )
}

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

  const [busy, setBusy] = useState(false)

  const buildSpec = (): PosterSpec => ({
    template,
    title: poster.title,
    subtitle: poster.subtitle,
    heading: poster.heading,
    body: poster.body,
    meta: poster.meta,
    badge: poster.badge,
    memories: selectedMemories.slice(0, 9),
    singleImage: babyAvatar,
    hideGrowth: Boolean(toggles.growth),
    faceSticker: Boolean(toggles.face),
  })

  const savePathToAlbum = (filePath: string) =>
    new Promise<void>((resolve, reject) => {
      Taro.saveImageToPhotosAlbum({
        filePath,
        success: () => resolve(),
        fail: (error) => reject(new Error(error.errMsg || t('poster.saveFailed'))),
      })
    })

  const handleAlbumError = async (error: unknown) => {
    const message = error instanceof Error ? error.message : ''

    // 相册权限被拒时给一个去设置的入口，而不是只弹一句失败
    if (message.includes('auth deny') || message.includes('authorize')) {
      const result = await Taro.showModal({
        title: t('poster.saveFailed'),
        content: t('poster.albumPermission'),
        confirmText: t('poster.openSettings'),
        cancelText: t('common.cancel'),
      })
      if (result.confirm) {
        await Taro.openSetting()
      }
      return
    }

    Taro.showToast({ title: message || t('poster.saveFailed'), icon: 'none' })
  }

  /** 保存与分享共用同一次 Canvas 合成，保证导出内容与预览一致 */
  const compose = async () => {
    if (busy) return null
    setBusy(true)
    Taro.showLoading({ title: t('common.loading') })

    try {
      return await composePoster(buildSpec())
    } catch (error) {
      Taro.hideLoading()
      setBusy(false)
      Taro.showToast({
        title: error instanceof Error ? error.message : t('poster.exportFailed'),
        icon: 'none',
      })
      return null
    }
  }

  const saveToAlbum = async () => {
    const filePath = await compose()
    if (!filePath) return

    try {
      await savePathToAlbum(filePath)
      Taro.hideLoading()
      Taro.showToast({ title: t('poster.saved'), icon: 'none' })
    } catch (error) {
      Taro.hideLoading()
      await handleAlbumError(error)
    } finally {
      setBusy(false)
    }
  }

  const sharePoster = async () => {
    const filePath = await compose()
    if (!filePath) return

    const shareImageMenu = (
      Taro as unknown as {
        showShareImageMenu?: (options: { path: string; fail?: () => void }) => void
      }
    ).showShareImageMenu

    if (!shareImageMenu) {
      // 基础库不支持图片分享时，退回「保存到相册」，并说清楚发生了什么
      try {
        await savePathToAlbum(filePath)
        Taro.hideLoading()
        Taro.showToast({ title: t('poster.saved'), icon: 'none' })
      } catch (error) {
        Taro.hideLoading()
        await handleAlbumError(error)
      } finally {
        setBusy(false)
      }
      return
    }

    shareImageMenu({
      path: filePath,
      fail: () => {
        // 用户取消分享不算错误；只有真正失败才提示
        Taro.hideLoading()
        setBusy(false)
      },
    })

    // showShareImageMenu 没有 success 回调；关闭 loading 后由用户继续操作
    Taro.hideLoading()
    setBusy(false)
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
                  className={`w-full box-border p-3 rounded-2xl flex flex-col gap-2 ${
                    memory.mediaUrl ? 'bg-surface-container-lowest' : TONE_CLASS[memory.tone].photo
                  }`}
                >
                  {memory.mediaUrl ? (
                    <View className="relative w-full h-40 rounded-2xl overflow-hidden bg-surface-container">
                      <Image src={memory.mediaUrl} className="w-full h-full" mode="aspectFill" />
                      {toggles.face ? <FaceSticker /> : null}
                    </View>
                  ) : null}

                  <View className="self-start py-0.5 px-2 rounded-full bg-card">
                    <Text className="text-caption font-semibold text-on-surface">{memoryCategoryLabel(memory.category)}</Text>
                  </View>

                  <Text className="text-section-title text-on-surface">{memory.title}</Text>
                  <Text className="text-caption text-on-surface-variant">{memory.date}</Text>
                </View>
              ))
            ) : (
              <>
                <View className="relative w-full h-40 rounded-2xl overflow-hidden bg-surface-container flex items-center justify-center">
                  <Image src={babyAvatar} className="w-full h-full" mode="aspectFill" />
                  {toggles.face ? <FaceSticker /> : null}
                </View>

                <View className="self-start py-1 px-3 rounded-full bg-tertiary-fixed flex items-center gap-1">
                  <Icon name="fork_knife" className="w-3.5 h-3.5" />
                  <Text className="text-caption font-semibold text-on-tertiary-container">
                    {poster.badge}
                  </Text>
                </View>

                <Text className="text-page-title text-on-surface">{poster.heading}</Text>
                <Text className="text-sm text-on-surface-variant">{toggles.growth ? redactGrowthText(poster.body) : poster.body}</Text>
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
            className={`flex-1 py-4 rounded-full bg-surface-container-high flex items-center justify-center gap-2 ${
              busy ? 'opacity-60' : 'active:opacity-80'
            }`}
            onClick={saveToAlbum}
          >
            <Icon name="photo-gallery" className="w-5 h-5" />
            <Text className="text-card-title text-on-surface">{t('poster.saveToAlbum')}</Text>
          </View>

          {/* 分享的是合成后的海报图片，不是页面卡片 */}
          <View
            className={`flex-1 py-4 rounded-full bg-tertiary flex items-center justify-center gap-2 ${
              busy ? 'opacity-60' : 'active:opacity-80'
            }`}
            onClick={sharePoster}
          >
            <Text className="text-card-title text-[#ffffff]">{t('poster.shareToWechat')}</Text>
          </View>
        </View>
      </View>

      {/* 离屏画布：不参与布局，只用来合成要保存的那张图 */}
      <Canvas
        canvasId={POSTER_CANVAS_ID}
        className="fixed"
        style={{
          left: '-9999px',
          top: '0',
          width: `${POSTER_CANVAS_WIDTH}px`,
          height: `${POSTER_CANVAS_MAX_HEIGHT}px`,
        }}
      />
    </PageContainer>
  )
}
