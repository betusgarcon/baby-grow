import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import babyAvatar from '@/figma_demo/images/baby-avatar-5a3dae.png'
import iconEdit from '@/figma_demo/images/icon-edit.svg'
import iconLittleLion from '@/figma_demo/images/icon-little-lion.svg'
import iconAge from '@/figma_demo/images/icon-age.svg'
import iconGender from '@/figma_demo/images/icon-gender.svg'
import iconConstellation from '@/figma_demo/images/icon-constellation.svg'
import iconFavoriteToy from '@/figma_demo/images/icon-favorite-toy.svg'
import iconSleepRoutine from '@/figma_demo/images/icon-sleep-routine.svg'
import iconFeeding from '@/figma_demo/images/icon-feeding.svg'
import iconBack from '@/figma_demo/images/icon-back.svg'
import iconMenu from '@/figma_demo/images/icon-menu.svg'

interface MetricItem {
  icon: string
  label: string
  value: string
  iconBgColor?: string
}

interface PreferenceItem {
  icon: string
  title: string
  description: string
}

const basicMetrics: MetricItem[] = [
  { icon: iconAge, label: 'Age', value: '6 Months' },
  { icon: iconGender, label: 'Gender', value: 'Boy', iconBgColor: '#FED5B9' },
  { icon: iconConstellation, label: 'Constellation', value: 'Leo' },
]

const preferences: PreferenceItem[] = [
  { icon: iconFavoriteToy, title: 'Favorite Toy', description: 'Soft blocks' },
  { icon: iconSleepRoutine, title: 'Sleep Routine', description: 'Loves white noise' },
  { icon: iconFeeding, title: 'Feeding', description: 'Just started solids' },
]

export default function HomePage() {
  return (
    <View className="w-full min-h-screen bg-surface relative">
      {/* Header - TopAppBar */}
      <View
        className="fixed top-0 left-0 right-0 z-50 flex flex-row items-center justify-between px-5 py-3"
        style={{
          backgroundColor: 'rgba(255, 248, 241, 0.8)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 1px 2px rgba(30, 27, 23, 0.05)',
        }}
      >
        <View
          className="flex justify-center items-center p-2.5 rounded-full"
          onClick={() => Taro.navigateBack()}
        >
          <Image src={iconBack} className="w-4 h-4" mode="aspectFit" />
        </View>
        <Text className="text-base font-normal text-primary font-plus-jakarta">Baby Profile</Text>
        <View
          className="flex justify-center items-center p-2.5 rounded-full"
          onClick={() => console.log('menu clicked')}
        >
          <Image src={iconMenu} className="h-4" mode="aspectFit" />
        </View>
      </View>

      {/* Main Content */}
      <View className="flex flex-col items-center px-5 pt-24 pb-32 gap-8">
        {/* Profile Section */}
        <View className="flex flex-col items-center gap-4">
          {/* Avatar Container */}
          <View className="relative w-44 h-44 flex items-center justify-center">
            {/* Gradient Background */}
            <View
              className="absolute w-44 h-44 rounded-full opacity-40"
              style={{
                background: 'linear-gradient(45deg, #FED5B9 0%, #F7FFF7 100%)',
                filter: 'blur(4px)',
              }}
            />
            {/* Avatar Circle */}
            <View
              className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white"
              style={{ boxShadow: '0 20px 40px -10px rgba(118, 88, 66, 0.08)' }}
            >
              <Image src={babyAvatar} className="w-full h-full" mode="aspectFill" />
            </View>
            {/* Edit Button */}
            <View
              className="absolute bottom-0 right-0 w-8 h-9 rounded-full flex items-center justify-center bg-primary"
              style={{ boxShadow: '0 4px 6px -4px rgba(0, 0, 0, 0.1), 0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              onClick={() => console.log('edit avatar')}
            >
              <Image src={iconEdit} className="w-[15px] h-[15px]" mode="aspectFit" />
            </View>
          </View>

          {/* Name and Badge */}
          <View className="flex flex-col items-center gap-2 pt-4">
            <Text className="text-2xl font-semibold text-on-surface font-plus-jakarta leading-8">Leo</Text>
            <View className="flex flex-row items-center gap-1 px-3 py-1 rounded-full bg-secondary-container">
              <Image src={iconLittleLion} className="w-[13px] h-[13px]" mode="aspectFit" />
              <Text className="text-sm font-semibold text-on-secondary-fixed-variant tracking-[0.01em] font-nunito-sans">
                Little Lion
              </Text>
            </View>
          </View>
        </View>

        {/* Basic Info Section: Bento Grid */}
        <View className="grid grid-cols-2 gap-4 w-full">
          {basicMetrics.map((metric) => (
            <View
              key={metric.label}
              className="flex flex-row items-center p-4 gap-4 h-[82px] rounded-[32px] col-span-2"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(6px)',
              }}
            >
              {/* Icon Background */}
              <View
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: metric.iconBgColor || '#F7FFF7' }}
              >
                <Image
                  src={metric.icon}
                  className="w-5 h-5"
                  mode="aspectFit"
                />
              </View>
              {/* Text Content */}
              <View className="flex flex-col gap-1 flex-1">
                <Text className="text-xs font-normal text-on-surface-variant font-nunito-sans">{metric.label}</Text>
                <Text className="text-base font-normal text-on-surface font-plus-jakarta leading-6">{metric.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Preferences Section */}
        <View className="flex flex-col gap-4 w-full">
          {/* Section Header */}
          <View className="flex flex-row items-center justify-between w-full">
            <Text className="text-base font-normal text-on-surface font-plus-jakarta leading-6">Preferences</Text>
            <Text className="text-sm font-semibold text-primary tracking-[0.01em] font-nunito-sans">
              Edit All
            </Text>
          </View>

          {/* Preference Items */}
          <View className="flex flex-col gap-3">
            {preferences.map((item) => (
              <View
                key={item.title}
                className="flex flex-row items-center p-4 gap-4 rounded-[32px] bg-surface-container-low"
              >
                {/* Icon Background */}
                <View className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center">
                  <Image
                    src={item.icon}
                    className="w-5 h-5"
                    mode="aspectFit"
                  />
                </View>
                {/* Text Content */}
                <View className="flex flex-col flex-1 gap-1">
                  <Text className="text-sm font-semibold text-on-surface font-nunito-sans leading-5">{item.title}</Text>
                  <Text className="text-base font-normal text-on-surface-variant font-plus-jakarta leading-6">
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}
