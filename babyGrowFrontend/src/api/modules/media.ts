/**
 * 媒体上传。
 *
 * 走 Taro.uploadFile（multipart），不能复用 request.ts —— 那里是 JSON 请求。
 * 但响应的解析约定是一致的：{code, data, message}，code 非 0 即失败。
 */

import Taro from '@tarojs/taro'
import { API_CONFIG } from '../config'
import { getToken } from '../token'

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

export async function uploadMedia(filePath: string): Promise<UploadResponse> {
  const token = getToken()

  const result = await Taro.uploadFile({
    url: `${API_CONFIG.BASE_URL}/api/baby/media`,
    filePath,
    name: 'file',
    header: token ? { Authorization: `Bearer ${token}` } : {},
  })

  let body: RawEnvelope
  try {
    body = JSON.parse(result.data)
  } catch {
    throw new Error('上传失败：服务端返回了非 JSON 内容')
  }

  if (body.code !== 0) {
    throw new Error(body.message || '上传失败')
  }

  return body.data
}
