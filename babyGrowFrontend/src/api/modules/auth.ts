/**
 * 鉴权 API
 */

import { http } from '@/api/request'

export interface AuthMe {
  userId: number
  nickname: string | null
  avatarUrl: string | null
  familyId: number | null
  babyId: number | null
  role: string | null
}

export interface LoginResponse {
  token: string
  user: AuthMe
}

/** 用微信 code 换 JWT。后端 dev-mode 下不校验 code，传占位值也能登录。 */
export function login(code: string) {
  // skipAuthGate：登录是闸门等待的那件事，它自己必须绕过闸门
  return http.post<LoginResponse>('/api/auth/login', { code }, { skipAuthGate: true })
}

/** 当前登录态：属于哪个家庭、看哪个宝宝、什么角色 */
export function fetchMe() {
  return http.get<AuthMe>('/api/auth/me')
}
