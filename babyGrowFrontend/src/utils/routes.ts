import Taro from '@tarojs/taro'

/**
 * 全站路由图。
 *
 * route id 取自 design_sources/stitch/prototype_demo/routes.js 的原型路由表，
 * 那份表同时记录了每条路由的 actions（可跳往哪些页面），是本次页面还原的跳转依据。
 *
 * 这里只登记「已实现」的页面：未登记的 id 由 navigateToRoute 兜底 toast。
 * 这样分批交付时工程始终可运行，也避免为还不存在的页面预先编造路径。
 *
 * 注意两类原型条目不是路由，因此不进这个表：
 * - 状态条目（journey-loading / journey-empty / wishes-loading / wishes-empty /
 *   family-search-empty / family-search-loading / family-filter / family-filtered-results /
 *   journey-calendar-select / wishes-museum-edit / wishes-number-edit / family-invite-token）：
 *   它们是同一个页面的状态变体，由页面内部的状态模型渲染，不单独占路由。
 * - 记录流程（record-center / record-text / record-photo / record-photo-text / record-text-ai）：
 *   Figma 里是一组弹层（分组 922:555），以浮层组件实现，见 components/RecordSheet。
 */
export type RouteId =
  // Journey 时光旅程
  | 'journey-home'
  | 'journey-list'
  | 'journey-weekly-insight'
  | 'journey-milestones'
  | 'journey-calendar'
  | 'journey-vaccine'
  // 宝宝档案（Figma 分组 923:557「导航栏头像 icon - 宝宝基础信息」）
  | 'baby-profile-view'
  | 'baby-profile-edit'
  | 'baby-profile-preferences'
  | 'baby-profile-photo'
  // Analysis 数据分析
  | 'data-growth'
  | 'data-sleep-day'
  | 'data-sleep-month'
  | 'data-diet-week'
  | 'data-diet-month'
  | 'data-mood'
  // Wishes 心愿清单
  | 'wishes-list'
  | 'wishes-museum'
  | 'wishes-number'
  | 'wishes-swim'
  // 原型跳转图里只给了博物馆/游泳/读书三种详情，但设计稿的清单有五个心愿。
  // 徒步与攀岩同样是勾选式，复用同一个详情页，只是数据不同。
  | 'wishes-trails'
  | 'wishes-climbing'
  // Family 家庭分享
  | 'family-home'
  | 'family-members'
  | 'family-invite'
  | 'family-invited-view'
  | 'family-search-results'
  | 'family-poster'

/** 已实现路由：id → Taro 页面路径。新增页面时在此登记，并同步 src/app.config.ts。 */
export const routePathMap: Partial<Record<RouteId, string>> = {
  'journey-home': '/pages/journey/index',
  'journey-milestones': '/pages/journey/milestones/index',
  'journey-list': '/pages/journey/list/index',
  'journey-calendar': '/pages/journey/calendar/index',
  'journey-vaccine': '/pages/journey/vaccine/index',
  'journey-weekly-insight': '/pages/journey/weekly-insight/index',
  // 宝宝档案的查看 / 基础信息编辑 / 偏好管理是同一页的三种模式，
  // 靠 query 进入，不重复实现三份。
  'baby-profile-view': '/pages/baby-profile/index',
  'baby-profile-edit': '/pages/baby-profile/index?mode=edit',
  'baby-profile-preferences': '/pages/baby-profile/index?mode=preferences',
  'baby-profile-photo': '/pages/baby-profile/photo/index',
  // 心愿清单：勾选式详情（博物馆/游泳/徒步/攀岩）共用一个页面，靠 wish 参数区分；
  // 计数式详情（读书）版式不同，单独一页。
  'wishes-list': '/pages/wishes/index',
  'wishes-museum': '/pages/wishes/detail/index?wish=museum',
  'wishes-swim': '/pages/wishes/detail/index?wish=swim',
  'wishes-trails': '/pages/wishes/detail/index?wish=trails',
  'wishes-climbing': '/pages/wishes/detail/index?wish=climbing',
  'wishes-number': '/pages/wishes/counter/index?wish=books',
  'data-growth': '/pages/analysis/growth/index',
  'data-sleep-day': '/pages/analysis/sleep-daily/index',
  'data-sleep-month': '/pages/analysis/sleep-monthly/index',
  'data-diet-week': '/pages/analysis/diet-week/index',
  'data-diet-month': '/pages/analysis/diet-month/index',
  'data-mood': '/pages/analysis/mood/index',
}

/** 底部 TabBar 的四个常规 tab 落点。中间加号按钮不经过这里，由 BottomTabBar 自己打开记录弹层。 */
export const tabRouteMap: Record<string, RouteId> = {
  journey: 'journey-home',
  analysis: 'data-growth',
  wishes: 'wishes-list',
  family: 'family-home',
}

/**
 * 进入下级页面：压栈，系统返回键可回退。
 */
export const navigateToRoute = (id: RouteId) => {
  const url = routePathMap[id]

  if (!url) {
    Taro.showToast({ title: '该页面待开发', icon: 'none' })
    return
  }

  Taro.navigateTo({ url })
}

/**
 * 切换底部 tab：替换当前页，不压栈。
 * 否则用户点几次 tab 就会攒出一串返回记录。
 */
export const switchTabRoute = (id: RouteId) => {
  const url = routePathMap[id]

  if (!url) {
    Taro.showToast({ title: '该页面待开发', icon: 'none' })
    return
  }

  Taro.redirectTo({ url })
}

/** 返回上一页。栈内无上一页时（如从 tab 直达）退到旅程首页。 */
export const navigateBack = () => {
  const pages = Taro.getCurrentPages()

  if (pages.length > 1) {
    Taro.navigateBack()
    return
  }

  switchTabRoute('journey-home')
}
