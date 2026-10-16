/**
 * 家庭分享 API
 */

import { http } from '@/api/request'
import type { FamilyMember, FamilyRole } from '@/store/family'

export function getFamilyMembers() {
  return http.get<FamilyMember[]>('/api/family/members')
}

export function updateMemberRole(id: string, role: FamilyRole) {
  return http.put<FamilyMember>('/api/family/members', { id, role })
}

export function removeFamilyMember(id: string) {
  return http.delete<{ id: string }>('/api/family/members', { id })
}

export function inviteFamilyMember(name: string, role: FamilyRole) {
  return http.post<FamilyMember>('/api/family/invite', { name, role })
}

/**
 * 创建家庭（连同宝宝档案）。
 *
 * 没有家庭的新用户走这条路。此前家庭是在登录时由服务端自动建好的，现在创建是一个
 * 显式动作——用户在这一步第一次给档案命名。生日选填，但它是月龄相关建议的输入。
 */
export function createFamily(babyName: string, birthday?: string) {
  return http.post<{ familyId: number; babyId: number }>('/api/family', { babyName, birthday })
}

/** 受邀者凭一次性口令加入家庭 */
export function acceptInvite(code: string) {
  return http.post<{ familyId: number; role: string }>('/api/family/invite/accept', { code })
}

/** 分享海报：内容由后端按宝宝档案与最近一条记录推导 */
export interface PosterData {
  title: string
  subtitle: string
  badge: string
  heading: string
  body: string
  meta: string
  templates?: Array<{ key: string; label: string; icon: string }>
  toggles?: Array<{ key: string; label: string; note: string; defaultOn: boolean }>
}

export function getPoster() {
  return http.get<PosterData>('/api/family/poster')
}
