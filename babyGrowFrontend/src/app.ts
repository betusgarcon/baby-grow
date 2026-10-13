import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import './app.css'
import './app.scss'
import { initMockRoutes } from '@/mock'
import { bootstrapApi } from '@/api/bootstrap'
import { loadBabyHeader } from '@/store'

function App({ children }: PropsWithChildren<any>) {

  useLaunch(() => {
    console.log('App launched.')
    initMockRoutes()
    // 配置后端地址并静默登录；未配置后端时自动退回 mock
    void bootstrapApi()
    // 导航栏的「头像 + 名字 + 月龄」全站共用一份，启动时取一次即可。
    // 请求会被登录闸门挡住，等 token 落地后才真正发出（见 api/request.ts）。
    void loadBabyHeader()
  })

  return children
}

export default App
