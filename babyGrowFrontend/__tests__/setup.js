// 这些用例只测纯逻辑（文案、格式化、海报排版计算），不需要 Taro 运行时。
// 把 Taro 的最小 API 打桩，避免 jsdom 下去初始化小程序的页面路由。
jest.mock('@tarojs/taro', () => {
  const storage = {}
  const Taro = {
    getStorageSync: jest.fn((key) => storage[key] ?? ''),
    setStorageSync: jest.fn((key, value) => {
      storage[key] = value
    }),
    reLaunch: jest.fn(),
    redirectTo: jest.fn(),
    navigateTo: jest.fn(),
    getCurrentPages: jest.fn(() => []),
    showToast: jest.fn(),
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    createCanvasContext: jest.fn(),
    canvasToTempFilePath: jest.fn(),
  }
  return { __esModule: true, default: Taro, ...Taro }
})
