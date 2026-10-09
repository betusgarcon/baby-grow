import { View, Text, Picker } from '@tarojs/components'
import Icon from '@/components/Icon'
import type { ProfileInfoItem } from '../babyProfileData'

interface ProfileInfoCardProps {
  item: ProfileInfoItem
  /** 编辑态：把值换成选择器并显示铅笔 */
  editing?: boolean
  onValueChange?: (value: string) => void
}

export default function ProfileInfoCard({ item, editing = false, onValueChange }: ProfileInfoCardProps) {
  const valueIndex = Math.max(item.options.indexOf(item.value), 0)

  return (
    <View className="w-full box-border p-4 rounded-3xl bg-surface-container-lowest flex items-center gap-4">
      <View className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${item.circleClass}`}>
        <Icon name={item.icon} className="w-5 h-5" />
      </View>

      <View className="flex-1 flex flex-col">
        <Text className="text-caption text-on-surface-variant">{item.label}</Text>

        {editing ? (
          <Picker
            mode="selector"
            range={item.options}
            value={valueIndex}
            onChange={(event) => onValueChange?.(item.options[Number(event.detail.value)])}
          >
            <Text className="text-base font-semibold text-on-surface">{item.value}</Text>
          </Picker>
        ) : (
          <Text className="text-base font-semibold text-on-surface">{item.value}</Text>
        )}
      </View>

      {editing ? <Icon name="edit-muted" className="w-4 h-4 shrink-0" /> : null}
    </View>
  )
}
