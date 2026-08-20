/**
 * 宝宝资料相关类型
 */

/** 宝宝基础信息 */
export interface BabyProfile {
  id: string
  name: string
  ageLabel: string
  statusLabel?: string
  avatar: string
  gender?: 'male' | 'female'
  birthday?: string
}

/** 宝宝资料接口响应 */
export interface BabyProfileResponse {
  profile: BabyProfile
}
