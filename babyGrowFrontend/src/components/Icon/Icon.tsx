import type { CSSProperties } from 'react'
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

// analysis 模块新增图标
import growTabActive from '@/assets/icons/grow_tab_active_icon.svg'
import growTabInactive from '@/assets/icons/grow_tab_inactive_icon.svg'
import sleepTabActive from '@/assets/icons/sleep_tab_active_icon.svg'
import sleepTabInactive from '@/assets/icons/sleep_tab_inactive_icon.svg'
import dietTabActive from '@/assets/icons/diet_tab_active_icon.svg'
import dietTabInactive from '@/assets/icons/diet_tab_inactive_icon.svg'
import moodTabInactive from '@/assets/icons/mood_tab_inactive_icon.svg'
import aiConcludeIcon from '@/assets/icons/ai_conclude_icon.svg'
import aiSuggestionIcon from '@/assets/icons/ai_suggestion_icon.svg'
import moreIcon from '@/assets/icons/more_icon.svg'
import toothIcon from '@/assets/icons/tooth_icon.svg'
import polarGuideIcon from '@/assets/icons/polar_guide_icon.svg'
import dailySleepLogIcon from '@/assets/icons/daily_sleep_log_icon.svg'
import napIcon from '@/assets/icons/nap_icon.svg'
import trashGreenIcon from '@/assets/icons/trash_green_icon.svg'
import trashGrayIcon from '@/assets/icons/trash_gray_icon.svg'
import quickAddIcon from '@/assets/icons/quick_add_icon.svg'
import timeInputIcon from '@/assets/icons/time_input_icon.svg'
import insightSummaryIcon from '@/assets/icons/insight_summary_icon.svg'
import clockActiveIcon from '@/assets/icons/clock_active_icon.svg'
import clockInactiveIcon from '@/assets/icons/clock_inactive_icon.svg'
import summaryActiveIcon from '@/assets/icons/summary_active_icon.svg'
import summaryInactiveIcon from '@/assets/icons/summary_inactive_icon.svg'

// 新增替换图标
import sunnyIcon from '@/assets/icons/sunny.svg'
import addCircleIcon from '@/assets/icons/add_circle.svg'
import deleteIcon from '@/assets/icons/delete.svg'
import happyMoodIcon from '@/assets/icons/happy_mood.svg'
import unhappyMoodIcon from '@/assets/icons/unhappy_mood.svg'
import uncomfortableMoodIcon from '@/assets/icons/uncomfortable_mood.svg'

// 里程碑图标
import babyRollIcon from '@/assets/icons/baby_roll.svg'
import babySpeakIcon from '@/assets/icons/baby_speak.svg'
import babyWalkIcon from '@/assets/icons/baby_walk.svg'

// 通用导航图标
import backIcon from '@/assets/icons/back_icon.svg'
import chevronRightIcon from '@/assets/icons/chevron_right_icon.svg'
import chevronDownIcon from '@/assets/icons/chevron_down_icon.svg'
import heartIcon from '@/assets/icons/heart_icon.svg'
import calendarVaccineIcon from '@/assets/icons/calendar_vaccine_icon.svg'

// 里程碑卡片图标（白字形，配彩色圆形底）
import milestoneWalkIcon from '@/assets/icons/milestone_walk_icon.svg'
import milestoneSpeakIcon from '@/assets/icons/milestone_speak_icon.svg'
import milestoneSleepIcon from '@/assets/icons/milestone_sleep_icon.svg'
import milestoneFoodIcon from '@/assets/icons/milestone_solid_food_icon.svg'

// 时间线标记图标（按记录类型着色，配对应容器色圆底）
import timelineMemoryIcon from '@/assets/icons/timeline_memory_icon.svg'
import timelineFeedingIcon from '@/assets/icons/timeline_feeding_icon.svg'
import timelineSleepIcon from '@/assets/icons/timeline_sleep_icon.svg'

