/**
 * API 配置
 *
 * 设计说明：
 * - API_CONFIG 常量对象保留编译期配置默认值
 * - USE_MOCK 改为可变引用，支持运行时热切换
 * - setMockMode() 可在任意时刻切换，所有后续请求立即生效
 *
 * 后端就绪时，只需：
 *   setConfig({ baseUrl: 'https://api.your-backend.com', useMock: false })
 * 所有页面无需任何代码改动
 */

/** 默认配置 */
const DEFAULT_CONFIG = {
  baseUrl: '',
  useMock: true,
  timeout: 10000,
}

/** 运行时可变引用 */
let _config: typeof DEFAULT_CONFIG = { ...DEFAULT_CONFIG }

/** 获取当前配置（getter，确保读取最新值） */
export const getConfig = () => _config

/**
 * 更新 API 配置
 * 可选择性传入部分字段进行局部更新
 *
 * @example
 *   setConfig({ useMock: false })
 *   setConfig({ baseUrl: 'https://api.xxx.com', useMock: false })
 */
export function setConfig(partial: Partial<typeof DEFAULT_CONFIG>) {
  _config = { ..._config, ...partial }
  console.log('[API] Config updated:', _config)
}

/**
 * 切换 Mock 模式
 * 等价于 setConfig({ useMock: enabled })
 */
export function setMockMode(enabled: boolean) {
  setConfig({ useMock: enabled })
}

/** 向后兼容：仍导出常量形式的引用 */
export const API_CONFIG = {
  get BASE_URL() { return _config.baseUrl },
  get USE_MOCK() { return _config.useMock },
  get TIMEOUT() { return _config.timeout },
}

export type ApiConfig = typeof DEFAULT_CONFIG
