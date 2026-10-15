/**
 * 启动引导：配置后端地址，并确保有登录态。
 *
 * 这里刻意「失败即降级」——拿不到后端就在日志里说清楚，然后让整个前端退回 mock，
 * 而不是让每个页面各自抛错。开发时后端没起也能照常看页面。
 */

import Taro from '@tarojs/taro'
import { REAL_API_PATHS, setConfig } from './config'
import { setAuthGate, setReauthHandler } from './request'
import { login } from './modules/auth'
import { clearToken, getToken, setToken } from './token'

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

/**
 * 正在进行的登录。同时只允许一次。
 *
 * 启动时的静默登录与「401 之后的重登」走的是同一条路径，两者可能同时发生
 * （首屏一批请求同时撞 401）。不去重的话会发两次 Taro.login()、两次 POST /login，
 * 后端开出两个会话，后写入的 token 覆盖前一个。
 */
let loginInFlight: Promise<boolean> | null = null

/**
 * 真正去登录一次并落库 token。
 *
 * @returns 是否拿到了可用的 token。调用方据此决定要不要重试原请求——
 *          返回 false 一律按普通失败处理，不再重试，避免打转。
 */
async function performLogin(): Promise<boolean> {
  if (loginInFlight) {
    return loginInFlight
  }

  loginInFlight = (async () => {
    try {
      const response = await login(await resolveLoginCode())
      const token = response?.data?.token
      // 校验过再存：后端理论上不会回 {code:0, data:null}，但真回了的话
      // setToken(undefined) 会把存储写成空、登录态静默丢失，
      // 之后所有请求都带着空 token 发出去——比直接报「登录失败」难查得多。
      if (!token) {
        console.error('[AUTH] 登录响应里没有 token', response)
        return false
      }
      setToken(token)
      console.log('[AUTH] 已登录')
      return true
    } catch (error) {
      console.error('[AUTH] 登录失败', error)
      return false
    } finally {
      loginInFlight = null
    }
  })()

  return loginInFlight
}

/** 没有 token 时静默登录一次 */
async function ensureAuth(): Promise<void> {
  if (getToken()) return
  await performLogin()
}

/**
 * 登录态失效后的重登：先把废 token 丢掉再登。
 *
 * 不丢的话 performLogin 里的 getToken() 判断倒是无所谓（这里直接调它），
 * 但失败路径上留着废 token 会让后续请求继续以它发包、继续 401。
 */
async function reauthenticate(): Promise<boolean> {
  clearToken()
  return performLogin()
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
    // 这个分支很危险：它会静默地把整个前端变成「有内容但点了没反应」的演示态，
    // 看起来像后端没写好。所以除了日志还弹一次提示，让配置问题一眼可见。
    console.error(
      '[API] 未配置 TARO_APP_API_BASE_URL，全部接口走本地 mock。' +
        '检查 .env.development / .env.production —— 注意 npm run build:weapp（不带 --watch）读的是后者。',
    )
    Taro.showToast({ title: '未配置后端地址，正在使用本地演示数据', icon: 'none', duration: 3000 })
    return
  }

  // 先把「401 之后怎么重登」告诉请求层。必须在首个请求之前注册：
  // 晚一步的话，启动那一刻就撞上 401 的请求拿不到恢复路径。
  setReauthHandler(reauthenticate)

  try {
    // 先同步把闸门挂上，再 await。页面在 onLaunch 返回后就会取数，
    // 晚一步挂上，首屏那批请求就又把 token 漏掉了。
    const gate = ensureAuth()
    setAuthGate(gate)
    await gate
  } catch (error) {
    // 登录失败不阻断启动：页面会各自进入错误态并给出重试入口。
    // （performLogin 内部已经吞掉异常并返回 false，这里是兜住意外。）
    console.error('[AUTH] 登录失败，接口将返回未登录错误', error)
  }
}
