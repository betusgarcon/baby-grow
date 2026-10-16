import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import './app.css'
import './app.scss'
import { initMockRoutes } from '@/mock'
import { bootstrapApi } from '@/api/bootstrap'
import { getConfig } from '@/api/config'
import { fetchMe } from '@/api/modules/auth'
import { loadBabyHeader } from '@/store'

/** 没有家庭时要去的地方。见下方 start() 的说明 */
const ONBOARDING_PATH = '/pages/onboarding/index'

/**
 * 启动序列：配置后端地址 → 静默登录 → 判断这个账号有没有家庭 → 取导航栏数据。
 *
 * 「没有家庭」是一个**合法的初始状态**，不是异常：家庭现在由用户在引导页显式创建
 * 或用口令加入。此时不能去拉家庭域的数据（那些接口会 403），而是先把人送去引导页。
 */
async function start() {
  // 配置后端地址并静默登录；未配置后端时自动退回 mock
  await bootstrapApi()

  // mock 模式下没有「家庭」这个概念，强行跳引导页会把人赶出演示态。
  // 另外 /api/auth/me 也没有注册 mock 路由，那种情况下它会返回 code = -1。
  if (!getConfig().baseUrl) {
    void loadBabyHeader()
    return
  }

  try {
    const response = await fetchMe()

    if (response.code === 0 && !response.data?.familyId) {
      await Taro.reLaunch({ url: ONBOARDING_PATH })
      return
    }
  } catch (error) {
    // 拿不到登录态就按「已有家庭」继续：各页面会自己进入错误态并给出重试入口
    console.error('[app] 读取登录态失败，按已有家庭继续', error)
  }

  // 导航栏的「头像 + 名字 + 月龄」全站共用一份，启动时取一次即可。
  // 请求会被登录闸门挡住，等 token 落地后才真正发出（见 api/request.ts）。
  void loadBabyHeader()
}

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
    initMockRoutes()
    void start()
  })

  return children
}

export default App
