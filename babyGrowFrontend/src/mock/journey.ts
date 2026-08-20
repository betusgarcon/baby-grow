/**
 * 首页/旅程 Mock 数据
 * 严格匹配 src/types/journey.ts 中的类型定义
 */

import type {
  GetJourneyPageResponse,
  MilestoneRecord,
  JourneyLog,
  MenuItem,
  VaccineReminder,
  WeeklyInsight,
} from '@/types/journey'
import firstSmileImg from '@/assets/images/first-smile-img.png'

const milestones: MilestoneRecord[] = [
  {
    id: '1',
    title: 'First Smile',
    date: '2 days ago',
    image: firstSmileImg,
  },
  {
    id: '2',
    title: 'Grasping',
    date: '1 week ago',
    image: firstSmileImg,
  },
  {
    id: '3',
    title: 'Rolling Over',
    date: '3 days ago',
    image: firstSmileImg,
  },
]

const journeyLogs: JourneyLog[] = [
  {
    id: '1',
    type: 'feeding',
    title: 'Feeding',
    time: '10:30 AM',
    description: 'Formula - 120ml. Seemed very content afterwards.',
    icon: 'fork_knife',
    bgColor: 'bg-stone-100',
    iconColor: 'text-stone-600',
  },
  {
    id: '2',
    type: 'sleep',
    title: 'Nap Time',
    time: '8:15 AM - 9:45 AM',
    description: '',
    icon: 'moon',
    bgColor: 'bg-orange-100',
    iconColor: 'text-orange-700',
    tags: ['Deep Sleep', '1h 30m'],
  },
]

const menus: MenuItem[] = [
  {
    id: '1',
    mealType: 'Breakfast',
    title: 'Oatmeal & Banana',
    description: 'Smoothie texture, rich in potassium.',
    bgColor: 'bg-stone-50',
    icon: 'breakfast',
  },
  {
    id: '2',
    mealType: 'Lunch',
    title: 'Sweet Potato Mash',
    description: 'Soft and easily digestible.',
    bgColor: 'bg-orange-100/50',
    icon: 'lunch',
  },
  {
    id: '3',
    mealType: 'Dinner',
    title: 'Apple Puree',
    description: 'Light and sweet for the evening.',
    bgColor: 'bg-rose-100',
    icon: 'supper',
  },
]

const vaccineReminder: VaccineReminder = {
  id: 'vax-001',
  title: 'Upcoming: 6-Month Vaccination',
  date: 'Scheduled for Oct 28th.',
  icon: 'injection',
}

const weeklyInsight: WeeklyInsight = {
  id: 'insight-001',
  title: 'WEEKLY INSIGHT',
  content: 'Emma has been sleeping 15% longer during daytime naps this week.',
  icon: 'star',
}

export const journeyMockRoutes = [
  {
    path: '/api/baby/journey',
    handler: (): GetJourneyPageResponse => ({
      vaccineReminder,
      weeklyInsight,
      recentMilestones: milestones,
      latestJourneyLogs: journeyLogs,
      todayMenu: menus,
    }),
  },
]