// 事件详情页图标
import eventShareIcon from '@/assets/icons/event_share_icon.svg'
import eventLocationIcon from '@/assets/icons/event_location_icon.svg'
import eventPersonIcon from '@/assets/icons/event_person_icon.svg'
import eventMedicalIcon from '@/assets/icons/event_medical_icon.svg'
import eventRepeatIcon from '@/assets/icons/event_repeat_icon.svg'
import eventNotesIcon from '@/assets/icons/event_notes_icon.svg'
import eventAttachmentIcon from '@/assets/icons/event_attachment_icon.svg'
import eventEditIcon from '@/assets/icons/event_edit_icon.svg'
import eventDeleteIcon from '@/assets/icons/event_delete_icon.svg'

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

  // analysis 分类 Tab 图标
  'tab-grow-active': growTabActive,
  'tab-grow-inactive': growTabInactive,
  'tab-sleep-active': sleepTabActive,
  'tab-sleep-inactive': sleepTabInactive,
  'tab-diet-active': dietTabActive,
  'tab-diet-inactive': dietTabInactive,
  // mood_tab_active 资源缺失，active 复用 inactive（视觉差异由父容器 opacity 控制）
  'tab-mood-active': moodTabInactive,
  'tab-mood-inactive': moodTabInactive,

  // analysis 模块功能图标
  'ai-conclude': aiConcludeIcon,
  'ai-suggestion': aiSuggestionIcon,
  'more': moreIcon,
  'tooth': toothIcon,
  'polar-guide': polarGuideIcon,
  'daily-sleep-log': dailySleepLogIcon,
  'nap': napIcon,
  'trash-green': trashGreenIcon,
  'trash-gray': trashGrayIcon,
  'quick-add': quickAddIcon,
  'time-input': timeInputIcon,
  'insight-summary': insightSummaryIcon,
  'clock-active': clockActiveIcon,
  'clock-inactive': clockInactiveIcon,
  'summary-active': summaryActiveIcon,
  'summary-inactive': summaryInactiveIcon,

  // 新增替换图标
  'sunny': sunnyIcon,
  'add-circle': addCircleIcon,
  'delete': deleteIcon,
  'happy-mood': happyMoodIcon,
  'unhappy-mood': unhappyMoodIcon,
  'uncomfortable-mood': uncomfortableMoodIcon,

  // 里程碑图标
  'baby-roll': babyRollIcon,
  'baby-speak': babySpeakIcon,
  'baby-walk': babyWalkIcon,

  // 通用导航图标
  'back': backIcon,
  'chevron-right': chevronRightIcon,
  'chevron-down': chevronDownIcon,
  'heart': heartIcon,
  'calendar-vaccine': calendarVaccineIcon,

  // 里程碑卡片图标
  'milestone-walk': milestoneWalkIcon,
  'milestone-speak': milestoneSpeakIcon,
  'milestone-sleep': milestoneSleepIcon,
  'milestone-food': milestoneFoodIcon,

  // 时间线标记图标
  'timeline-memory': timelineMemoryIcon,
  'timeline-feeding': timelineFeedingIcon,
  'timeline-sleep': timelineSleepIcon,

  // 事件详情页图标
  'event-share': eventShareIcon,
  'event-location': eventLocationIcon,
  'event-person': eventPersonIcon,
  'event-medical': eventMedicalIcon,
  'event-repeat': eventRepeatIcon,
  'event-notes': eventNotesIcon,
  'event-attachment': eventAttachmentIcon,
  'event-edit': eventEditIcon,
  'event-delete': eventDeleteIcon,
}

interface IconProps {
  name: string
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export default function Icon({ name, className = 'w-5 h-5', style, onClick }: IconProps) {
  const iconSrc = iconMap[name]

  if (!iconSrc) {
    return <View className={className} style={style} />
  }

  return (
    <Image
      src={iconSrc}
      className={className}
      style={style}
      mode="aspectFit"
      onClick={onClick}
    />
  )
}