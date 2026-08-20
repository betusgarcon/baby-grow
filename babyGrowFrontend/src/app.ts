import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import './app.css'
import './app.scss'
import { initMockRoutes } from '@/mock'

function App({ children }: PropsWithChildren<any>) {

  useLaunch(() => {
    console.log('App launched.')
    initMockRoutes()
  })

  return children
}

export default App
