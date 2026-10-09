import { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import CalendarGrid from './components/CalendarGrid'
import HighlightCard from './components/HighlightCard'
import {
  buildMonthGrid,
  calendarEvents,
  eventsForDate,
  formatDayHeading,
  formatMonthLabel,
  toIsoDate,
} from './calendarData'

const INITIAL_YEAR = 2023
const INITIAL_MONTH = 10
const INITIAL_DATE = '2023-10-10'

export default function JourneyCalendarPage() {
  const [year, setYear] = useState(INITIAL_YEAR)
  const [month, setMonth] = useState(INITIAL_MONTH)
  const [selectedDate, setSelectedDate] = useState(INITIAL_DATE)

  const cells = useMemo(
    () => buildMonthGrid(year, month, selectedDate, calendarEvents),
    [year, month, selectedDate],
  )

  const dayEvents = useMemo(() => eventsForDate(calendarEvents, selectedDate), [selectedDate])

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1)
    const nextYear = next.getFullYear()
    const nextMonth = next.getMonth() + 1

    setYear(nextYear)
    setMonth(nextMonth)
    // 换月后把选中日期落到该月 1 号，避免停在一个不存在的日期上
    setSelectedDate(toIsoDate(nextYear, nextMonth, 1))
  }

  return (
    <PageContainer
      background="bg-surface-container-lowest"
      header={
        <PageHeader
          showBack
          title="Journey"
          right={<Icon name="calendar" className="w-5 h-5" style={{ opacity: 0.3 }} />}
        />
      }
    >
      <View className="flex flex-col gap-6">
        <View className="w-full box-border py-4 px-6 rounded-full bg-surface-container-low border border-outline-variant flex items-center justify-between">
          <View className="p-2 active:opacity-60" onClick={() => shiftMonth(-1)}>
            <Icon name="chevron-right" className="w-2 h-3" style={{ transform: 'rotate(180deg)' }} />
          </View>

          <Text className="text-xl font-semibold text-on-surface">{formatMonthLabel(year, month)}</Text>

          <View className="p-2 active:opacity-60" onClick={() => shiftMonth(1)}>
            <Icon name="chevron-right" className="w-2 h-3" />
          </View>
        </View>

        <CalendarGrid cells={cells} onSelectDate={setSelectedDate} />

        <View className="flex flex-col gap-3">
          <Text
            className="text-sm font-semibold text-on-surface-variant px-1"
            style={{ letterSpacing: '0.06em' }}
          >
            {formatDayHeading(selectedDate)}
          </Text>

          {dayEvents.length > 0 ? (
            <View className="flex flex-col gap-3">
              {dayEvents.map((event) => (
                <HighlightCard
                  key={event.id}
                  event={event}
                  onClick={() => navigateToRoute(event.route)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="calendar"
              title="Nothing on this day"
              description="No vaccines or milestones were recorded for the selected date."
              actionText="Back to Oct 10"
              onAction={() => {
                setYear(INITIAL_YEAR)
                setMonth(INITIAL_MONTH)
                setSelectedDate(INITIAL_DATE)
              }}
            />
          )}
        </View>
      </View>
    </PageContainer>
  )
}
