import { useEffect, useState } from 'react'

/** 输入类筛选的防抖：每敲一个字都打一次接口既慢又会乱序。 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
