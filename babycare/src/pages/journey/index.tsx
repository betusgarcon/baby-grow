import { View, Text, Image, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import BottomTabBar from '@/components/BottomTabBar'
import Icon from '@/components/Icon'
import VaccineReminder from './components/VaccineReminder'
import WeeklyInsight from './components/WeeklyInsight'
import MilestoneCard from './components/MilestoneCard'
import JourneyLog from './components/JourneyLog'
import MenuCard from './components/MenuCard'
import Taro from '@tarojs/taro'
import { handleBottomTabNavigation } from '@/utils/analysisNavigation'
import firstSmileImg from '@/assets/images/first-smile-img.png'
import babyJourneyImg from '@/assets/images/baby-journey-img.png'

const mockMilestones = [
  {
    id: 1,
    title: 'First Smile',
    date: '2 days ago',
    image: firstSmileImg,
  },
  {
    id: 2,
    title: 'Grasping',
    date: '1 week ago',
    image: firstSmileImg,
  },
  {
    id: 3,
    title: 'Rolling Over',
    date: '3 days ago',
    image: firstSmileImg,
  },
]

const mockJourneyLogs = [
  {
    id: 1,
    type: 'feeding',
    title: 'Feeding',
    time: '10:30 AM',
    description: 'Formula - 120ml. Seemed very content afterwards.',
    icon: 'fork_knife',
    bgColor: 'bg-stone-100',
    iconColor: 'text-stone-600',
  },
  {
    id: 2,
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

const mockMenus = [
  {
    id: 1,
    mealType: 'Breakfast',
    title: 'Oatmeal & Banana',
    description: 'Smoothie texture, rich in potassium.',
    bgColor: 'bg-stone-50',
    icon: 'breakfast',
  },
  {
    id: 2,
    mealType: 'Lunch',
    title: 'Sweet Potato Mash',
    description: 'Soft and easily digestible.',
    bgColor: 'bg-orange-100/50',
    icon: 'lunch',
  },
  {
    id: 3,
    mealType: 'Dinner',
    title: 'Apple Puree',
    description: 'Light and sweet for the evening.',
    bgColor: 'bg-rose-100',
    icon: 'supper',
  },
]

export default function Journey() {
  const [navInfo, setNavInfo] = useState({
    statusBarHeight: 44,
    navBarHeight: 44,
    totalHeight: 88,
    capsuleRight: 96
  })

  useEffect(() => {
    try {
      const sysInfo = Taro.getSystemInfoSync()
      const menuButton = Taro.getMenuButtonBoundingClientRect()
      
      const statusBarHeight = sysInfo.statusBarHeight || 44
      const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height
      
      setNavInfo({
        statusBarHeight,
        navBarHeight,
        totalHeight: statusBarHeight + navBarHeight,
        capsuleRight: sysInfo.windowWidth - menuButton.left + 16 
      })
    } catch (error) {
      console.error('获取系统顶部高度失败', error)
    }
  }, [])

  return (
    // 1. 根容器：锁死屏幕 100% 高度 + overflow-hidden，彻底禁止整页回弹和滚动
    <View className="w-screen h-screen bg-white overflow-hidden flex flex-col relative">
      
      {/* 2. 顶部 Header：不需要 fixed，作为 Flex 顶层自然不参与滚动 */}
      <View 
        className="w-full bg-orange-50/80 backdrop-blur-md shadow-sm shrink-0 z-20 box-border"
        style={{ paddingTop: `${navInfo.statusBarHeight}px` }}
      >
        <View 
          className="w-full px-5 flex justify-between items-center relative box-border"
          style={{ 
            height: `${navInfo.navBarHeight}px`,
            paddingRight: `${navInfo.capsuleRight}px` 
          }}
        >
          <View className="flex items-center gap-2">
            <Image 
              className="w-10 h-10 rounded-full shadow-sm object-cover" 
              src={babyJourneyImg}
            />
            <Text className="px-2 py-0.5 bg-orange-200 rounded-full text-stone-600 text-base font-bold">6M</Text>
          </View>
          
          <Text className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-600 text-xl font-bold">
            Journey
          </Text>

          <View className="flex items-center justify-center p-2 text-stone-600">
            <Icon name="calendar" className="w-5 h-5" />
          </View>
        </View>
      </View>

      {/* 3. 中间可滚动区域：ScrollView 撑满剩余高度 (flex-1 h-0) */}
      <ScrollView 
        scrollY 
        className="flex-1 w-full h-0"
        enhanced
        showScrollbar={false}
      >
        <View className="w-full px-5 py-6 flex flex-col gap-8 pb-40">
          <VaccineReminder
            icon="injection"
            title="Upcoming: 6-Month Vaccination" 
            date="Scheduled for Oct 28th." 
          />

          <WeeklyInsight
            icon="star"
            title="WEEKLY INSIGHT"
            content="Emma has been sleeping 15% longer during daytime naps this week."
          />

          {/* Recent Milestones */}
          <View className="w-full flex flex-col gap-4">
            <View className="flex justify-between items-end px-1">
              <Text className="text-stone-900 text-xl font-semibold">Recent Milestones</Text>
              <Text className="text-neutral-600 text-sm font-semibold">More</Text>
            </View>
            <View className="w-full flex justify-between items-center gap-3">
              {mockMilestones.map((milestone) => (
                <MilestoneCard 
                  key={milestone.id}
                  title={milestone.title}
                  date={milestone.date}
                  image={milestone.image}
                />
              ))}
            </View>
          </View>

          {/* Latest Journey */}
          <View className="w-full flex flex-col gap-4">
            <View className="flex justify-between items-end px-1">
              <Text className="text-stone-900 text-xl font-semibold">Latest Journey</Text>
              <Text className="text-neutral-600 text-sm font-semibold">More</Text>
            </View>
            <View className="bg-stone-50/80 rounded-[24px] p-4 flex flex-col gap-4">
              {mockJourneyLogs.map((log) => (
                <JourneyLog 
                  key={log.id}
                  {...log}
                />
              ))}
            </View>
          </View>

          {/* Today's Menu */}
          <View className="w-full flex flex-col gap-4 overflow-hidden">
            <Text className="text-stone-900 text-xl font-semibold px-1">Today's Menu</Text>
            <View className="w-full flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
              {mockMenus.map((menu) => (
                <MenuCard 
                  key={menu.id}
                  {...menu}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 4. 底部 TabBar：作为 Flex 底层天然固定 */}
      <View className="shrink-0 z-20">
        <BottomTabBar activeKey="journey" onTabChange={handleBottomTabNavigation} />
      </View>

    </View>
  )
}
