/**
 * 事件详情（疫苗）的视图数据。
 *
 * 这一页没有 Figma 源数据（Starter 计划配额耗尽），版式与文案取自
 * design_sources/stitch/journey/vaccinum_detail/，属上一轮 AI 产物，后续拿到
 * Figma 源数据后需复核。
 *
 * 后端接口未实现，先用本地 mock。
 */

export interface VaccineAttachment {
  name: string
  /** 附件预览图；没有真实资源时留空，页面渲染占位块而不是假照片 */
  image?: string
}

export interface VaccineDetail {
  title: string
  datetime: string
  location: string
  administeredBy: string
  doseLabel: string
  /** 接种进度 0~1 */
  doseProgress: number
  nextAppointment: string
  nextNote: string
  notes: string
  attachment: VaccineAttachment
}

export const vaccineDetail: VaccineDetail = {
  title: 'Vaccine: HepB',
  datetime: 'October 10, 2023 • 10:30 AM',
  location: "Sunshine Children's Clinic",
  administeredBy: 'Dr. Sarah Chen',
  doseLabel: '2nd of 3',
  doseProgress: 2 / 3,
  nextAppointment: 'Nov 10, 2023',
  nextNote: 'A reminder will be sent 24h before.',
  notes:
    'Leo was very brave! A bit of redness at the injection site, monitored for 24 hours. No fever reported during the night. He slept well after the visit.',
  attachment: { name: 'Vaccination Record Card.jpg' },
}
