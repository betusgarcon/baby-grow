import { View, Text, Picker, Input } from '@tarojs/components'
import Icon from '@/components/Icon'
import { monthOptions, yearOptions } from '../milestoneData'

interface MilestoneFilterCardProps {
  month: string
  year: string
  keyword: string
  onMonthChange: (value: string) => void
  onYearChange: (value: string) => void
  onKeywordChange: (value: string) => void
}

interface SelectFieldProps {
  label: string
  value: string
  range: string[]
  onChange: (value: string) => void
}

function SelectField({ label, value, range, onChange }: SelectFieldProps) {
  const index = Math.max(range.indexOf(value), 0)

  return (
    <View className="flex-1 flex flex-col gap-xs">
      <Text className="text-caption text-on-surface-variant">{label}</Text>

      <Picker mode="selector" range={range} value={index} onChange={(event) => onChange(range[Number(event.detail.value)])}>
        <View className="h-8 px-sm rounded-full bg-surface-container-lowest border border-outline-variant flex items-center justify-between box-border">
          <Text className="text-label-md text-on-surface">{value}</Text>
          {/* 与 Icon/chevron-right 同字形，旋转 90° 得到向下箭头，不再单独出一份资源 */}
          <Icon name="chevron-right" className="w-3 h-3" style={{ transform: 'rotate(90deg)' }} />
        </View>
      </Picker>
    </View>
  )
}

export default function MilestoneFilterCard({
  month,
  year,
  keyword,
  onMonthChange,
  onYearChange,
  onKeywordChange,
}: MilestoneFilterCardProps) {
  return (
    <View className="w-full box-border p-md rounded-lg bg-surface-container-low border border-outline-variant flex flex-col gap-sm">
      <View className="flex items-center gap-sm">
        <SelectField label="Month" value={month} range={monthOptions} onChange={onMonthChange} />
        <SelectField label="Year" value={year} range={yearOptions} onChange={onYearChange} />
      </View>

      <View className="flex flex-col gap-xs">
        <Text className="text-caption text-on-surface-variant">Content Keywords</Text>

        <View className="h-10 px-md rounded-full bg-surface-container-lowest border border-outline-variant flex items-center box-border">
          <Input
            className="w-full text-label-md text-on-surface"
            value={keyword}
            placeholder="Search milestones..."
            placeholderClass="text-on-surface-variant"
            onInput={(event) => onKeywordChange(event.detail.value)}
          />
        </View>
      </View>
    </View>
  )
}
