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
import { getBabyProfile } from '@/api/modules/baby'
import type { BabyProfileSummary } from '@/types/analysis'
import type { GetMoodCalendarResponse, GetMoodCheckinOptionsResponse } from '@/types/mood'

const BABY_ID = 'baby-001'

export default function AnalysisMoodPage() {
  const [profile, setProfile] = useState<BabyProfileSummary | null>(null)
  const [calendarData, setCalendarData] = useState<GetMoodCalendarResponse | null>(null)
  const [checkinData, setCheckinData] = useState<GetMoodCheckinOptionsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getBabyProfile(),
      getMoodCalendar(BABY_ID),
      getMoodCheckinOptions(),
    ])
      .then(([profileRes, calendarRes, checkinRes]) => {
        const p = profileRes.data.profile
        setProfile({
          name: p.name,
          ageLabel: p.ageLabel,
          avatar: p.avatar,
          statusLabel: p.statusLabel || '',
        })
        setCalendarData(calendarRes.data)
        setCheckinData(checkinRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !profile || !calendarData || !checkinData) {
    return <View><Text>Loading...</Text></View>
  }

  return (
    <AnalysisLayout profile={profile} activeCategory="mood">
      <InsightCard data={calendarData.insight} />
      <MoodCalendarCard days={calendarData.days} legends={calendarData.legends} />
      <MoodJournalCard />
      <MoodCheckinCard options={checkinData.options} />
    </AnalysisLayout>
  )
}