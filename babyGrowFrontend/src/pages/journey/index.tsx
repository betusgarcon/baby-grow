import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import BottomTabBar from '@/components/BottomTabBar'
import Icon from '@/components/Icon'
import VaccineReminder from './components/VaccineReminder'
import WeeklyInsight from './components/WeeklyInsight'
import MilestoneCard from './components/MilestoneCard'
import JourneyLog from './components/JourneyLog'
import MenuCard from './components/MenuCard'
import { handleBottomTabNavigation } from '@/utils/analysisNavigation'
import { navigateToRoute } from '@/utils/routes'
import { relativeLabelOf } from '@/store/timeline'
import { useAppState, loadTimeline, loadMilestones } from '@/store'
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import RecordSheet from '@/components/RecordSheet'
import { getTodayMenu, type MenuTodayResponse } from '@/api/modules/menu'
import firstSmileImg from '@/assets/images/first-smile-img.png'
import babyJourneyImg from '@/assets/images/baby-journey-img.png'

/** 时间线条目的类型 → 首页 JourneyLog 用的图标 */
const LOG_ICON: Record<string, string> = {
  memory: 'calendar',
  feeding: 'fork_knife',
  sleep: 'moon',
}

export default function Journey() {
  // Latest Journey 与 Recent Milestones 都读 store，首页不再另写一套数据
  const { timeline, milestones, status } = useAppState()
  const [recordOpen, setRecordOpen] = useState(false)
  // 今日菜单来自服务端缓存（毫秒级，不等 AI）
  const [menu, setMenu] = useState<MenuTodayResponse | null>(null)
  const [menuLoading, setMenuLoading] = useState(true)

  const loadMenu = () => {
    getTodayMenu()
      .then((response) => setMenu(response.data))
      .catch(() => setMenu(null))
      .finally(() => setMenuLoading(false))
  }

  useEffect(() => {
    loadTimeline()
    loadMilestones()
    loadMenu()
  }, [])

  const recentLogs = timeline.slice(0, 2)

  return (
    // 1. 根容器：锁死屏幕 100% 高度 + overflow-hidden，彻底禁止整页回弹和滚动
    <View className="w-screen h-screen bg-white overflow-hidden flex flex-col relative">
      
      {/* 2. 顶部 Header：改走公共 PageHeader，不再自己量一遍系统信息 */}
      <PageHeader
        title="Journey"
        profile={{ avatar: babyJourneyImg, ageLabel: '6M' }}
        onProfilePress={() => navigateToRoute('baby-profile-view')}
        right={
          <View
            className="w-9 h-9 flex items-center justify-center text-stone-600"
            onClick={() => navigateToRoute('journey-calendar')}
          >
            <Icon name="calendar" className="w-5 h-5" />
          </View>
        }
      />

      {/* 3. 中间可滚动区域：ScrollView 撑满剩余高度 (flex-1 h-0) */}
      <ScrollView 
        scrollY 
        className="flex-1 w-full h-0"
        enhanced
        showScrollbar={false}
      >
        <View className="w-full px-5 py-6 flex flex-col gap-8 pb-40">
          <View onClick={() => navigateToRoute('journey-vaccine')}>
            <VaccineReminder
              icon="injection"
              title="Upcoming: 6-Month Vaccination"
              date="Scheduled for Oct 28th."
            />
          </View>

          <View onClick={() => navigateToRoute('journey-weekly-insight')}>
            <WeeklyInsight
              icon="star"
              title="WEEKLY INSIGHT"
              content="Leo 这周白天小睡的时长比上周多了 15%。"
            />
          </View>

          {/* Recent Milestones */}
          <View className="w-full flex flex-col gap-4">
            <View className="flex justify-between items-end px-1">
              <Text className="text-stone-900 text-xl font-semibold">Recent Milestones</Text>
              <Text
                className="text-neutral-600 text-sm font-semibold"
                onClick={() => navigateToRoute('journey-milestones')}
              >
                More
              </Text>
            </View>
            <View className="w-full flex justify-between items-center gap-3">
              {/* 用里程碑页的同一份数据，避免首页与里程碑页各写一套对不上 */}
              {milestones.slice(0, 3).map((milestone) => (
                <MilestoneCard
                  key={milestone.id}
                  title={milestone.title}
                  date={relativeLabelOf(milestone.date)}
                  image={firstSmileImg}
                />
              ))}
            </View>
          </View>

          {/* Latest Journey */}
          <View className="w-full flex flex-col gap-4">
            <View className="flex justify-between items-end px-1">
              <Text className="text-stone-900 text-xl font-semibold">Latest Journey</Text>
              <Text
                className="text-neutral-600 text-sm font-semibold"
                onClick={() => navigateToRoute('journey-list')}
              >
                More
              </Text>
            </View>
            {recentLogs.length > 0 ? (
              <View className="bg-stone-50/80 rounded-[24px] p-4 flex flex-col gap-4">
                {recentLogs.map((entry) => (
                  <JourneyLog
                    key={entry.id}
                    title={entry.title}
                    time={entry.time}
                    description={entry.description}
                    icon={LOG_ICON[entry.type]}
                    bgColor="bg-stone-100"
                    iconColor="text-stone-600"
                    tags={[entry.badge]}
                  />
                ))}
              </View>
            ) : status.timeline === 'ready' ? (
              // 首次使用还没有任何记录时的空态
              <View className="bg-stone-50/80 rounded-[24px]">
                <EmptyState
                  icon="star"
                  title="还没有成长记录"
                  description="记录下今天的第一件小事，时间线就会从这里铺开。"
                  actionText="去记录一条"
                  onAction={() => setRecordOpen(true)}
                />
              </View>
            ) : (
              <LoadingSkeleton blocks={1} blockHeight={96} />
            )}
          </View>

          {/* Today's Menu —— 内容由后端预生成，首页只读缓存 */}
          <View className="w-full flex flex-col gap-4 overflow-hidden">
            <View className="flex justify-between items-end px-1">
              <Text className="text-stone-900 text-xl font-semibold">Today's Menu</Text>
              {menu?.reason ? (
                <Text className="text-neutral-500 text-xs flex-1 text-right pl-3" numberOfLines={2}>
                  {menu.reason}
                </Text>
              ) : null}
            </View>

            {menuLoading ? (
              <LoadingSkeleton blocks={1} blockHeight={96} />
            ) : menu && menu.items.length > 0 ? (
              <View className="w-full flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                {menu.items.map((item) => (
                  <MenuCard
                    key={item.id}
                    icon={item.icon}
                    mealType={item.mealType}
                    title={item.title}
                    description={item.description}
                    bgColor={item.bgColor || 'bg-stone-50'}
                  />
                ))}
              </View>
            ) : (
              // 推荐还没算好、或暂时生成失败时的空态。stale 为真表示后台正在生成
              <View className="bg-stone-50/80 rounded-[24px]">
                <EmptyState
                  icon="fork_knife"
                  title={menu?.stale ? '推荐正在准备中' : '还没有推荐'}
                  description={
                    menu?.error
                      ? '生成推荐时出了点问题，稍后会自动重试。'
                      : '记录宝宝最近吃了什么，这里会按饮食记录和喂养指南给出建议。'
                  }
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 4. 底部 TabBar：作为 Flex 底层天然固定 */}
      <View className="shrink-0 z-20">
        <BottomTabBar activeKey="journey" onTabChange={handleBottomTabNavigation} />
      </View>

      {/* 空态的「去记录一条」要能真的拉起记录弹层，所以首页自己持有一个 */}
      <RecordSheet
        visible={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSaved={() => {
          setRecordOpen(false)
          // 刚记录的饮食可能让今日推荐过期，重新拉一次（后端会返回旧结果 + stale）
          loadMenu()
        }}
      />
    </View>
  )
}
