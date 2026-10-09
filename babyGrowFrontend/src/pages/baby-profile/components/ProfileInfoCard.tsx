import { View, Text, Picker } from '@tarojs/components'
import Icon from '@/components/Icon'
import type { ProfileInfoItem } from '../babyProfileData'

interface ProfileInfoCardProps {
  item: ProfileInfoItem
  /** 该行是否处于可编辑状态 */
  editing?: boolean
  /** age 行：生日 ISO 日期，选择器以它为初值 */
  birthday?: string
  /** age 行：可选的最晚日期，避免选到未来 */
  maxDate?: string
  onSelect?: (value: string) => void
  onLongPress?: () => void
}

export default function ProfileInfoCard({
  item,
  editing = false,
  birthday,
  maxDate,
  onSelect,
  onLongPress,
}: ProfileInfoCardProps) {
  const isAge = item.key === 'age'
  const valueIndex = Math.max(item.options?.indexOf(item.value) ?? 0, 0)

  const valueNode = <Text className="text-base font-semibold text-on-surface">{item.value}</Text>

  return (
    <View
      className={`w-full box-border p-4 rounded-3xl flex items-center gap-4 ${
        editing ? 'bg-surface-container-high' : 'bg-surface-container-lowest'
      }`}
      onLongPress={editing ? undefined : onLongPress}
    >
      <View className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${item.circleClass}`}>
        <Icon name={item.icon} className="w-5 h-5" />
      </View>

      <View className="flex-1 flex flex-col">
        <Text className="text-caption text-on-surface-variant">{item.label}</Text>

        {!editing ? (
          valueNode
        ) : isAge ? (
          // 年龄不直接选，而是选生日再由生日算出当前年龄——年龄会随时间自己变
          <Picker
            mode="date"
            value={birthday ?? maxDate ?? ''}
            end={maxDate ?? ''}
            onChange={(event) => onSelect?.(event.detail.value)}
          >
            {valueNode}
          </Picker>
        ) : (
          <Picker
            mode="selector"
            range={item.options ?? []}
            value={valueIndex}
            onChange={(event) => onSelect?.(item.options?.[Number(event.detail.value)] ?? item.value)}
          >
            {valueNode}
          </Picker>
        )}
      </View>

      {editing ? <Icon name="edit-muted" className="w-4 h-4 shrink-0" /> : null}
    </View>
  )
}
