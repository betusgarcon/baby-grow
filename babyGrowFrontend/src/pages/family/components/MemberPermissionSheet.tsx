import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import { familyRoleOptions, type FamilyMember, type FamilyRole } from '@/store/family'

interface MemberPermissionSheetProps {
  member: FamilyMember
  role: FamilyRole
  onRoleChange: (role: FamilyRole) => void
  onConfirm: () => void
  onRemove: () => void
  onClose: () => void
}

/**
 * 成员权限设置。设计稿里它是压在家庭首页上的底部弹层，不是独立页面，
 * 所以没有单独的路由。
 */
export default function MemberPermissionSheet({
  member,
  role,
  onRoleChange,
  onConfirm,
  onRemove,
  onClose,
}: MemberPermissionSheetProps) {
  return (
    <View
      className="fixed left-0 right-0 top-0 bottom-0 z-50 flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={onClose}
    >
      {/* 阻止冒泡，点弹层内部不该把它关掉 */}
      <View
        className="w-full box-border px-6 pt-3 pb-8 rounded-t-3xl bg-surface-container-lowest flex flex-col gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <View className="self-center w-10 h-1 rounded-full bg-outline-variant" />

        <Text className="text-2xl font-bold text-on-surface pt-2">
          管理 {member.name} 的权限
        </Text>
        <Text className="text-sm text-on-surface-variant">
          更改该成员在空间内的数据访问与记录范围
        </Text>

        <View className="flex flex-col gap-3 pt-2">
          {familyRoleOptions.map((option) => {
            const selected = option.key === role

            return (
              <View
                key={option.key}
                className={`w-full box-border p-4 rounded-3xl border flex items-start gap-3 ${
                  selected
                    ? 'bg-secondary-container border-secondary-fixed-dim'
                    : 'bg-surface-container border-transparent'
                }`}
                onClick={() => onRoleChange(option.key)}
              >
                <View className="flex-1 flex flex-col gap-1">
                  <Text className="text-base font-bold text-on-surface">{option.title}</Text>
                  <Text className="text-caption text-on-surface-variant">{option.description}</Text>
                </View>

                {selected ? <Icon name="check-accent" className="w-5 h-5 shrink-0" /> : null}
              </View>
            )
          })}
        </View>

        <View
          className="w-full py-4 rounded-full bg-primary flex items-center justify-center mt-2"
          onClick={onConfirm}
        >
          <Text className="text-base font-semibold text-[#ffffff]">确认更改</Text>
        </View>

        <View
          className="w-full py-3 flex items-center justify-center gap-2"
          onClick={onRemove}
        >
          <Icon name="heart" className="w-5 h-5" />
          <Text className="text-base font-semibold text-error">移出该家庭空间</Text>
        </View>
      </View>
    </View>
  )
}
