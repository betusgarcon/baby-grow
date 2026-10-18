import Taro from '@tarojs/taro'
import { messages, type MessageKey } from './messages'

/**
 * 国际化。
 *
 * 文案表见 `./messages.ts`：一条记录里中英并排，所以不会出现「只翻了一半」。
 * 键是符号（`journey.emptyTimeline`），这样同一个中文词在不同语境可以给不同英文，
 * 复数也能表达。
 */

export type Language = 'zh' | 'en'
export type { MessageKey }

const STORAGE_KEY = 'bg_language'

/** 默认中文。英文用户到「宝宝画像 → 通用设置」里切一次即可 */
const DEFAULT_LANGUAGE: Language = 'zh'

function readStored(): Language {
  try {
    return Taro.getStorageSync(STORAGE_KEY) === 'en' ? 'en' : DEFAULT_LANGUAGE
  } catch {
    // 存储不可用时退回默认语言，不阻断启动
    return DEFAULT_LANGUAGE
  }
}

let current: Language = readStored()

export const getLanguage = (): Language => current

/**
 * 取一条界面文案。
 *
 * @param key     `messages.ts` 里的符号键；拼错会在编译期报错
 * @param params  插值参数，模板里用 `{name}` 占位
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const entry = messages[key]
  // 理论上不可能 miss（key 有类型约束）。留兜底是为了万一有人绕过类型断言注入字符串，
  // 界面上显示键名比显示 undefined 更容易定位。
  const template = entry ? entry[current === 'en' ? 1 : 0] : key

  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] === undefined ? `{${name}}` : String(params[name]),
  )
}

/**
 * 切换语言，并**重载当前页**。
 *
 * 为什么不给每个页面加订阅：小程序里没有全局的响应式重渲染，逐个页面订阅既啰嗦
 * 又容易漏——漏掉的那一页会停在旧语言，而用户会以为「这一页没翻译」。
 * 重载一次代价很小，切换语言本来就是一次「整屏重来」的动作。
 *
 * 注意：reLaunch 会丢弃未保存的草稿，所以切换入口只放在设置区，
 * 不在编辑态页面提供。
 */
export function setLanguage(next: Language): void {
  if (next === current) {
    return
  }

  current = next
  try {
    Taro.setStorageSync(STORAGE_KEY, next)
  } catch {
    // 存储不可用时只在本次会话生效
  }

  Taro.reLaunch({ url: currentPageUrl() })
}

/** 还原当前页的路径与参数，供 reLaunch 回到原位 */
function currentPageUrl(): string {
  const fallback = '/pages/journey/index'

  try {
    const pages = Taro.getCurrentPages()
    const top = pages[pages.length - 1]
    const route = top?.route

    if (!route) {
      return fallback
    }

    const options = (top.options ?? {}) as Record<string, string>
    const query = Object.entries(options)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&')

    return query ? `/${route}?${query}` : `/${route}`
  } catch {
    return fallback
  }
}
