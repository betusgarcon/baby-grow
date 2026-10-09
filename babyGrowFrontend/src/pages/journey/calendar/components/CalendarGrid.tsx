import { View, Text } from '@tarojs/components'
import { weekdayLabels, type CalendarCell } from '../calendarData'

interface CalendarGridProps {
  cells: CalendarCell[]
  onSelectDate: (isoDate: string) => void
}

export default function CalendarGrid({ cells, onSelectDate }: CalendarGridProps) {
  return (
    <View className="w-full box-border p-6 rounded-xl bg-surface-container-lowest border border-outline-variant shadow-card-soft flex flex-col gap-4">
      <View className="w-full flex items-center">
        {weekdayLabels.map((label, index) => (
          <View key={`${label}-${index}`} className="flex-1 flex justify-center">
            <Text className="text-caption text-on-surface-variant">{label}</Text>
          </View>
        ))}
      </View>

      {/* 固定 42 格 6 行，切换月份时高度不跳动；7 列用百分比宽度，不用绝对定位 */}
      <View className="w-full flex flex-wrap">
        {cells.map((cell) => (
          <View
            key={cell.key}
            className="w-[14.285%] h-12 box-border flex items-center justify-center"
            onClick={() => cell.date && onSelectDate(cell.date)}
          >
            {cell.day === null ? null : (
              <View
                className={`w-10 h-12 rounded-full flex flex-col items-center justify-center gap-1 box-border ${
                  cell.isSelected ? 'bg-primary-container border border-outline-variant' : ''
                }`}
              >
                <Text className="text-base text-on-surface">{cell.day}</Text>

                <View className="h-1.5 flex items-center gap-1">
                  {cell.dotClasses.map((dotClass, index) => (
                    <View key={index} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}
