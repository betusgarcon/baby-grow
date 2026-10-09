/**
 * 事件详情（疫苗）API
 */

import { http } from '@/api/request'
import type { VaccineDetail } from '@/store/vaccine'

export function getVaccineDetail() {
  return http.get<VaccineDetail>('/api/baby/vaccine')
}

export function updateVaccineDetail(patch: Partial<VaccineDetail>) {
  return http.put<VaccineDetail>('/api/baby/vaccine', { ...patch })
}

export function deleteVaccineDetail() {
  return http.delete<{ ok: true }>('/api/baby/vaccine')
}
