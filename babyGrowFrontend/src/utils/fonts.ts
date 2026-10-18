import Taro from '@tarojs/taro'
import { getConfig } from '@/api/config'

/**
 * 界面字体加载。
 *
 * 字体文件由后端静态路由 `/fonts/**` 提供，与 API 同域（生产是
 * `https://api.subetus.top/babygrow/fonts/...`）。微信要求 `loadFontFace`
 * 的地址是 https，并且域名要加进小程序的 **downloadFile 合法域名**。
 *
 * 加载失败不报错也不阻塞：排版在系统字体下仍然完整，字体只影响观感。
 */
type LoadFontFaceOptions = {
  global?: boolean
  family: string
  source: string
  desc?: { style?: string; weight?: string; variant?: string }
  scopes?: Array<'webview' | 'native'>
  success?: () => void
  fail?: () => void
}

type LoadFontFace = (options: LoadFontFaceOptions) => void

const NUMERIC_FAMILY = 'Plus Jakarta Sans'
const DISPLAY_FAMILY = 'ZCOOL QingKe HuangYou'

/** 数字/英文：400 用于正文里的数值，600 用于指标，700 保留给海报等重强调 */
const NUMERIC_FILES = [
  { file: 'plus-jakarta-sans-400.woff2', weight: '400' },
  { file: 'plus-jakarta-sans-600.woff2', weight: '600' },
  { file: 'plus-jakarta-sans-700.woff2', weight: '700' },
]

function fontBaseUrl(): string {
  const configured = process.env.TARO_APP_FONT_BASE_URL
  const base = configured || getConfig().baseUrl
  return base ? base.replace(/\/+$/, '') : ''
}

function loadFontFace(options: LoadFontFaceOptions): void {
  const api = (Taro as unknown as { loadFontFace?: LoadFontFace }).loadFontFace
  if (api) {
    api(options)
  }
}

/** 只在微信小程序里加载；H5 预览没有这个 API，也不该跨域拉字体 */
export function loadAppFonts(): void {
  if (process.env.TARO_ENV !== 'weapp') return

  const base = fontBaseUrl()
  if (!base) return

  for (const { file, weight } of NUMERIC_FILES) {
    loadFontFace({
      global: true,
      family: NUMERIC_FAMILY,
      source: `url("${base}/fonts/${file}")`,
      desc: { weight },
      scopes: ['webview', 'native'],
      fail: () => undefined,
    })
  }

  // 单字重的展示字体，只用于页面主标题，别套到正文上
  loadFontFace({
    global: true,
    family: DISPLAY_FAMILY,
    source: `url("${base}/fonts/zcool-qingke-huangyou-display.woff2")`,
    // 与页面主标题的 600 对齐，避免浏览器做伪粗体
    desc: { weight: '600' },
    scopes: ['webview', 'native'],
    fail: () => undefined,
  })
}
