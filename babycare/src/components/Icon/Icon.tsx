import { Image, View } from '@tarojs/components'

// 1. 导入放置在 assets/icons 下的全部 SVG 图标
import journeySelected from '@/assets/icons/journey_selected_icon.svg'
import journeyUnselected from '@/assets/icons/journey_unselected_icon.svg'
import analysisSelected from '@/assets/icons/analysis_selected_icon.svg'
import analysisUnselected from '@/assets/icons/analysis_unselected_icon.svg'
import wishesSelected from '@/assets/icons/wishes_selected_icon.svg'
import wishesUnselected from '@/assets/icons/wishes_unselected_icon.svg'
import familySelected from '@/assets/icons/family_selected_icon.svg'
import familyUnselected from '@/assets/icons/family_unselected_icon.svg'

import calendarIcon from '@/assets/icons/calendar_icon.svg'
import injectionIcon from '@/assets/icons/injection_icon.svg'
import starIcon from '@/assets/icons/star_icon.svg'
import recordIcon from '@/assets/icons/record_icon.svg'
import moonIcon from '@/assets/icons/moon_icon.svg'
import breakfastIcon from '@/assets/icons/breakfast_icon.svg'
import lunchIcon from '@/assets/icons/lunch_icon.svg'
import supperIcon from '@/assets/icons/supper_icon.svg'
import forkKnifeIcon from '@/assets/icons/fork_knife_icon.svg'

// 2. 建立名称与 SVG 资源的映射字典 (兼容全选中/未选中状态)
const iconMap: Record<string, string> = {
  // TabBar 图标
  'journey-active': journeySelected,
  'journey-inactive': journeyUnselected,
  'analysis-active': analysisSelected,
  'analysis-inactive': analysisUnselected,
  'wishes-active': wishesSelected,
  'wishes-inactive': wishesUnselected,
  'family-active': familySelected,
  'family-inactive': familyUnselected,

  // 页面功能图标
  'calendar': calendarIcon,
  'injection': injectionIcon,
  'star': starIcon,
  'record': recordIcon,
  'moon': moonIcon,
  'breakfast': breakfastIcon,
  'lunch': lunchIcon,
  'supper': supperIcon,
  'fork_knife': forkKnifeIcon,
}

interface IconProps {
  name: string
  className?: string
  onClick?: () => void
}

export default function Icon({ name, className = 'w-5 h-5', onClick }: IconProps) {
  const iconSrc = iconMap[name]

  if (!iconSrc) {
    return <View className={className} />
  }

  return (
    <Image 
      src={iconSrc} 
      className={className} 
      mode="aspectFit" 
      onClick={onClick} 
    />
  )
}