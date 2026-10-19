import { useMemo, useState } from 'react'
import Taro from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import PageContainer from '@/components/PageContainer'
import PageHeader from '@/components/PageHeader'
import AsyncSection from '@/components/AsyncSection'
import EmptyState from '@/components/EmptyState'
import Icon from '@/components/Icon'
import { navigateToRoute } from '@/utils/routes'
import { setPosterMemories } from '@/store'
import { t } from '@/i18n'
import { getMemories } from '@/api/modules/memories'
import { usePaginatedList } from '@/hooks/usePaginatedList'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import MemoryFilterSheet from './components/MemoryFilterSheet'
import {
  TONE_CLASS,
  defaultFilters,
  memoryCategoryLabel,
  type FilterKey,
  type MemoryItem,
} from './memoriesData'

export default function FamilyMemoriesPage() {
  const [selected, setSelected] = useState<string[]>([])
  /** 已生效的筛选条件；草稿在面板里改，Apply 才落到这里 */
  const [filters, setFilters] = useState<Record<FilterKey, string>>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<Record<FilterKey, string>>(defaultFilters)
  const [filterOpen, setFilterOpen] = useState(false)
  /** 关键词搜索。此前入口是个放大镜、但页面上只有筛选、没有文本输入 */
  const [keyword, setKeyword] = useState('')

  // 筛选全部下沉到服务端：只在前端筛当前页会漏掉后面的数据
  const debouncedKeyword = useDebouncedValue(keyword, 300)
  const query = useMemo(
    () => ({
      range: filters.time,
      category: filters.category || undefined,
      media: filters.media || undefined,
      q: debouncedKeyword.trim() || undefined,
      limit: 20,
    }),
    [filters, debouncedKeyword],
  )

  const { items, status, isEmpty, hasMore, loadingMore, loadMore, retry } = usePaginatedList({
    query,
    fetchPage: (params, cursor) => getMemories({ ...params, cursor }),
  })

  const toggleSelect = (id: string) => {
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    )
  }

  const copyLink = async () => {
    await Taro.setClipboardData({ data: 'https://nurture-bloom.app/s/leo-space' })
    Taro.showToast({ title: t('memories.linkCopied'), icon: 'none' })
  }

  const actionBar =
    selected.length > 0 ? (
      <View className="w-full box-border px-4 pb-4 pt-2">
        <View className="w-full box-border px-4 py-3 rounded-full bg-primary flex items-center gap-3">
          <View className="w-9 h-9 shrink-0 rounded-full bg-family-clay flex items-center justify-center">
            <Text className="text-card-title font-semibold text-[#ffffff]">{selected.length}</Text>
          </View>

          <Text className="flex-1 text-card-title text-[#ffffff]">{t('memories.selected')}</Text>

          <View
            className="py-2 px-4 rounded-full bg-surface-container-high flex items-center gap-1"
            onClick={copyLink}
          >
            <Icon name="link" className="w-4 h-4" />
            <Text className="text-label font-semibold text-on-surface">{t('memories.link')}</Text>
          </View>

          <View
            className="py-2 px-4 rounded-full bg-secondary flex items-center gap-1"
            onClick={() => {
              // 把勾选的记忆带过去。此前只做了跳转，海报页对勾选一无所有
              setPosterMemories(items.filter((item) => selected.includes(item.id)))
              navigateToRoute('family-poster')
            }}
          >
            <Icon name="photo-gallery" className="w-4 h-4" />
            <Text className="text-label font-semibold text-[#ffffff]">{t('memories.poster')}</Text>
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
          <Text className="text-caption font-semibold">{memoryCategoryLabel(item.category)}</Text>
        </View>

        <Text className="text-card-title text-on-surface">{item.title}</Text>
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
          title={t('memories.title')}
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
            placeholder={t('memories.searchPlaceholder')}
            placeholderClass="text-on-surface-variant"
            onInput={(event) => setKeyword(event.detail.value)}
          />
        </View>

        <AsyncSection
        status={status}
        isEmpty={isEmpty}
        emptyState={
          <EmptyState
            icon="search"
            title={t('memories.empty')}
            description={t('memories.emptyDesc')}
          />
        }
        onRetry={retry}
        skeletonBlocks={2}
        skeletonHeight={200}
      >
        {status === 'ready' && !isEmpty ? (
          <View className="w-full flex flex-col gap-5">
            <View className="w-full flex flex-wrap justify-between gap-y-5">
              {items.map(renderCard)}
            </View>

            <View className="py-2 flex items-center justify-center">
              {hasMore ? (
                <View
                  className="px-6 py-3 rounded-full bg-surface-container active:opacity-70"
                  onClick={loadMore}
                >
                  <Text className="text-caption text-on-surface">
                    {loadingMore ? t('common.loading') : t('common.loadMore')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
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
