import Taro from '@tarojs/taro'
import { loadBabyHeader } from '@/store'

/**
 * 家庭就绪之后进入应用：先刷新全站共用的导航栏数据，再进首页。
 *
 * 抽出来是因为「创建家庭」与「接受邀请」两个出口要走同一段收尾。少刷一次
 * loadBabyHeader()，导航栏就会停在「还没有家庭」时那次请求失败留下的空白，
 * 用户明明已经建好了家，顶部却还是没名字没头像。
 */
export async function enterApp(): Promise<void> {
  await loadBabyHeader()
  Taro.reLaunch({ url: '/pages/journey/index' })
}
