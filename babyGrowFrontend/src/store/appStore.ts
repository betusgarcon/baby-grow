import { createStore, useStoreState } from './createStore'
import {
  buildTimelineEntryFromRecord,
  initialTimeline,
  type JourneyEntry,
} from './timeline'

/**
 * 应用级状态。
 *
 * 目前只放了时间线：记录弹层保存的新条目要立刻出现在旅程时间线上，
 * 这是「记录 → 回看」这条核心链路的闭环。
 *
 * 其余可编辑数据（宝宝画像、家庭成员、心愿进度）尚未迁进来——它们的改动
 * 目前一退出页面就还原，属于已知缺口，迁移方式与这里一致。
 */
export interface AppState {
  timeline: JourneyEntry[]
}

export const appStore = createStore<AppState>({ timeline: initialTimeline })

export const useAppState = () => useStoreState(appStore)

export const appendTimelineEntry = (entry: JourneyEntry) => {
  appStore.set((previous) => ({ ...previous, timeline: [entry, ...previous.timeline] }))
}

/** 由记录弹层的结果构造并写入一条时间线条目，返回新条目 */
export const saveRecordToTimeline = (params: {
  title: string
  summary: string
  text: string
  photo: string | null
}) => {
  const entry = buildTimelineEntryFromRecord(params)

  appendTimelineEntry(entry)

  return entry
}
