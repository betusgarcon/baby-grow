import Taro from '@tarojs/taro'
import { View, Text, Image } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import Icon from '@/components/Icon'
import babyAvatar from '@/assets/images/baby-journey-img.png'
import MetricCard from './components/MetricCard'
import SleepConsistencyCard from './components/SleepConsistencyCard'
import HighlightCard from './components/HighlightCard'
import { weeklyInsight } from './weeklyInsightData'

export default function JourneyWeeklyInsightPage() {
  const data = weeklyInsight

  return (
    <PageContainer
      background="bg-surface-container-lowest"
      header={
        <PageHeader
          showBack
          title="Weekly Insights"
          subtitle={data.rangeLabel}
          right={
            <View className="w-10 h-10 rounded-full border border-outline-variant overflow-hidden flex items-center justify-center">
              <Image src={babyAvatar} className="w-9 h-9 rounded-full" mode="aspectFill" />
            </View>
          }
        />
      }
    >
      <View className="flex flex-col gap-6">
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

        <View
          className="w-full box-border py-4 px-6 rounded-lg bg-primary flex items-center justify-center gap-2"
          onClick={() => Taro.showToast({ title: '分享待开发', icon: 'none' })}
        >
          <Text className="text-xl font-semibold text-[#ffffff]">Share Report</Text>
          <Icon name="event-share" className="w-5 h-5" />
        </View>
      </View>
    </PageContainer>
  )
}
