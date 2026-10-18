/**
 * 媒体上传。
 *
 * 走 Taro.uploadFile（multipart），不能复用 request.ts —— 那里是 JSON 请求。
 * 但响应的解析约定是一致的：{code, data, message}，code 非 0 即失败。
 */

import Taro from '@tarojs/taro'
import { API_CONFIG } from '../config'
import { getToken } from '../token'
import { UNAUTHORIZED_CODE, awaitAuthGate, tryReauthenticate } from '../request'
import { getLanguage } from '@/i18n'

export interface UploadResponse {
  mediaId: number
  url: string
  kind: 'image' | 'video' | 'audio'
}

interface RawEnvelope {
  code: number
  data: UploadResponse
  message: string
}

/**
 * @param retriedAfterReauth 内部使用，保证 401 后最多只重发一次
 */
export async function uploadMedia(filePath: string, retriedAfterReauth = false): Promise<UploadResponse> {
  // 没有后端地址时直接说清楚。此前会拼出一个相对 URL 交给 uploadFile，
  // 失败信息与「后端没配」这件事毫无关联，排查全靠猜。
  if (!API_CONFIG.BASE_URL) {
    throw new Error('未配置后端地址，无法上传')
  }

  // 必须等登录落地。这条路径绕开了 request()，而页面在 App.onLaunch 之后立刻就会
  // 取数——不等的话，冷启动时用户先选了照片就会带着空 token 上传，后端判未登录，
  // 表现成「只有上传失败，别的接口都正常」。
  await awaitAuthGate()

  const token = getToken()

  const result = await Taro.uploadFile({
    url: `${API_CONFIG.BASE_URL}/api/baby/media`,
    filePath,
    name: 'file',
    // 这条路径绕过了 request()，语言头要单独补——否则上传失败的提示永远只会是中文
    header: {
      'Accept-Language': getLanguage(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  let body: RawEnvelope
  try {
    body = JSON.parse(result.data)
  } catch {
    throw new Error('上传失败：服务端返回了非 JSON 内容')
  }

  if (body.code !== 0) {
    // 与 request() 一致：登录态失效就重登一次再重发，只重发一次。
    if (body.code === UNAUTHORIZED_CODE && !retriedAfterReauth) {
      const reauthenticated = await tryReauthenticate()
      if (reauthenticated) {
        return uploadMedia(filePath, true)
      }
    }
    throw new Error(body.message || '上传失败')
  }

  return body.data
}
