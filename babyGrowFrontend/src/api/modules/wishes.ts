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

/**
 * 重新生成头图。
 *
 * 头图在新建心愿时已自动排队生成，这个接口是显式重做——用于生成失败后重试，
 * 或单纯想换一张。返回的心愿已是 pending 状态，可直接覆盖本地。
 */
export function regenerateWishCover(id: string) {
  return http.post<Wish>('/api/wishes/cover', { id })
}
