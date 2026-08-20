/**
 * 统一请求封装
 * - 基于 Taro.request
 * - USE_MOCK=true 时拦截请求返回 Mock 数据
 * - USE_MOCK=false 时发起真实 HTTP 请求
 */

import Taro from '@tarojs/taro'
import { API_CONFIG } from './config'
import type { ApiResponse } from '@/types/common'

/** 请求方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** 请求选项 */
export interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: Record<string, unknown>
  headers?: Record<string, string>
}

/** Mock 处理器类型 */
export type MockHandler = (params: Record<string, unknown>) => unknown

/** Mock 路由注册表 */
const mockRoutes = new Map<string, MockHandler>()

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
  if (API_CONFIG.USE_MOCK) {
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
  const fullUrl = API_CONFIG.BASE_URL + url
  console.log(`[DATA: REAL] ${method} ${fullUrl}`)

  try {
    const response = await Taro.request({
      url: fullUrl,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
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

  post: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'POST', data }),

  put: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'PUT', data }),

  delete: <T>(url: string, data?: Record<string, unknown>) =>
    request<T>({ url, method: 'DELETE', data }),
}
