import Taro from '@tarojs/taro'
import { t } from '@/i18n'
import { memoryCategoryLabel, type MemoryItem } from '@/pages/family/memories/memoriesData'

export const POSTER_CANVAS_ID = 'poster-canvas'
export const POSTER_CANVAS_WIDTH = 600
/** 离屏画布固定高度，导出时按实际内容高度裁剪 */
export const POSTER_CANVAS_MAX_HEIGHT = 4600

interface TemplateColors {
  bg: string
  title: string
  subtitle: string
  card: string
  text: string
  muted: string
  accent: string
}

const TEMPLATE_COLORS: Record<string, TemplateColors> = {
  warm: {
    bg: '#c9d4bd',
    title: '#ffffff',
    subtitle: '#ffffff',
    card: '#ffffff',
    text: '#1e1b17',
    muted: '#6f6760',
    accent: '#406651',
  },
  magazine: {
    bg: '#eee7df',
    title: '#1e1b17',
    subtitle: '#474741',
    card: '#ffffff',
    text: '#1e1b17',
    muted: '#6f6760',
    accent: '#765842',
  },
  timeline: {
    bg: '#f7fff7',
    title: '#406651',
    subtitle: '#557d66',
    card: '#ffffff',
    text: '#1e1b17',
    muted: '#6f6760',
    accent: '#406651',
  },
}

export interface PosterSpec {
  template: string
  title: string
  subtitle: string
  heading: string
  body: string
  meta: string
  badge: string
  /** 多选记忆；为空时画单张海报 */
  memories: MemoryItem[]
  /** 单张海报的占位图（没有真实照片时） */
  singleImage?: string
  hideGrowth: boolean
  faceSticker: boolean
}

const MARGIN = 40
const CARD_GAP = 20
const HEADER_HEIGHT = 150
const FOOTER_HEIGHT = 80
const SINGLE_CARD_HEIGHT = 470
const MEMORY_IMAGE_HEIGHT = 240
const MEMORY_CARD_IMAGE_HEIGHT = 420
const MEMORY_CARD_TEXT_HEIGHT = 170

/** 先算高度，导出时按这个高度裁剪画布 */
export function posterContentHeight(spec: PosterSpec): number {
  if (spec.memories.length === 0) {
    return HEADER_HEIGHT + SINGLE_CARD_HEIGHT + FOOTER_HEIGHT
  }
  const cards = spec.memories.reduce(
    (sum, memory) => sum + (memory.mediaUrl ? MEMORY_CARD_IMAGE_HEIGHT : MEMORY_CARD_TEXT_HEIGHT),
    0,
  )
  return HEADER_HEIGHT + cards + CARD_GAP * (spec.memories.length - 1) + FOOTER_HEIGHT
}

