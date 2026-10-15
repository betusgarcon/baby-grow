import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApiResponse } from '@/types/common'
import type { LoadStatus } from '@/store'

export interface AsyncData<T> {
  /** 与 store 的 slice 状态同义，可直接喂给 AsyncSection */
  status: LoadStatus
  data: T | null
  /** 失败后重试。接到 AsyncSection 的 onRetry 上 */
  retry: () => void
}

/**
 * 页面局部取数的三态封装。
 *
 * 为什么需要它：分析页原本是这个写法 ——
 *
 *   getGrowthPage().then(r => setPageData(r.data)).finally(() => setLoading(false))
 *   if (loading || !pageData) return <View><Text>Loading...</Text></View>
 *
 * 没有 `.catch`，所以请求一失败 `pageData` 永远为 null，页面就**永久停在
 * 一个裸的 "Loading..."**（而且没套外层布局，连页头都没有，看起来就是白板）。
 *
 * 它返回的 status 与 store 的 LoadStatus 是同一个类型，于是页面局部数据也能直接
 * 交给 AsyncSection，全站只剩一套四态（骨架 / 失败 / 空 / 内容）模式。
 *
 * 只跑一次（挂载时）。带参数的重新取数请把参数变成 state 后由调用方重新挂载，
 * 或在页面里自己处理——本项目这六个分析页都是进页面取一次，交互只在本地切区间/指标。
 *
 * @param fetcher 返回统一响应信封的取数函数，内部按 `code !== 0` 判失败，
 *                与 store 里 `load()` 的约定一致
 */
export function useAsyncData<T>(fetcher: () => Promise<ApiResponse<T>>): AsyncData<T> {
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [data, setData] = useState<T | null>(null)

  // fetcher 通常是内联箭头函数，每次渲染都是新的。放进 ref 是为了让下面的 effect
  // 不依赖它——否则每渲染一次就重取一次。
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  // 请求序号 + 卸载标记。
  //
  // 序号：双击「重试」会让同一个组件同时有两个请求在飞，先发的那个若后到，
  // 就会把已经显示的新数据覆盖回旧的（而且状态从 ready 退回 loading）。
  // 卸载标记：请求还没回来就离开页面时，往回 setState 是打在已卸载的组件上。
  const sequenceRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(() => {
    const sequence = sequenceRef.current + 1
    sequenceRef.current = sequence

    setStatus('loading')
    fetcherRef
      .current()
      .then((response) => {
        if (response.code !== 0) throw new Error(response.message)
        // 已被更新的一次取数取代，或组件已经卸载：这次结果直接丢弃
        if (sequenceRef.current !== sequence || !mountedRef.current) return
        setData(response.data)
        setStatus('ready')
      })
      .catch((error) => {
        if (sequenceRef.current !== sequence || !mountedRef.current) return
        console.error('[useAsyncData] 取数失败', error)
        setStatus('error')
      })
  }, [])

  // 上面的 ref 更新 effect 先声明，所以挂载时它会先于这里执行
  useEffect(() => {
    load()
  }, [load])

  return { status, data, retry: load }
}
