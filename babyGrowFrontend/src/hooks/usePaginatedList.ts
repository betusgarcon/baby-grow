import { useCallback, useEffect, useRef, useState } from 'react'
import type { CursorPage } from '@/types/common'
import type { LoadStatus } from '@/store'

interface Options<T, Q> {
  query: Q
  fetchPage: (query: Q, cursor: string | null) => Promise<{ data: CursorPage<T> }>
}

/**
 * 游标分页列表。
 *
 * 筛选条件变化时重置到第一页；加载更多只追加，不覆盖已有数据。
 * 用请求序号丢弃迟到响应：切筛选后旧请求返回，不能把新结果冲掉。
 */
export function usePaginatedList<T, Q>({ query, fetchPage }: Options<T, Q>) {
  const [items, setItems] = useState<T[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const sequence = useRef(0)
  const queryRef = useRef(query)
  const fetchRef = useRef(fetchPage)
  queryRef.current = query
  fetchRef.current = fetchPage

  const queryKey = JSON.stringify(query)

  const loadFirst = useCallback(async () => {
    const seq = ++sequence.current
    setStatus('loading')
    setItems([])
    setNextCursor(null)
    setHasMore(false)

    try {
      const response = await fetchRef.current(queryRef.current, null)
      if (seq !== sequence.current) return

      const page = response.data
      setItems(page.items)
      setNextCursor(page.nextCursor)
      setHasMore(page.hasMore)
      setStatus('ready')
    } catch {
      if (seq === sequence.current) setStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadFirst()
  }, [queryKey, loadFirst])

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return

    const seq = sequence.current
    setLoadingMore(true)
    try {
      const response = await fetchRef.current(queryRef.current, nextCursor)
      if (seq !== sequence.current) return

      const page = response.data
      setItems((previous) => [...previous, ...page.items])
      setNextCursor(page.nextCursor)
      setHasMore(page.hasMore)
    } catch {
      // 保留已加载内容；用户可再次点击重试
    } finally {
      if (seq === sequence.current) setLoadingMore(false)
    }
  }, [hasMore, loadingMore, nextCursor])

  return {
    items,
    status,
    isEmpty: status === 'ready' && items.length === 0,
    hasMore,
    loadingMore,
    loadMore,
    retry: loadFirst,
  }
}
