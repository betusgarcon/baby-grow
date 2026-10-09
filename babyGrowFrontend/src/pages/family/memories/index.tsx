import { useEffect, useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import { useAppState, loadMemories } from '@/store'
import MemoryFilterSheet from './components/MemoryFilterSheet'
import { TONE_CLASS, defaultFilters, type FilterKey, type MemoryItem } from './memoriesData'

export default function FamilyMemoriesPage() {
  // 记忆来自 store，加载状态也由它给
  const { memories, status } = useAppState()
  const [selected, setSelected] = useState<string[]>([])
  /** 已生效的筛选条件；草稿在面板里改，Apply 才落到这里 */
  const [filters, setFilters] = useState<Record<FilterKey, string>>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<Record<FilterKey, string>>(defaultFilters)
  const [filterOpen, setFilterOpen] = useState(false)
  /** 关键词搜索。此前入口是个放大镜、但页面上只有筛选、没有文本输入 */
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    loadMemories()
  }, [])

  const visibleItems = useMemo(() => {
    const query = keyword.trim().toLowerCase()

    return memories.filter((item) => {
      if (filters.category && !item.tags.includes(filters.category)) return false
      if (filters.media && item.media !== filters.media) return false

      if (query) {
        const haystack = `${item.title} ${item.category} ${item.tags.join(' ')}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }

      return true
    })
  }, [memories, filters, keyword])

  const toggleSelect = (id: string) => {
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    )
  }

  const copyLink = async () => {
    await Taro.setClipboardData({ data: 'https://nurture-bloom.app/s/leo-space' })
    Taro.showToast({ title: '已复制分享链接', icon: 'none' })
  }

  const actionBar =
    selected.length > 0 ? (
      <View className="w-full box-border px-4 pb-4 pt-2">
        <View className="w-full box-border px-4 py-3 rounded-full bg-primary flex items-center gap-3">
          <View className="w-9 h-9 shrink-0 rounded-full bg-family-clay flex items-center justify-center">
            <Text className="text-base font-bold text-[#ffffff]">{selected.length}</Text>
          </View>

          <Text className="flex-1 text-base font-semibold text-[#ffffff]">Selected</Text>

          <View
            className="py-2 px-4 rounded-full bg-surface-container-high flex items-center gap-1"
            onClick={copyLink}
          >
            <Icon name="link" className="w-4 h-4" />
            <Text className="text-sm font-semibold text-on-surface">Link</Text>
          </View>

          <View
            className="py-2 px-4 rounded-full bg-secondary flex items-center gap-1"
            onClick={() => navigateToRoute('family-poster')}
          >
            <Icon name="photo-gallery" className="w-4 h-4" />
            <Text className="text-sm font-semibold text-[#ffffff]">Poster</Text>
          </View>
        </View>
      </View>
    ) : undefined

  const renderCard = (item: MemoryItem) => {
    const tone = TONE_CLASS[item.tone]
    const isSelected = selected.includes(item.id)

    return (
      <View
        key={item.id}
        className="w-[48%] flex flex-col gap-2"
        onClick={() => toggleSelect(item.id)}
      >
        {/* 没有真实照片资源，用分类同色系浅底占位，选择态仍然如实反映 */}
        <View className={`relative w-full h-40 rounded-3xl overflow-hidden ${tone.photo}`}>
          <View
            className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center box-border ${
              isSelected ? 'bg-primary' : 'border-2 border-[#ffffff]'
            }`}
          >
            {isSelected ? <Icon name="check-light" className="w-3.5 h-3.5" /> : null}
          </View>
        </View>

        <View className={`self-start py-1 px-3 rounded-full ${tone.pill}`}>
          <Text className="text-caption font-bold">{item.category}</Text>
        </View>

        <Text className="text-base font-semibold text-on-surface">{item.title}</Text>
        <Text className="text-caption text-on-surface-variant">{item.date}</Text>
      </View>
    )
  }

  return (
    <PageContainer
      bottomBar={actionBar}
      header={
        <PageHeader
          showBack
          title="Memories"
          right={
            <View
              className="w-9 h-9 flex items-center justify-center"
              onClick={() => {
                setDraftFilters(filters)
                setFilterOpen(true)
              }}
            >
              <Icon name="filter" className="w-5 h-5" />
            </View>
          }
        />
      }
    >
      <View className="flex flex-col gap-4">
        <View className="w-full box-border h-11 px-4 rounded-full bg-surface-container flex items-center gap-2">
          <Icon name="search" className="w-4 h-4 shrink-0" />
          <Input
            className="flex-1 text-base text-on-surface"
            value={keyword}
            placeholder="搜索记忆标题或分类…"
            placeholderClass="text-on-surface-variant"
            onInput={(event) => setKeyword(event.detail.value)}
          />
        </View>

        <AsyncSection status={status.memories} onRetry={loadMemories} skeletonBlocks={2} skeletonHeight={200}>
        {visibleItems.length > 0 ? (
          <View className="w-full flex flex-wrap justify-between gap-y-5">
            {visibleItems.map(renderCard)}
          </View>
        ) : (
          <EmptyState
            icon="search"
            title="No memories found"
            description="Try adjusting your filters to find those special moments."
            actionText="Adjust Filters"
            onAction={() => {
              setDraftFilters(filters)
              setFilterOpen(true)
            }}
          />
        )}
        </AsyncSection>
      </View>

      {filterOpen ? (
        <MemoryFilterSheet
          filters={draftFilters}
          onChange={(key, value) => setDraftFilters((previous) => ({ ...previous, [key]: value }))}
          onReset={() => setDraftFilters(defaultFilters)}
          onApply={() => {
            setFilters(draftFilters)
            setFilterOpen(false)
          }}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}
    </PageContainer>
  )
}
