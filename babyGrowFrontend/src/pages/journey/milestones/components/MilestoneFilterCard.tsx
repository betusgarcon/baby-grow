import { View, Text, Picker, Input } from '@tarojs/components'
import Icon from '@/components/Icon'
import { t } from '@/i18n'
import { milestoneMonthLabel, monthOptions, yearOptions } from '../milestoneData'

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
  /** 显示文案与取值分开：取值是稳定键，显示才跟着语言变 */
  format?: (value: string) => string
}

function SelectField({ label, value, range, onChange, format = (raw) => raw }: SelectFieldProps) {
  const index = Math.max(range.indexOf(value), 0)

  return (
    <View className="flex-1 flex flex-col gap-xs">
      <Text className="text-caption text-on-surface-variant">{label}</Text>

      <Picker mode="selector" range={range.map(format)} value={index} onChange={(event) => onChange(range[Number(event.detail.value)])}>
        <View className="h-8 px-sm rounded-full bg-surface-container-lowest border border-outline-variant flex items-center justify-between box-border">
          <Text className="text-label-md text-on-surface">{format(value)}</Text>
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
    <View className="w-full box-border p-md rounded-lg bg-card border border-outline-variant flex flex-col gap-sm">
      <View className="flex items-center gap-sm">
        <SelectField label={t('milestones.month')} value={month} range={monthOptions} onChange={onMonthChange} format={milestoneMonthLabel} />
        <SelectField label={t('milestones.year')} value={year} range={yearOptions} onChange={onYearChange} />
      </View>

      <View className="flex flex-col gap-xs">
        <Text className="text-caption text-on-surface-variant">{t('milestones.keywords')}</Text>

        <View className="h-10 px-md rounded-full bg-surface-container-lowest border border-outline-variant flex items-center box-border">
          <Input
            className="w-full text-label-md text-on-surface"
            value={keyword}
            placeholder={t('milestones.searchPlaceholder')}
            placeholderClass="text-on-surface-variant"
            onInput={(event) => onKeywordChange(event.detail.value)}
          />
        </View>
      </View>
    </View>
  )
}
