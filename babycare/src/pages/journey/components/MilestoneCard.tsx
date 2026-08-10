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
      <Text className="text-stone-900 text-sm font-semibold">{title}</Text>
      <Text className="text-stone-700/70 text-xs">{date}</Text>
    </View>
  )
}
