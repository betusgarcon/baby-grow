import { useSyncExternalStore } from 'react'

/**
 * 极简的模块级 store。
 *
 * 项目此前没有任何跨页状态，导致改个名字、勾个清单、加个成员，一退出页面
 * 就还原——单看每页都能操作，串起来却是个记不住事的应用。
 *
 * 这里不引入 redux/zustand：需求只是「本次会话内跨页可见」，
 * 一个模块级变量 + 订阅足够，也不需要额外依赖。
 */
export interface Store<T> {
  get: () => T
  set: (updater: (previous: T) => T) => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()

  return {
    get: () => state,
    set: (updater) => {
      state = updater(state)
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * 订阅整个 state。
 *
 * 刻意不做 selector：`useSyncExternalStore` 要求每次返回同一引用，
 * 而 selector 返回新对象会让 React 判定为一直在变。set 时整体替换 state，
 * 引用天然只在真正更新时变化，所以订阅整体最稳。
 */
export function useStoreState<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
