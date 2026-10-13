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
