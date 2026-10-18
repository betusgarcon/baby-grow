import { View, Text } from '@tarojs/components'
import { t } from '@/i18n'
import { filterGroups, type FilterKey } from '../memoriesData'

interface MemoryFilterSheetProps {
  filters: Record<FilterKey, string>
  onChange: (key: FilterKey, value: string) => void
  onReset: () => void
  onApply: () => void
  onClose: () => void
}

/** 筛选面板。设计稿里是压在列表上的底部弹层，不是独立页面 */
export default function MemoryFilterSheet({
  filters,
  onChange,
  onReset,
  onApply,
  onClose,
}: MemoryFilterSheetProps) {
  return (
    <View
      className="fixed left-0 right-0 top-0 bottom-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      <View
        className="w-full box-border px-6 pt-3 pb-8 rounded-t-3xl bg-surface-container-lowest flex flex-col gap-5"
        onClick={(event) => event.stopPropagation()}
      >
        <View className="self-center w-10 h-1 rounded-full bg-outline-variant" />

        <View className="flex items-center justify-between pt-1">
          <Text className="text-2xl font-bold text-on-surface">{t('memories.filterTitle')}</Text>
          <Text className="text-sm font-semibold text-on-surface-variant" onClick={onReset}>
            {t('memories.reset')}
          </Text>
        </View>

        {filterGroups.map((group) => (
          <View key={group.key} className="flex flex-col gap-3">
            <Text className="text-sm font-semibold text-on-surface-variant">{t(group.labelKey)}</Text>

            <View className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const selected = filters[group.key] === option.value

                return (
                  <View
                    key={option.value}
                    className={`py-2 px-4 rounded-full border ${
                      selected
                        ? 'bg-tertiary-fixed border-on-tertiary-container'
                        : 'bg-surface-container border-transparent'
                    }`}
                    onClick={() => onChange(group.key, selected ? '' : option.value)}
                  >
                    <Text className="text-sm font-semibold text-on-surface">{t(option.labelKey)}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        ))}

        <View className="flex items-center gap-3 pt-1">
          <View
            className="flex-1 py-4 rounded-full bg-surface-container-high flex items-center justify-center"
            onClick={onClose}
          >
            <Text className="text-base font-semibold text-on-surface">Cancel</Text>
          </View>

          <View
            className="flex-1 py-4 rounded-full bg-primary flex items-center justify-center"
            onClick={onApply}
          >
            <Text className="text-base font-semibold text-[#ffffff]">{t('memories.apply')}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
