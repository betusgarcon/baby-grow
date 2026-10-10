/**
 * 启动引导：配置后端地址，并确保有登录态。
 *
 * 这里刻意「失败即降级」——拿不到后端就在日志里说清楚，然后让整个前端退回 mock，
 * 而不是让每个页面各自抛错。开发时后端没起也能照常看页面。
 */

import Taro from '@tarojs/taro'
import { REAL_API_PATHS, setConfig } from './config'
import { login } from './modules/auth'
import { getToken, setToken } from './token'

/** H5 等没有微信登录能力的环境用的占位 code；后端 dev-mode 下不校验其值 */
const PLACEHOLDER_CODE = 'dev-placeholder'

async function resolveLoginCode(): Promise<string> {
  try {
    const result = await Taro.login()
    return result.code || PLACEHOLDER_CODE
  } catch {
    return PLACEHOLDER_CODE
  }
}

/** 没有 token 时静默登录一次 */
async function ensureAuth(): Promise<void> {
  if (getToken()) return

  const response = await login(await resolveLoginCode())
  setToken(response.data.token)
  console.log('[AUTH] 已登录')
}

export async function bootstrapApi(): Promise<void> {
  const baseUrl = process.env.TARO_APP_API_BASE_URL || ''

  // 没配后端地址时，realPaths 必须为空——否则请求会打到相对路径上，失败得毫无头绪
  setConfig({
    baseUrl,
    useMock: true,
    realPaths: baseUrl ? [...REAL_API_PATHS] : [],
  })

  if (!baseUrl) {
    console.warn('[API] 未配置 TARO_APP_API_BASE_URL，全部接口走本地 mock')
    return
  }

  try {
    await ensureAuth()
  } catch (error) {
    // 登录失败不阻断启动：页面会各自进入错误态并给出重试入口
    console.error('[AUTH] 登录失败，接口将返回未登录错误', error)
  }
}