/** 生长数据脱敏：去掉测量数字，换成足迹提示 */
export function redactGrowthText(body: string): string {
  // 不依赖具体语言：凡是包含 kg/cm 测量数字的句子都去掉
  const stripped = body
    .replace(/[^。.\n]*\d+(?:\.\d+)?\s*(?:kg|cm)[^。.\n]*[。.]?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return `${stripped ? `${stripped} ` : ''}${t('poster.growthHidden')}`
}

function roundedRect(ctx: Taro.CanvasContext, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function textWidth(ctx: Taro.CanvasContext, text: string): number {
  const measured = ctx.measureText(text)
  return typeof measured === 'number' ? measured : measured.width
}

/** 按字符换行；中英文都能用，英文单词可能在中间断开，但海报标题都很短 */
function wrapText(
  ctx: Taro.CanvasContext,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = []
  let current = ''

  for (const char of text) {
    if (char === '\n') {
      lines.push(current)
      current = ''
      if (lines.length >= maxLines) break
      continue
    }
    const next = current + char
    if (textWidth(ctx, next) > maxWidth && current) {
      lines.push(current)
      current = char
      if (lines.length >= maxLines) break
    } else {
      current = next
    }
  }

  if (lines.length < maxLines && current) lines.push(current)
  return lines
}

/** 隐藏生长数据后，用一排小脚印代替数字 */
function drawFootprints(ctx: Taro.CanvasContext, startX: number, startY: number) {
  ctx.setFillStyle('rgba(64, 102, 81, 0.35)')

  for (let index = 0; index < 3; index++) {
    const x = startX + index * 36
    const y = startY + (index % 2) * 10

    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()

    for (const [dx, dy] of [[-8, -10], [0, -13], [8, -10]]) {
      ctx.beginPath()
      ctx.arc(x + dx, y + dy, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawSunglasses(ctx: Taro.CanvasContext, centerX: number, centerY: number, width: number) {
  const lensW = width * 0.34
  const lensH = lensW * 0.5
  const gap = width * 0.06
  const left = centerX - gap / 2 - lensW
  const right = centerX + gap / 2

  ctx.setFillStyle('rgba(30, 27, 23, 0.9)')
  roundedRect(ctx, left, centerY - lensH / 2, lensW, lensH, lensH * 0.35)
  ctx.fill()
  roundedRect(ctx, right, centerY - lensH / 2, lensW, lensH, lensH * 0.35)
  ctx.fill()

  ctx.setStrokeStyle('rgba(30, 27, 23, 0.9)')
  ctx.setLineWidth(4)
  ctx.beginPath()
  ctx.moveTo(left + lensW, centerY)
  ctx.lineTo(right, centerY)
  ctx.stroke()

  // 镜面高光
  ctx.setFillStyle('rgba(255, 255, 255, 0.35)')
  ctx.fillRect(left + lensW * 0.18, centerY - lensH * 0.22, lensW * 0.22, 4)
  ctx.fillRect(right + lensW * 0.18, centerY - lensH * 0.22, lensW * 0.22, 4)
}

function getImageInfo(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    Taro.getImageInfo({
      src,
      success: (result) => resolve(result.path),
      fail: () => resolve(null),
    })
  })
}

export async function composePoster(spec: PosterSpec): Promise<string> {
  if (typeof Taro.createCanvasContext !== 'function') {
    throw new Error(t('poster.unsupported'))
  }

  const W = POSTER_CANVAS_WIDTH
  const H = posterContentHeight(spec)
  const colors = TEMPLATE_COLORS[spec.template] ?? TEMPLATE_COLORS.warm
  const ctx = Taro.createCanvasContext(POSTER_CANVAS_ID)

  ctx.setFillStyle(colors.bg)
  ctx.fillRect(0, 0, W, H)

  // 标题区
  ctx.setTextAlign('center')
  ctx.setFillStyle(colors.title)
  ctx.setFontSize(30)
  wrapText(ctx, spec.title, W - MARGIN * 2, 2).forEach((line, index) => {
    ctx.fillText(line, W / 2, 54 + index * 38)
  })

  ctx.setFillStyle(colors.subtitle)
  ctx.setFontSize(12)
  ctx.fillText(spec.subtitle, W / 2, 118)

  let y = HEADER_HEIGHT
  const cardW = W - MARGIN * 2

  if (spec.memories.length > 0) {
    for (const memory of spec.memories) {
      const cardH = memory.mediaUrl ? MEMORY_CARD_IMAGE_HEIGHT : MEMORY_CARD_TEXT_HEIGHT
      ctx.setFillStyle(colors.card)
      roundedRect(ctx, MARGIN, y, cardW, cardH, 24)
      ctx.fill()

      let textTop = y + 24

      if (memory.mediaUrl) {
        const image = await getImageInfo(memory.mediaUrl)
        const imageX = MARGIN + 16
        const imageY = y + 16
        const imageW = cardW - 32

        if (image) {
          ctx.save()
          roundedRect(ctx, imageX, imageY, imageW, MEMORY_IMAGE_HEIGHT, 18)
          ctx.clip()
          ctx.drawImage(image, imageX, imageY, imageW, MEMORY_IMAGE_HEIGHT)
          ctx.restore()

          if (spec.faceSticker) {
            drawSunglasses(ctx, imageX + imageW / 2, imageY + MEMORY_IMAGE_HEIGHT * 0.32, imageW)
          }
        } else {
          ctx.setFillStyle('#f4ede5')
          roundedRect(ctx, imageX, imageY, imageW, MEMORY_IMAGE_HEIGHT, 18)
          ctx.fill()
        }
        textTop = imageY + MEMORY_IMAGE_HEIGHT + 24
      }

      // 分类角标
      ctx.setTextAlign('left')
      ctx.setFontSize(12)
      const category = memoryCategoryLabel(memory.category)
      const badgeW = Math.max(textWidth(ctx, category) + 26, 64)
      ctx.setFillStyle('#edf3e3')
      roundedRect(ctx, MARGIN + 16, textTop, badgeW, 26, 13)
      ctx.fill()
      ctx.setFillStyle('#5b7358')
      ctx.fillText(category, MARGIN + 16 + 13, textTop + 18)

      ctx.setFillStyle(colors.text)
      ctx.setFontSize(20)
      const titleLines = wrapText(ctx, memory.title, cardW - 32, 2)
      titleLines.forEach((line, index) => {
        ctx.fillText(line, MARGIN + 16, textTop + 58 + index * 28)
      })

      ctx.setFillStyle(colors.muted)
      ctx.setFontSize(12)
      ctx.fillText(memory.date, MARGIN + 16, textTop + 58 + titleLines.length * 28 + 12)

      y += cardH + CARD_GAP
    }
  } else {
    // 单张海报：占位图 + 徽标 + 标题 + 正文
    ctx.setFillStyle(colors.card)
    roundedRect(ctx, MARGIN, y, cardW, SINGLE_CARD_HEIGHT, 24)
    ctx.fill()

    const imageX = MARGIN + 16
    const imageY = y + 16
    const imageW = cardW - 32
    const imageH = 190

    if (spec.singleImage) {
      const image = await getImageInfo(spec.singleImage)
      if (image) {
        ctx.save()
        roundedRect(ctx, imageX, imageY, imageW, imageH, 18)
        ctx.clip()
        ctx.drawImage(image, imageX, imageY, imageW, imageH)
        ctx.restore()

        if (spec.faceSticker) {
          drawSunglasses(ctx, imageX + imageW / 2, imageY + imageH * 0.32, imageW)
        }
      }
    }

    ctx.setTextAlign('left')
    ctx.setFillStyle(colors.accent)
    ctx.setFontSize(12)
    ctx.fillText(spec.badge, imageX, imageY + imageH + 34)

    ctx.setFillStyle(colors.text)
    ctx.setFontSize(22)
    const headingLines = wrapText(ctx, spec.heading, imageW, 2)
    headingLines.forEach((line, index) => {
      ctx.fillText(line, imageX, imageY + imageH + 68 + index * 30)
    })

    const body = spec.hideGrowth ? redactGrowthText(spec.body) : spec.body
    ctx.setFillStyle(colors.muted)
    ctx.setFontSize(13)
    const bodyTop = imageY + imageH + 76 + headingLines.length * 30
    const bodyLines = wrapText(ctx, body, imageW, 5)
    bodyLines.forEach((line, index) => {
      ctx.fillText(line, imageX, bodyTop + index * 22)
    })

    if (spec.hideGrowth) {
      drawFootprints(ctx, imageX + 4, bodyTop + bodyLines.length * 22 + 18)
    }

    y += SINGLE_CARD_HEIGHT + CARD_GAP
  }

  // 页脚
  ctx.setStrokeStyle('rgba(0, 0, 0, 0.08)')
  ctx.setLineWidth(1)
  ctx.beginPath()
  ctx.moveTo(MARGIN, H - FOOTER_HEIGHT + 12)
  ctx.lineTo(W - MARGIN, H - FOOTER_HEIGHT + 12)
  ctx.stroke()

  ctx.setFillStyle(colors.muted)
  ctx.setFontSize(12)
  ctx.fillText(spec.meta, MARGIN, H - FOOTER_HEIGHT + 44)

  await new Promise<void>((resolve, reject) => {
    ctx.draw(false, () => resolve())
    // draw 没有 fail 回调；超时按失败处理，避免页面一直挂着 loading
    setTimeout(() => reject(new Error(t('poster.exportFailed'))), 4000)
  })

  return new Promise((resolve, reject) => {
    Taro.canvasToTempFilePath({
      canvasId: POSTER_CANVAS_ID,
      x: 0,
      y: 0,
      width: W,
      height: H,
      destWidth: W * 2,
      destHeight: H * 2,
      success: (result) => resolve(result.tempFilePath),
      fail: () => reject(new Error(t('poster.exportFailed'))),
    })
  })
}
