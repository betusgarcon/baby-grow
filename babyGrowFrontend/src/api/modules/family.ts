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
