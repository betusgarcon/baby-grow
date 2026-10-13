import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  InsightCard,
  MoodCalendarCard,
  MoodCheckinCard,
  MoodJournalCard,
} from '@/pages/analysis/components/AnalysisCards'
import { getMoodCalendar, getMoodCheckinOptions } from '@/api/modules/mood'
import type { GetMoodCalendarResponse, GetMoodCheckinOptionsResponse } from '@/types/mood'

/**
 * 把单个请求包成「永不 reject」的结果，供 Promise.all 使用。
 *
 * 不用 Promise.allSettled 是因为它在小程序端要靠 polyfill，而这里凡是
 * 「多个互不依赖的请求」都该按这个方式组合：任一失败只丢自己那块数据，
 * 不该把整页拽停在 Loading。
 */
const settled = <T,>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ ok: true as const, value }),
    () => ({ ok: false as const }),
  )

export default function AnalysisMoodPage() {
  const [calendarData, setCalendarData] = useState<GetMoodCalendarResponse | null>(null)
  const [checkinData, setCheckinData] = useState<GetMoodCheckinOptionsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 此前这里是 Promise.all：只要 calendar 挂了（它当时确实在 400），
    // .then 整体跳过，两个 state 一直是 null，页面就永远停在 Loading——
    // 这是「点 Mood tab 进来一片空白」的直接原因。
    Promise.all([settled(getMoodCalendar()), settled(getMoodCheckinOptions())])
      .then(([calendarRes, checkinRes]) => {
        if (calendarRes.ok) setCalendarData(calendarRes.value.data)
        if (checkinRes.ok) setCheckinData(checkinRes.value.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <View><Text>Loading...</Text></View>
  }

  if (!calendarData || !checkinData) {
    return (
      <AnalysisLayout activeCategory="mood">
        <View className="w-full py-16 flex flex-col items-center gap-2">
          <Text className="text-base text-on-surface-variant">情绪数据暂时取不到</Text>
          <Text className="text-sm text-on-surface-variant">
            退出这一页再进来会重新加载一次
          </Text>
        </View>
      </AnalysisLayout>
    )
  }

  return (
    <AnalysisLayout activeCategory="mood">
      <InsightCard data={calendarData.insight} />
      <MoodCalendarCard days={calendarData.days} legends={calendarData.legends} />
      <MoodJournalCard />
      <MoodCheckinCard options={checkinData.options} />
    </AnalysisLayout>
  )
}