import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
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
import PageHeader from '@/components/PageHeader'
import EmptyState from '@/components/EmptyState'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import AsyncSection from '@/components/AsyncSection'
import RecordSheet from '@/components/RecordSheet'
import { getTodayMenu, type MenuTodayResponse } from '@/api/modules/menu'
import { t } from '@/i18n'
import { monthDayLabel } from '@/i18n/formatters'
import {
  useAppState,
  loadTimeline,
  loadMilestones,
  loadCalendarEvents,
  loadWeeklyInsight,
} from '@/store'
import firstSmileImg from '@/assets/images/first-smile-img.jpg'

/** 时间线条目的类型 → 首页 JourneyLog 用的图标 */
const LOG_ICON: Record<string, string> = {
  memory: 'calendar',
  feeding: 'fork_knife',
  sleep: 'moon',
}

/**
 * 今天（本地时区的 YYYY-MM-DD）。
 *
 * 不能用 `toISOString().slice(0,10)`——那是 UTC，东八区凌晨会算成前一天，
 * 于是当天的日程会被判成"已经过去"。日期都是 YYYY-MM-DD，可以直接按字符串比大小。
 */
function localToday(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function scheduledLabel(iso: string): string {
  return t('journey.scheduledFor', { date: monthDayLabel(iso) })
}

export default function Journey() {
  // Latest Journey 与 Recent Milestones 都读 store，首页不再另写一套数据
  const { timeline, milestones, calendarEvents, weeklyInsight, status, babyHeader } = useAppState()
  const [recordOpen, setRecordOpen] = useState(false)
  // 今日菜单来自服务端缓存（毫秒级，不等 AI）
  const [menu, setMenu] = useState<MenuTodayResponse | null>(null)
  const [menuLoading, setMenuLoading] = useState(true)

  // 取成局部变量再判空：后面要在点击回调里用它，闭包里重新读 menu 会丢掉非空收窄。
  const menuReason = menu?.reason ?? ''

  const loadMenu = () => {
    getTodayMenu()
      .then((response) => setMenu(response.data))
      .catch(() => setMenu(null))
      .finally(() => setMenuLoading(false))
  }

  useEffect(() => {
    loadTimeline()
    loadMilestones()
    // 顶部两块的数据源。这两个接口各自的详情页早就在用了，首页此前只是没读，
    // 于是拿写死的字符串顶着——新用户会看到一句编造的疫苗提醒和一句带假名字的周报。
    loadCalendarEvents()
    loadWeeklyInsight()
    loadMenu()
  }, [])

  const recentLogs = timeline.slice(0, 2)

  // 最近一条尚未到来的日程。日历事件按日期倒序返回，这里筛出未来的取最早一条。
  // 没有未来日程时整块不渲染，而不是留一个空壳。
  const upcomingEvent = calendarEvents
    .filter((event) => event.date >= localToday())
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  // 周报同理：没有数据就不渲染整块
  const insightLine = weeklyInsight?.advice?.content

  return (
    // 1. 根容器：锁死屏幕 100% 高度 + overflow-hidden，彻底禁止整页回弹和滚动
    <View className="w-screen h-screen bg-white overflow-hidden flex flex-col relative">
      
      {/* 2. 顶部 Header：改走公共 PageHeader，不再自己量一遍系统信息 */}
      <PageHeader
        title={t('journey.title')}
        profile={{ avatar: babyHeader.avatar, ageLabel: babyHeader.ageLabel }}
        onProfilePress={() => navigateToRoute('baby-profile-view')}
        right={
          <View
            className="w-9 h-9 flex items-center justify-center text-on-surface-variant"
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
          {/* 没有未来日程就整块不渲染（此前这里写死了一句疫苗提醒，新用户也会看到） */}
          {upcomingEvent ? (
            <View onClick={() => navigateToRoute(upcomingEvent.route)}>
              <VaccineReminder
                icon="injection"
                title={t('journey.upcoming', { title: upcomingEvent.title })}
                date={scheduledLabel(upcomingEvent.date)}
              />
            </View>
          ) : null}

          {insightLine ? (
            <View onClick={() => navigateToRoute('journey-weekly-insight')}>
              <WeeklyInsight icon="star" title={t('journey.weeklyInsight')} content={insightLine} />
            </View>
          ) : null}

          {/* Recent Milestones */}
          <View className="w-full flex flex-col gap-4">
            <View className="flex justify-between items-end px-1">
              <Text className="text-section-title text-on-surface">{t('journey.recentMilestones')}</Text>
              <Text
                className="text-label text-on-surface-variant"
                onClick={() => navigateToRoute('journey-milestones')}
              >
                {t('journey.more')}
              </Text>
            </View>
            <AsyncSection
              status={status.milestones}
              onRetry={loadMilestones}
              skeletonBlocks={1}
              skeletonHeight={140}
              isEmpty={milestones.length === 0}
              emptyState={
                <View className="bg-card rounded-[24px]">
                  <EmptyState
                    icon="star"
                    title={t('journey.emptyMilestones')}
                    description={t('journey.emptyMilestonesDesc')}
                    actionText={t('journey.addRecord')}
                    onAction={() => setRecordOpen(true)}
                  />
                </View>
              }
            >
              {/* 用里程碑页的同一份数据，避免首页与里程碑页各写一套对不上 */}
              <View className="w-full flex justify-between items-center gap-3">
                {milestones.slice(0, 3).map((milestone) => (
                  <MilestoneCard
                    key={milestone.id}
                    title={milestone.title}
                    date={relativeLabelOf(milestone.date)}
                    image={firstSmileImg}
                  />
                ))}
              </View>
            </AsyncSection>
          </View>

          {/* Latest Journey */}
          <View className="w-full flex flex-col gap-4">
            <View className="flex justify-between items-end px-1">
              <Text className="text-section-title text-on-surface">{t('journey.latest')}</Text>
              <Text
                className="text-label text-on-surface-variant"
                onClick={() => navigateToRoute('journey-list')}
              >
                {t('journey.more')}
              </Text>
            </View>
            {/* 走 AsyncSection：此前 error 被当成"还在加载"，骨架会一直转、没有重试入口 */}
            <AsyncSection
              status={status.timeline}
              onRetry={loadTimeline}
              skeletonBlocks={1}
              skeletonHeight={96}
              isEmpty={recentLogs.length === 0}
              emptyState={
                <View className="bg-card rounded-[24px]">
                  <EmptyState
                    icon="star"
                    title={t('journey.emptyTimeline')}
                    description={t('journey.emptyTimelineDesc')}
                    actionText={t('journey.addRecord')}
                    onAction={() => setRecordOpen(true)}
                  />
                </View>
              }
            >
              <View className="bg-card rounded-[24px] p-4 flex flex-col gap-4">
                {recentLogs.map((entry) => (
                  <JourneyLog
                    key={entry.id}
                    title={entry.title}
                    time={entry.time}
                    description={entry.description}
                    icon={LOG_ICON[entry.type]}
                    bgColor="bg-surface-container-high"
                    iconColor="text-on-surface-variant"
                    tags={[entry.badge]}
                  />
                ))}
              </View>
            </AsyncSection>
          </View>

          {/* Today's Menu —— 内容由后端预生成，首页只读缓存 */}
          <View className="w-full flex flex-col gap-4 overflow-hidden">
            <View className="flex justify-between items-center px-1">
              <Text className="text-section-title text-on-surface">{t('journey.todaysMenu')}</Text>
              {/* 说明文字改成点击弹出。
                  后端给的 reason 常常是一整段（例如「4个月以下宝宝不建议添加辅食…
                  知识库检索当前不可用…因此不生成辅食推荐」），直接铺在标题右边既把
                  标题挤掉，也把一段「解释」当成了正文。收成一个 info 小圆点，
                  需要时再展开——它是次要信息，不该占首屏的主视线。 */}
              {menuReason ? (
                // 外面那层 p-2 -m-2 只为把触摸区域撑大：圆点本身 w-5 h-5 只有 20px，
                // 而它是查看说明的**唯一**入口，20px 在手机上很难点中。负边距让撑大的
                // 热区不占额外布局空间——视觉大小不变，可点范围到 36px。
                <View
                  className="p-2 -m-2"
                  onClick={() =>
                    Taro.showModal({
                      title: t('journey.menuWhyTitle'),
                      content: menuReason,
                      showCancel: false,
                      confirmText: t('journey.menuWhyConfirm'),
                    })
                  }
                >
                  <View className="w-5 h-5 rounded-full border border-outline-variant flex items-center justify-center">
                    <Text className="text-xs font-bold text-on-surface-variant">i</Text>
                  </View>
                </View>
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
                  />
                ))}
              </View>
            ) : (
              // 推荐还没算好、或暂时生成失败时的空态。stale 为真表示后台正在生成
              <View className="bg-card rounded-[24px]">
                <EmptyState
                  icon="fork_knife"
                  title={menu?.stale ? t('journey.menuPreparing') : t('journey.menuEmpty')}
                  description={
                    menu?.error
                      ? t('journey.menuError')
                      : t('journey.menuEmptyDesc')
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
