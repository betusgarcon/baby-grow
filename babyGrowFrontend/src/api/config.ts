/**
 * API 配置
 *
 * 设计说明：
 * - API_CONFIG 常量对象保留编译期配置默认值
 * - USE_MOCK 改为可变引用，支持运行时热切换
 * - setMockMode() 可在任意时刻切换，所有后续请求立即生效
 *
 * 分阶段接入真实后端时，用 REAL_PATHS 逐个放行，而不是一刀切关掉 mock：
 * 后端尚未实现的接口继续走 mock，已实现的走真实请求，页面因此不会因为
 * 「其它模块还没做」而整片报错。
 */

/** 默认配置 */
const DEFAULT_CONFIG = {
  baseUrl: '',
  useMock: true,
  /** 已接入真实后端、应当绕过 mock 的路径前缀 */
  realPaths: [] as string[],
  timeout: 10000,
}

/**
 * 已经由真实后端提供的接口前缀。
 * 每完成一个后端阶段，把对应前缀加进来即可，无需改页面代码。
 *
 * P0（鉴权 + 宝宝档案）：/api/auth · /api/baby/profile
 * P1（记录闭环）：/api/baby/timeline · /api/baby/media · /api/baby/records · /api/baby/ai-tasks
 * P2（分析模块）：/api/baby/growth · /api/baby/sleep · /api/baby/diet · /api/baby/mood
 * P3（首页推荐）：/api/baby/menu
 * P4（家庭与心愿）：/api/family · /api/wishes
 * P5（收尾）：/api/baby/vaccine · /api/baby/milestones-list · /api/baby/calendar-events · /api/baby/weekly-insight
 *
 * 至此全部接口都已接通，mock 层只在「未配置后端地址」时作为离线演示保留。
 */
export const REAL_API_PATHS = [
  '/api/auth',
  '/api/baby/profile',
  '/api/baby/timeline',
  '/api/baby/media',
  '/api/baby/records',
  '/api/baby/ai-tasks',
  '/api/baby/growth',
  '/api/baby/sleep',
  '/api/baby/diet',
  '/api/baby/mood',
  '/api/baby/menu',
  '/api/family',
  '/api/wishes',
  '/api/baby/vaccine',
  '/api/baby/milestones-list',
  '/api/baby/calendar-events',
  '/api/baby/weekly-insight',
  '/api/baby/recipes',
] as const

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

/** 当前请求是否应当走 mock */
export function shouldUseMock(url: string): boolean {
  if (!_config.useMock) return false
  return !_config.realPaths.some((prefix) => url.startsWith(prefix))
}

/** 向后兼容：仍导出常量形式的引用 */
export const API_CONFIG = {
  get BASE_URL() { return _config.baseUrl },
  get USE_MOCK() { return _config.useMock },
  get REAL_PATHS() { return _config.realPaths },
  get TIMEOUT() { return _config.timeout },
}

export type ApiConfig = typeof DEFAULT_CONFIG
