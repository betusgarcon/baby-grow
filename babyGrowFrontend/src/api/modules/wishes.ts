/**
 * 心愿清单 API
 */

import { http } from '@/api/request'
import type { Wish, WishChecklistItem } from '@/store/wishes'

export function getWishes() {
  return http.get<Wish[]>('/api/wishes')
}

export function createWish(wish: Wish) {
  return http.post<Wish>('/api/wishes', { ...wish })
}

export function removeWish(id: string) {
  return http.delete<{ id: string }>('/api/wishes', { id })
}

export function updateWishChecklist(id: string, checklist: WishChecklistItem[]) {
  return http.put<Wish>('/api/wishes/checklist', { id, checklist })
}

export function updateWishCounter(id: string, current: number) {
  return http.put<Wish>('/api/wishes/counter', { id, current })
}
