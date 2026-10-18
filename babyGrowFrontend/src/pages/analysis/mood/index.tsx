import AnalysisLayout from '@/pages/analysis/components/AnalysisLayout'
import {
  InsightCard,
  MoodCalendarCard,
  MoodCheckinCard,
} from '@/pages/analysis/components/AnalysisCards'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getMoodCalendar, getMoodCheckinOptions } from '@/api/modules/mood'
import { t } from '@/i18n'

export default function AnalysisMoodPage() {
  // 两个请求**各自独立**取数、各自独立失败。
  //
  // 这一页曾经用 Promise.all 合并：calendar 一挂（它当时确实在返 400），.then 整体跳过、
  // 两个 state 一直是 null，页面就永远停在 Loading —— 也就是「点 Mood tab 进来一片空白」
  // 的直接原因。分开之后任一失败只影响自己那一块，并且各自带重试入口。
  const calendar = useAsyncData(getMoodCalendar)
  const checkin = useAsyncData(getMoodCheckinOptions)

  return (
    <AnalysisLayout activeCategory="mood">
      <AsyncSection
        status={calendar.status}
        onRetry={calendar.retry}
        skeletonBlocks={2}
        skeletonHeight={160}
        isEmpty={calendar.data?.hasData === false}
        emptyState={
          <EmptyState
            icon="star"
            title={t('analysis.mood.empty')}
            description={t('analysis.mood.emptyDesc')}
          />
        }
      >
        {calendar.data ? (
          <>
            <InsightCard data={calendar.data.insight} />
            <MoodCalendarCard days={calendar.data.days} legends={calendar.data.legends} />
          </>
        ) : null}
      </AsyncSection>

      <AsyncSection
        status={checkin.status}
        onRetry={checkin.retry}
        skeletonBlocks={1}
        skeletonHeight={120}
      >
        {checkin.data ? (
          // 打卡写完之后重新取一次日历，否则刚记的那天不会立刻出现在格子里
          <MoodCheckinCard options={checkin.data.options} onSaved={calendar.retry} />
        ) : null}
      </AsyncSection>
    </AnalysisLayout>
  )
}
