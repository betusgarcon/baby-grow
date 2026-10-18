/**
 * 宝宝画像 API
 */

import { http } from '@/api/request'
import type { ProfileState } from '@/store/appStore'

export function getProfile() {
  return http.get<ProfileState>('/api/baby/profile-detail')
}

export function updateProfile(patch: Partial<ProfileState>) {
  return http.put<ProfileState>('/api/baby/profile-detail', { ...patch })
}

/**
 * 设置 / 清除头像。传空串表示清除，回落到默认头像。
 *
 * 头像走两步：先用 `uploadMedia` 把图传上去拿到 URL，再把这个 URL 记到档案上。
 * 后端只接受「当前用户自己上传过」的 URL（会反查 media_assets 校验归属），
 * 所以这两步的顺序不能反。
 */
export function updateProfileAvatar(avatarUrl: string) {
  return http.put<ProfileState>('/api/baby/profile-detail', { avatarUrl })
}
