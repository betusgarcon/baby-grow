/**
 * AI 能力 API
 * - 文本智能提取
 * - 食谱 RAG 推荐
 */

import { http } from '@/api/request'

export interface ExtractRecordParams {
  baby_id: string
  baby_age_months: number
  text: string
  source_type?: 'TEXT' | 'IMAGE' | 'VIDEO'
}

export interface ExtractRecordResponse {
  status: string
  data?: {
    milestones?: Array<{ type: string; event: string; is_first: boolean }>
    food?: Array<{ name: string; category: string; is_first: boolean }>
    milk?: Array<{ type: string; amount_ml: number; period?: string }>
    sleep?: Array<{ duration_min?: number; quality?: string; note?: string }>
    mood?: Array<{ mood?: string; trigger?: string }>
    summary?: string
  }
  raw_text?: string
  confidence?: number
  model_name?: string
  elapsed_ms?: number
  error?: string
}

export interface RecommendRecipeParams {
  baby_id: string
  baby_age_months: number
  query: string
  allergens?: string[]
  liked_foods?: string[]
  disliked_foods?: string[]
  texture_level?: string
}

export interface RecommendRecipeResponse {
  status: string
  recommendation_id?: number
  summary: string
  items: Array<{
    mealType?: string
    dishName: string
    reason?: string
    ingredients?: string[]
    instructions?: string
  }>
  avoid_items: string[]
  reason?: string
  confidence?: number
  model_name?: string
  elapsed_ms?: number
  error?: string
}

/** 文本智能提取 */
export function extractRecordText(params: ExtractRecordParams) {
  return http.post<ExtractRecordResponse>('/api/baby/records/extract', params)
}

/** 食谱推荐 */
export function recommendRecipes(params: RecommendRecipeParams) {
  return http.post<RecommendRecipeResponse>('/api/baby/recipes/recommend', params)
}
