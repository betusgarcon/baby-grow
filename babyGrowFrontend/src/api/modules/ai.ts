/**
 * AI 能力 API
 * - 文本 / 图片的成长记录识别
 * - 食谱 RAG 推荐
 *
 * 注意：请求体里**不再有 baby_id 与月龄**。宝宝由服务端从登录态解析，
 * 客户端既不需要知道内部 id，也无法伪造别的宝宝。
 */

import { http } from '@/api/request'
import type { JourneyEntry } from '@/store/timeline'

/** 识别出的结构化内容，与后端 ExtractionResult 对齐（snake_case 来自 AI 服务） */
export interface ExtractResult {
  milestones?: Array<{ type: string; event: string; is_first: boolean }>
  food?: Array<{ name: string; category: string; is_first: boolean }>
  milk?: Array<{ type: string; amount_ml?: number; period?: string }>
  sleep?: Array<{ duration_min?: number; quality?: string; note?: string }>
  mood?: Array<{ mood?: string; trigger?: string }>
  growth?: Array<{ height_cm?: number; weight_kg?: number; head_cm?: number }>
  summary?: string
}

export interface ExtractRecordResponse {
  status: string
  data?: ExtractResult
  raw_text?: string
  confidence?: number
  model_name?: string
  elapsed_ms?: number
  error?: string
}

export interface RecognizeResponse {
  taskId: number
  status: string
}

export interface AiTaskResponse {
  taskId: number
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  /** 成功前为 null */
  result: ExtractRecordResponse | null
  error?: string | null
}

export interface CommitRecordPayload {
  source?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'MANUAL'
  mediaId?: number
  taskId?: number
  /** ISO-8601 时刻；缺省用服务端当前时间 */
  occurredAt?: string
  text?: string
  title?: string
  description?: string
  milestones?: ExtractResult['milestones']
  food?: ExtractResult['food']
  milk?: ExtractResult['milk']
  sleep?: ExtractResult['sleep']
  mood?: ExtractResult['mood']
  /** 注意是 camelCase：落库接口用前端命名，AI 返回的是 snake_case，在调用处转换 */
  growth?: Array<{ heightCm?: number; weightKg?: number; headCm?: number }>
}

/** 文本识别：同步，预期 5s 内返回 */
export function extractRecordText(text: string) {
  return http.post<ExtractRecordResponse>('/api/baby/records/extract', { text })
}

/** 提交图片/视频识别：立即返回 taskId，需轮询 */
export function recognizeMedia(params: { sourceType: 'IMAGE' | 'VIDEO'; mediaId: number; note?: string }) {
  return http.post<RecognizeResponse>('/api/baby/records/recognize', { ...params })
}

export function pollAiTask(taskId: number) {
  return http.get<AiTaskResponse>(`/api/baby/ai-tasks/${taskId}`)
}

/** 用户确认后落库，返回生成的时间线条目 */
export function commitRecord(payload: CommitRecordPayload) {
  return http.post<JourneyEntry>('/api/baby/records/commit', { ...payload })
}

export interface RecommendRecipeParams {
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

/** 食谱推荐 */
export function recommendRecipes(params: RecommendRecipeParams) {
  return http.post<RecommendRecipeResponse>('/api/baby/recipes/recommend', { ...params })
}
