import { useEffect } from 'react'
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import { View, Text, Button } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import MetricCard from './components/MetricCard'
import SleepConsistencyCard from './components/SleepConsistencyCard'
import HighlightCard from './components/HighlightCard'
import { weeklyInsight } from './weeklyInsightData'

export default function JourneyWeeklyInsightPage() {
  const data = weeklyInsight

  // 右上角菜单里同时放出「发送给朋友」和「分享到朋友圈」。
  // 当前 Taro 版本的 showShareMenu 类型里没有 menus 字段，但小程序基础库支持，
  // 所以先落到变量上再断言，绕开对象字面量的多余属性检查。
  useEffect(() => {
    const shareMenuOptions = {
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    }

    Taro.showShareMenu(shareMenuOptions as Parameters<typeof Taro.showShareMenu>[0])
  }, [])

  useShareAppMessage(() => ({
    title: `Leo 的每周小记 · ${data.rangeLabel}`,
    path: '/pages/journey/weekly-insight/index',
  }))

  useShareTimeline(() => ({
    title: `Leo 的每周小记 · ${data.rangeLabel}`,
  }))

  return (
    <PageContainer
      background="bg-surface-container-lowest"
      header={
        <PageHeader showBack title="Weekly Insights" />
      }
    >
      <View className="flex flex-col gap-6">
        {/* 日期区间从导航栏移到正文顶部，字号放大并与标题同色 */}
        <Text className="text-2xl font-bold text-secondary">{data.rangeLabel}</Text>

        <View className="flex gap-3">
          {data.metrics.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </View>

        <SleepConsistencyCard sleep={data.sleep} />

        <View className="flex flex-col gap-3">
          <Text className="text-xl font-semibold text-secondary px-1">
            Developmental Highlights
          </Text>

          {data.highlights.map((highlight) => (
            <HighlightCard key={highlight.id} highlight={highlight} />
          ))}
        </View>

        <View className="relative w-full box-border p-6 rounded-xl bg-surface-container-lowest shadow-card-soft overflow-hidden flex flex-col gap-3">
          {/* 角落装饰。设计稿这层带模糊，小程序对 blur 支持不稳，
              用径向渐变衰减到全透明来近似 */}
          <View
            className="absolute -top-8 -right-8 w-36 h-36"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,220,196,0.75) 0%, rgba(255,220,196,0) 72%)',
            }}
          />

          <View className="relative flex items-center gap-3">
            <View className="w-8 h-8 shrink-0 rounded-full bg-primary flex items-center justify-center">
              <Icon name="sparkle-light" className="w-4 h-4" />
            </View>

            <Text className="text-base font-bold text-primary">{data.advice.title}</Text>
          </View>

          <Text className="relative text-base text-on-surface-variant">{data.advice.content}</Text>
        </View>

        {/* 必须用 openType="share"，普通 onClick 调不起小程序的分享面板 */}
        <Button
          openType="share"
          className="share-button w-full box-border py-4 px-6 rounded-lg bg-primary flex items-center justify-center gap-2"
        >
          <Text className="text-xl font-semibold text-[#ffffff]">Share Report</Text>
          <Icon name="event-share" className="w-5 h-5" />
        </Button>
      </View>
    </PageContainer>
  )
}
