import { View, Text, Picker, Input } from '@tarojs/components'
import Icon from '@/components/Icon'
import type { ProfileInfoItem } from '@/store/profile'

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
  /**
   * 文本型字段（name）在输入框失焦时才触发。
   * 选择器是「选完即定」，而输入框每次按键都会回调——不能按一次提交一次。
   */
  onTextCommit?: () => void
}

export default function ProfileInfoCard({
  item,
  editing = false,
  birthday,
  maxDate,
  onSelect,
  onLongPress,
  onTextCommit,
}: ProfileInfoCardProps) {
  const isName = item.key === 'name'
  const isAge = item.key === 'age'
  const valueIndex = Math.max(item.options?.indexOf(item.value) ?? 0, 0)

  // 取值为空时把这一行的名称当提示显示出来。
  //
  // 这一行平时只显示取值、不显示文字标签（图标本身已经说明了是什么），但**空值**时
  // 就只剩一个图标了——用户看不出这是哪一项，更不知道该怎么填。所以只在空值时补上
  // label，有值时仍按原设计只留取值。
  const hasValue = Boolean(item.value && item.value.trim())

  const valueNode = hasValue ? (
    <Text className="text-base font-semibold text-on-surface">{item.value}</Text>
  ) : (
    <Text className="text-base text-on-surface-variant">{item.label}（未填写）</Text>
  )

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

      {/*
        不再显示 Name / Age / Gender 这类文字标签：它们和左侧图标的语义重复，
        图标与取值本身已经说明了这一行是什么。行内只留取值。
      */}
      <View className="flex-1 flex flex-col justify-center">
        {!editing ? (
          valueNode
        ) : isName ? (
          // 名字是自由文本，没有可选项，所以给输入框而不是选择器
          <Input
            className="w-full box-border h-9 px-3 rounded-full bg-surface-container-lowest text-base"
            type="text"
            maxlength={20}
            value={item.value}
            placeholder="宝宝的名字"
            placeholderClass="text-on-surface-variant"
            onInput={(event) => onSelect?.(event.detail.value)}
            onBlur={() => onTextCommit?.()}
          />
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
