/**
 * 睡眠分析 API
 * 页面只调用这些函数，不直接访问 mock
 */

import { http } from '@/api/request'
import type {
  GetSleepCircadianResponse,
  GetDailySleepLogsResponse,
  GetSleepEvolutionResponse,
  AddSleepLogResponse,
  AddSleepLogParams,
} from '@/types/sleep'

/** 获取昼夜节律摘要（宝宝由登录态解析，不传 id） */
export function getSleepCircadian(date?: string) {
  return http.get<GetSleepCircadianResponse>('/api/baby/sleep/circadian', { date })
}

/** 获取每日睡眠日志 */
export function getDailySleepLogs(date?: string) {
  return http.get<GetDailySleepLogsResponse>('/api/baby/sleep/logs', { date })
}

/** 获取睡眠演变数据（月度对比） */
export function getSleepEvolution(months?: number[]) {
  return http.get<GetSleepEvolutionResponse>('/api/baby/sleep/evolution', { months })
}

/** 新增睡眠日志 */
export function addSleepLog(params: AddSleepLogParams) {
  return http.post<AddSleepLogResponse>('/api/baby/sleep/logs', { ...params })
}
