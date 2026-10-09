import { View, Text } from '@tarojs/components'
import Icon from '@/components/Icon'
import type { FamilyMember } from '../familyData'

interface MemberRowProps {
  member: FamilyMember
  /** 点右侧三点进入该成员的权限设置 */
  onMore?: () => void
}

export default function MemberRow({ member, onMore }: MemberRowProps) {
  return (
    <View className="w-full flex items-center gap-4 py-4">
      {/* 首字母头像。没有真实成员照片，用色块 + 首字母代替 */}
      <View
        className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${member.avatarClass}`}
      >
        <Text className="text-lg font-bold text-[#ffffff]">{member.initial}</Text>
      </View>

      <View className="flex-1 flex flex-col">
        <Text className="text-base font-semibold text-on-surface">{member.name}</Text>
        <Text className="text-caption text-on-surface-variant">{member.roleLabel}</Text>
      </View>

      {onMore ? (
        <View className="w-9 h-9 shrink-0 flex items-center justify-center" onClick={onMore}>
          <Icon name="more-vert" className="w-5 h-5" />
        </View>
      ) : null}
    </View>
  )
}
