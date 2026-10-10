import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import './app.css'
import './app.scss'
import { initMockRoutes } from '@/mock'
import { bootstrapApi } from '@/api/bootstrap'

function App({ children }: PropsWithChildren<any>) {

  useLaunch(() => {
    console.log('App launched.')
    initMockRoutes()
    // 配置后端地址并静默登录；未配置后端时自动退回 mock
    void bootstrapApi()
  })

  return children
}

export default App
