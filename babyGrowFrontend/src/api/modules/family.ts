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
