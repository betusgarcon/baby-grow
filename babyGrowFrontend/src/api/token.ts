/**
 * 登录态存取。
 *
 * 只放一个 access token；用户、家庭、宝宝等信息一律由 /api/auth/me 现取，
 * 不在本地缓存一份会过期的副本。
 */

import Taro from '@tarojs/taro'

const TOKEN_KEY = 'bg_access_token'

export function getToken(): string {
  try {
    return Taro.getStorageSync(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token: string) {
  Taro.setStorageSync(TOKEN_KEY, token)
}

export function clearToken() {
  try {
    Taro.removeStorageSync(TOKEN_KEY)
  } catch {
    // 存储不可用时忽略：下次请求自然会被判为未登录
  }
}
