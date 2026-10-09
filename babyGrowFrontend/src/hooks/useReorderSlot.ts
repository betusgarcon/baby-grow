import { useEffect, useRef, useState } from 'react'
import Taro from '@tarojs/taro'

interface ReorderSlot {
  /** 每一行的落点高度（行高 + 间距），实测得到；未测出时为 0 */
  slotHeight: number
  /** 拖拽过程中记录当前位置，接到 MovableView 的 onChange 上 */
  onDragChange: (y: number) => void
  /** 松手时算出目标下标；不构成换位时返回 null */
  resolveTarget: (fromIndex: number) => number | null
}

/**
 * 可拖拽列表的落点计算。
 *
 * 为什么必须实测行高：MovableView 的 y 单位是真实像素，而项目的布局基于 rem，
 * 两者对不上。设计值乘系数在真机上会随 rem 解析方式漂移，只有运行时量出来的
 * 高度才是可靠的。
 *
 * 用法：写一个探针节点并给它 probeId；进入可拖拽状态时探针渲染出来，
 * 量到高度后调用方再切到 MovableArea 布局。
 */
export function useReorderSlot(
  length: number,
  probeId: string,
  gap: number,
  enabled: boolean,
): ReorderSlot {
  const [slotHeight, setSlotHeight] = useState(0)
  const dragY = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setSlotHeight(0)
      return
    }

    // 等探针那一帧渲染完再量，直接量会拿到 0
    const timer = setTimeout(() => {
      Taro.createSelectorQuery()
        .select(`#${probeId}`)
        .boundingClientRect((rect) => {
          const measured = rect as { height?: number } | null

          if (measured?.height) setSlotHeight(measured.height + gap)
        })
        .exec()
    }, 60)

    return () => clearTimeout(timer)
  }, [enabled, probeId, gap, length])

  const onDragChange = (y: number) => {
    dragY.current = y
  }

  const resolveTarget = (fromIndex: number) => {
    const droppedY = dragY.current

    dragY.current = null

    if (!slotHeight || droppedY === null) return null

    const target = Math.min(Math.max(Math.round(droppedY / slotHeight), 0), length - 1)

    return target === fromIndex ? null : target
  }

  return { slotHeight, onDragChange, resolveTarget }
}

/** 把 fromIndex 的项挪到 toIndex，返回新数组 */
export function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)

  next.splice(toIndex, 0, moved)

  return next
}
