/**
 * 统一请求封装
 * - 基于 Taro.request
 * - 命中 mock 白名单时拦截请求返回 Mock 数据
 * - 否则发起真实 HTTP 请求，并自动带上登录态
 */

import Taro from '@tarojs/taro'
import { API_CONFIG, shouldUseMock } from './config'
import { getToken } from './token'
import type { ApiResponse } from '@/types/common'

/** 请求方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** 请求选项 */
export interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: Record<string, unknown>
  headers?: Record<string, string>
  /**
   * 跳过登录闸门。**登录请求自身必须置为 true**：
   * 闸门等的就是登录落地，登录请求若也去等它，就是自己等自己，永久挂起。
   */
  skipAuthGate?: boolean
  /**
   * 内部使用：这次请求是不是「401 之后重登再试」的那一次。
   * 用来保证最多只重试一次——否则后端一直回 401 时会变成无限重试。
   */
  retriedAfterReauth?: boolean
}

/** Mock 处理器类型 */
export type MockHandler = (params: Record<string, unknown>) => unknown

/** Mock 路由注册表 */
const mockRoutes = new Map<string, MockHandler>()

/**
 * 登录闸门。
 *
 * 启动时的静默登录是异步的，而页面在 App 的 onLaunch 之后立刻就会取数。
 * 不等这一步，页面就会抢在 token 落库之前把请求发出去，后端一律判未登录——
 * 表现是「接口全 401、页面全空、但 Network 里能看到请求确实发了」。
 *
 * 由 bootstrap 在发起登录时同步塞入，请求侧在发真实请求前 await。
 * 放这里而不是放进 bootstrap，是为了避开 request → bootstrap → auth → request 的循环依赖。
 */
let authGate: Promise<void> | null = null

export function setAuthGate(gate: Promise<void> | null) {
  authGate = gate
}

/**
 * 「重新登录」钩子。
 *
 * 为什么是注册进来的回调、而不是直接 import 登录模块：登录请求自身也要走
 * request()，request 再 import 登录模块就成环了（request → auth → request）。
 * 与上面的 authGate 完全同一个理由、同一种做法。
 *
 * 返回值表示重登是否成功；失败时调用方按普通错误处理，不重试。
 */
type ReauthHandler = () => Promise<boolean>

let reauthHandler: ReauthHandler | null = null

export function setReauthHandler(handler: ReauthHandler | null) {
  reauthHandler = handler
}

/** 后端「未登录或登录已过期」的业务码，对应 ErrorCode.UNAUTHORIZED */
const UNAUTHORIZED_CODE = 40100

export { UNAUTHORIZED_CODE }

/**
 * 等登录落地。
 *
 * 给**不走 request()** 的调用点用——目前只有 media.ts 的 Taro.uploadFile 那条
 * multipart 路径：它绕开了 request() 里的闸门，冷启动时会抢在 token 落库之前
 * 把请求发出去，结果就是「图片上传失败，而其它接口都正常」。
 */
export async function awaitAuthGate(): Promise<void> {
  if (!authGate) return
  try {
    await authGate
  } catch {
    // 登录失败不阻断：照常发出，由后端判未登录
  }
}

/** 用与 request() 相同的路径重登一次。返回值表示是否成功。 */
export async function tryReauthenticate(): Promise<boolean> {
  return reauthHandler ? reauthHandler() : false
}

/** 注册 Mock 路由（供 mock/index.ts 调用） */
export const registerMock = (path: string, handler: MockHandler) => {
  mockRoutes.set(path, handler)
}

/** 清空所有 Mock 路由 */
export const clearMock = () => {
  mockRoutes.clear()
}

/** 生成 Mock 响应 */
function buildMockResponse<T>(data: T, code = 0, message = 'ok'): ApiResponse<T> {
  return { code, data, message }
}

/** 统一请求函数 */
export async function request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  const { url, method = 'GET', data, headers } = options

  // === Mock 模式：拦截请求 ===
  if (shouldUseMock(url)) {
    const handler = mockRoutes.get(url)

    if (handler) {
      console.log(`[DATA: MOCK] ${method} ${url}`)
      const mockData = handler(data || {})
      return buildMockResponse<T>(mockData as T)
    }

    // 未注册的路由，返回空数据
    console.warn(`[DATA: MOCK] No mock handler for ${url}`)
    return buildMockResponse<T>({} as T, -1, 'No mock data')
  }

  // === 真实请求 ===
  // 先等登录落地，否则页面首屏取数会带着空 token 发出去，后端一律回 401。
  // 登录请求自己跳过这一步——否则它等的是自己，直接死锁。
  if (authGate && !options.skipAuthGate) {
    try {
      await authGate
    } catch {
      // 登录失败不阻断请求：照常发出，由后端返回未登录，页面各自进入错误态
    }
  }

  const fullUrl = API_CONFIG.BASE_URL + url
  const token = getToken()
  console.log(`[DATA: REAL] ${method} ${fullUrl}`)

  // 丢掉值为 undefined 的查询参数。
  // 留着它们会被序列化成字面量 "undefined" 塞进 URL（`?weekStart=undefined`），
  // 后端按 Integer 之类绑定时直接 400——Mood 页整页空白就是这么来的。
  // 根因修在这里，而不是在每个调用点各判断一次。
  const query = data
    ? Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined))
    : undefined

  try {
    const response = await Taro.request({
      url: fullUrl,
      method,
      data: query,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      timeout: API_CONFIG.TIMEOUT,
    })

    // Taro.request 返回的是完整响应，需要解包
    const resData = response.data as ApiResponse<T>

    if (resData.code !== 0) {
      // 登录态失效时恢复一次。
      //
      // 此前全站没有任何恢复路径：clearToken() 定义了却**零调用**，于是 token 一旦
      // 过期（或后端换了密钥），每个接口都回 401、每页都进错误态，而「重试」重发的
      // 还是同一个废 token——用户永久卡死。这里的处理是：丢掉废 token、重新静默登录、
      // 把原请求原样重发一次。
      //
      // 只重发一次（retriedAfterReauth），否则后端持续 401 时会变成无限循环。
      // 登录请求自己跳过（skipAuthGate），它不可能是「需要重登」的那种请求。
      if (
        resData.code === UNAUTHORIZED_CODE &&
        !options.skipAuthGate &&
        !options.retriedAfterReauth &&
        reauthHandler
      ) {
        console.warn(`[DATA: REAL] 登录态已失效，重新登录后重试一次：${url}`)
        const reauthenticated = await reauthHandler()
        if (reauthenticated) {
          return request<T>({ ...options, retriedAfterReauth: true })
        }
      }

      throw new Error(resData.message || '请求失败')
    }

    return resData
  } catch (error) {
    console.error(`[DATA: REAL] Request failed: ${fullUrl}`, error)
    throw error
  }
}

/** 快捷方法 */
export const http = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    request<T>({ url, method: 'GET', data: params }),

  post: <T>(url: string, data?: Record<string, unknown>, options?: Pick<RequestOptions, 'skipAuthGate'>) =>
    request<T>({ url, method: 'POST', data, ...options }),

  put: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PUT', data }),

  delete: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'DELETE', data }),
}
