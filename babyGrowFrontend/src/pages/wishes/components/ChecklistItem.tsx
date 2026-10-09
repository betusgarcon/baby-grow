import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import type { WishChecklistItem } from '@/store/wishes'

interface ChecklistItemProps {
  item: WishChecklistItem
  /** 管理态：左侧出现移除按钮、右侧出现拖拽手柄 */
  editing?: boolean
  onToggle?: () => void
  onRemove?: () => void
}

export default function ChecklistItem({
  item,
  editing = false,
  onToggle,
  onRemove,
}: ChecklistItemProps) {
  return (
    <View className="w-full box-border py-3 px-4 rounded-xl bg-surface-container-lowest flex items-center gap-4">
      {editing ? (
        <View className="shrink-0 p-1" onClick={onRemove}>
          <Icon name="remove-circle" className="w-5 h-5" />
        </View>
      ) : null}

      {/* 已完成的圆底承载白色对勾，未完成的只是一个描边空圈。
          编辑态同样允许勾选：否则勾第一个就会进入编辑态，之后再也勾不了第二个 */}
      <View
        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center box-border ${
          item.done ? 'bg-wish-active' : 'border-2 border-outline-variant'
        }`}
        onClick={onToggle}
      >
        {item.done ? <Icon name="check-light" className="w-3.5 h-3.5" /> : null}
      </View>

      <View className="flex-1 flex flex-col">
        <Text className="text-base font-semibold text-on-surface">{item.title}</Text>
        <Text className="text-caption text-on-surface-variant">{item.note}</Text>
      </View>

      {editing ? <Icon name="drag-handle" className="w-5 h-5 shrink-0" /> : null}
    </View>
  )
}
