import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import type { ProfilePreference } from '@/store/profile'

interface PreferenceCardProps {
  preference: ProfilePreference
  /** 管理态：左侧显示移除按钮、右侧显示铅笔 */
  editable?: boolean
  onRemove?: () => void
}

export default function PreferenceCard({
  preference,
  editable = false,
  onRemove,
}: PreferenceCardProps) {
  return (
    <View className="w-full box-border p-4 rounded-3xl bg-surface-container-low flex items-center gap-3">
      {editable ? (
        <View className="shrink-0 p-1" onClick={onRemove}>
          <Icon name="remove-circle" className="w-5 h-5" />
        </View>
      ) : null}

      <View className="w-10 h-10 shrink-0 rounded-full bg-surface-container-high flex items-center justify-center">
        <Icon name={preference.icon} className="w-5 h-5" />
      </View>

      <View className="flex-1 flex flex-col">
        <Text className="text-base font-semibold text-on-surface">{preference.label}</Text>
        <Text className="text-caption text-on-surface-variant">{preference.value}</Text>
      </View>

      {editable ? <Icon name="edit-muted" className="w-4 h-4 shrink-0" /> : null}
    </View>
  )
}
