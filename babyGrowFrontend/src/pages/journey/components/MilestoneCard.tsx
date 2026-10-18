import { View, Text, Image } from '@tarojs/components'

interface MilestoneCardProps {
  title: string
  date: string
  image: string
}

const milestoneStyles: Record<string, string> = {
  'First Smile': 'bg-rose-100',
  'Grasping': 'bg-stone-50',
  'Rolling Over': 'bg-rose-100',
}

export default function MilestoneCard({ title, date, image }: MilestoneCardProps) {
  const bgColor = milestoneStyles[title] || 'bg-rose-100'

  return (
    <View className={`flex-1 p-3 ${bgColor} rounded-[28px] flex flex-col items-center gap-2 shrink-0`}>
      <View className="w-20 h-20 rounded-full overflow-hidden shadow-sm shrink-0">
        <Image className="w-full h-full object-cover" src={image} />
      </View>

      {/* 标题固定在「两行高」的盒子里并做两行截断。
          否则长标题（如 Slept Through The Night）会换到三行，把这张卡连同整排都撑高；
          短标题则居中，几种情况下的卡片高度一致。 */}
      <View className="w-full h-10 flex items-center">
        <Text className="w-full text-on-surface text-label font-semibold text-center leading-tight line-clamp-2">
          {title}
        </Text>
      </View>

      <Text className="text-on-surface-variant text-caption">{date}</Text>
    </View>
  )
}
