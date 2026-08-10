window.PROTOTYPE_DATA = {
  modules: [
    { id: "journey", label: "时光旅程", shortLabel: "旅程", icon: "auto_stories", defaultRoute: "journey-home" },
    { id: "baby-data", label: "数据分析", shortLabel: "分析", icon: "monitoring", defaultRoute: "data-growth" },
    { id: "record", label: "时间记录", shortLabel: "记录", icon: "add_circle", defaultRoute: "record-center", primary: true },
    { id: "wishes", label: "心愿清单", shortLabel: "心愿", icon: "celebration", defaultRoute: "wishes-list" },
    { id: "family-share", label: "家庭分享", shortLabel: "分享", icon: "family_restroom", defaultRoute: "family-home" }
  ],
  routes: [
    {
      id: "journey-loading",
      module: "journey",
      group: "首页",
      title: "旅程加载态",
      src: "../journey/journey_index_loading/journey_index_loading.html",
      image: "../journey/journey_index_loading/journey_index_loading.png",
      summary: "用于开场演示 Skeleton 和 AI 正在整理记录的等待状态。",
      actions: ["journey-home", "journey-list"]
    },
    {
      id: "journey-home",
      module: "journey",
      group: "首页",
      title: "旅程首页",
      src: "../journey/journey_index/journey_index.html",
      image: "../journey/journey_index/journey_index.png",
      summary: "整合周洞察、里程碑、时间线和今日餐单，是演示的总入口。",
      actions: ["journey-weekly-insight", "journey-milestones", "journey-calendar", "record-center"]
    },
    {
      id: "journey-empty",
      module: "journey",
      group: "首页",
      title: "旅程空状态",
      src: "../journey/journey_empty/journey_empty.html",
      image: "../journey/journey_empty/journey_empty.png",
      summary: "适合演示首次使用或尚未沉淀成长记录时的温和引导。",
      actions: ["record-center", "journey-home"]
    },
    {
      id: "journey-list",
      module: "journey",
      group: "时间线",
      title: "旅程时间线列表",
      src: "../journey/journey_list/journey_list.html",
      image: "../journey/journey_list/journey_list.png",
      summary: "展示成长记录的时间线沉淀，可承接 AI 分类后的事件回流。",
      actions: ["journey-milestones", "family-home", "record-text-ai"]
    },
    {
      id: "journey-weekly-insight",
      module: "journey",
      group: "洞察",
      title: "每周洞察",
      src: "../journey/weekly_insignt/weekly_insignt.html",
      image: "../journey/weekly_insignt/weekly_insignt.png",
      summary: "聚合一周成长数据与 AI 解释，适合作为周记或分析摘要入口。",
      actions: ["data-growth", "journey-home", "family-poster"]
    },
    {
      id: "journey-milestones",
      module: "journey",
      group: "里程碑",
      title: "里程碑列表",
      src: "../journey/milestone_list/milestone_list.html",
      image: "../journey/milestone_list/milestone_list.png",
      summary: "集中展示具有仪式感的成长节点，适合衔接 AI 自动识别结果。",
      actions: ["record-text-ai", "journey-list", "family-poster"]
    },
    {
      id: "journey-calendar",
      module: "journey",
      group: "日历提醒",
      title: "日历页",
      src: "../journey/calendar/calendar.html",
      image: "../journey/calendar/calendar.png",
      summary: "承接疫苗、体检、生日等重要提醒，是例行事项与计划的时间入口。",
      actions: ["journey-calendar-select", "journey-vaccine", "wishes-list"]
    },
    {
      id: "journey-calendar-select",
      module: "journey",
      group: "日历提醒",
      title: "日期选中态",
      src: "../journey/calender_select/calender_select.html",
      image: "../journey/calender_select/calender_select.png",
      summary: "演示选择日期后查看事件列表和创建记录的状态。",
      actions: ["journey-vaccine", "record-center", "journey-calendar"]
    },
    {
      id: "journey-vaccine",
      module: "journey",
      group: "日历提醒",
      title: "疫苗详情",
      src: "../journey/vaccinum_detail/vaccinum_detail.html",
      image: "../journey/vaccinum_detail/vaccinum_detail.png",
      summary: "对应疫苗计划与健康升级提醒场景，可作为任务清单代表页面。",
      actions: ["journey-calendar", "family-home"]
    },
    {
      id: "baby-profile-view",
      module: "journey",
      group: "宝宝画像",
      title: "宝宝档案查看",
      src: "../journey/baby_profile_view/baby_profile_view.html",
      image: "../journey/baby_profile_view/baby_profile_view.png",
      summary: "展示宝宝月龄、喜好、特征等画像信息，可作为 AI 推荐的画像入口。",
      actions: ["baby-profile-edit", "baby-profile-preferences", "data-growth"]
    },
    {
      id: "baby-profile-edit",
      module: "journey",
      group: "宝宝画像",
      title: "宝宝档案编辑",
      src: "../journey/baby_profile_edit_state/baby_profile_edit_state.html",
      image: "../journey/baby_profile_edit_state/baby_profile_edit_state.png",
      summary: "演示用户手工修正宝宝档案基础信息时的状态。",
      actions: ["baby-profile-photo", "baby-profile-view"]
    },
    {
      id: "baby-profile-preferences",
      module: "journey",
      group: "宝宝画像",
      title: "偏好管理",
      src: "../journey/baby_profile_preference_management/baby_profile_preference_management.html",
      image: "../journey/baby_profile_preference_management/baby_profile_preference_management.png",
      summary: "适合承接过敏原、喜欢/不喜欢、饮食偏好的管理。",
      actions: ["baby-profile-view", "data-diet-week"]
    },
    {
      id: "baby-profile-photo",
      module: "journey",
      group: "宝宝画像",
      title: "更换头像",
      src: "../journey/baby_profile_change_photo/baby_profile_change_photo.html",
      image: "../journey/baby_profile_change_photo/baby_profile_change_photo.png",
      summary: "用于演示档案编辑的轻量交互闭环。",
      actions: ["baby-profile-edit", "baby-profile-view"]
    },

    {
      id: "data-growth",
      module: "baby-data",
      group: "核心分析",
      title: "生长分析",
      src: "../baby_data/baby_data_growth_tab/baby_data_growth_tab.html",
      image: "../baby_data/baby_data_growth_tab/baby_data_growth_tab.png",
      summary: "展示身高、体重、曲线与 AI 生长解读，是分析模块核心页面。",
      actions: ["data-sleep-day", "data-diet-week", "journey-weekly-insight"]
    },
    {
      id: "data-sleep-day",
      module: "baby-data",
      group: "睡眠",
      title: "睡眠日视图",
      src: "../baby_data/baby_data_sleep_daily_tab/baby_data_sleep_daily_tab.html",
      image: "../baby_data/baby_data_sleep_daily_tab/baby_data_sleep_daily_tab.png",
      summary: "用于按日查看宝宝睡眠分布和 AI 结论。",
      actions: ["data-sleep-month", "journey-list"]
    },
    {
      id: "data-sleep-month",
      module: "baby-data",
      group: "睡眠",
      title: "睡眠月视图",
      src: "../baby_data/baby_data_sleep_month_tab/baby_data_sleep_month_tab.html",
      image: "../baby_data/baby_data_sleep_month_tab/baby_data_sleep_month_tab.png",
      summary: "用于演示周期聚合数据和趋势统计。",
      actions: ["data-sleep-day", "journey-weekly-insight"]
    },
    {
      id: "data-diet-week",
      module: "baby-data",
      group: "饮食",
      title: "饮食周视图",
      src: "../baby_data/baby_data_diet_tab_week/baby_data_diet_tab_week.html",
      image: "../baby_data/baby_data_diet_tab_week/baby_data_diet_tab_week.png",
      summary: "展示一周饮食结构、辅食建议与偏好适配。",
      actions: ["data-diet-month", "baby-profile-preferences", "journey-home"]
    },
    {
      id: "data-diet-month",
      module: "baby-data",
      group: "饮食",
      title: "饮食月视图",
      src: "../baby_data/baby_data_diet_tab_month/baby_data_diet_tab_month.html",
      image: "../baby_data/baby_data_diet_tab_month/baby_data_diet_tab_month.png",
      summary: "演示更长周期的饮食分析和成长建议。",
      actions: ["data-diet-week", "journey-weekly-insight"]
    },
    {
      id: "data-mood",
      module: "baby-data",
      group: "情绪",
      title: "情绪分析",
      src: "../baby_data/baby_data_mood_tab/baby_data_mood_tab.html",
      image: "../baby_data/baby_data_mood_tab/baby_data_mood_tab.png",
      summary: "用于展示情绪节律、互动质量和家长温和提醒。",
      actions: ["data-growth", "family-home"]
    },

    {
      id: "record-center",
      module: "record",
      group: "记录创建",
      title: "记录中心",
      src: "../record/record/record.html",
      image: "../record/record/record.png",
      summary: "记录入口页，适合演示快速创建、低干扰的输入方式。",
      actions: ["record-text", "record-photo", "record-photo-text"]
    },
    {
      id: "record-text",
      module: "record",
      group: "记录创建",
      title: "纯文字记录",
      src: "../record/record_text/record_text.html",
      image: "../record/record_text/record_text.png",
      summary: "输入宝宝成长事件的最简路径，适合触发 AI 分类和里程碑识别。",
      actions: ["record-text-ai", "journey-list"]
    },
    {
      id: "record-photo",
      module: "record",
      group: "记录创建",
      title: "图片记录",
      src: "../record/record_pic/record_pic.html",
      image: "../record/record_pic/record_pic.png",
      summary: "用于展示图片上传、视觉记录与后续 AI 图像分析的入口。",
      actions: ["record-photo-text", "family-poster"]
    },
    {
      id: "record-photo-text",
      module: "record",
      group: "记录创建",
      title: "图文记录",
      src: "../record/record_pic_text/record_pic_text.html",
      image: "../record/record_pic_text/record_pic_text.png",
      summary: "演示多模态记录组合，适合串联时间线、海报和分享场景。",
      actions: ["record-text-ai", "family-poster", "journey-list"]
    },
    {
      id: "record-text-ai",
      module: "record",
      group: "AI 结果",
      title: "AI 分类结果",
      src: "../record/record_text_ai/record_text_ai.html",
      image: "../record/record_text_ai/record_text_ai.png",
      summary: "最适合讲解 AI 如何把自然语言记录识别为里程碑、健康事件或日常日志。",
      actions: ["journey-list", "journey-milestones", "family-poster"]
    },

    {
      id: "wishes-loading",
      module: "wishes",
      group: "列表",
      title: "心愿加载态",
      src: "../wishes/wishes_list_loading/wishes_list_loading.html",
      image: "../wishes/wishes_list_loading/wishes_list_loading.png",
      summary: "展示心愿模块加载中的占位状态。",
      actions: ["wishes-list"]
    },
    {
      id: "wishes-list",
      module: "wishes",
      group: "列表",
      title: "心愿列表",
      src: "../wishes/wishes_list/wishes_list.html",
      image: "../wishes/wishes_list/wishes_list.png",
      summary: "呈现旅行、游泳、博物馆等亲子计划，是清单模块主入口。",
      actions: ["wishes-museum", "wishes-number", "wishes-swim"]
    },
    {
      id: "wishes-empty",
      module: "wishes",
      group: "列表",
      title: "心愿空状态",
      src: "../wishes/wishes_empty_state/wishes_empty_state.html",
      image: "../wishes/wishes_empty_state/wishes_empty_state.png",
      summary: "适合首次创建心愿计划时的引导。",
      actions: ["wishes-list", "record-center"]
    },
    {
      id: "wishes-museum",
      module: "wishes",
      group: "详情",
      title: "博物馆计划详情",
      src: "../wishes/wishes_museum_detail/wishes_museum_detail.html",
      image: "../wishes/wishes_museum_detail/wishes_museum_detail.png",
      summary: "用于展示叙事型心愿计划的详情页。",
      actions: ["wishes-museum-edit", "family-poster"]
    },
    {
      id: "wishes-museum-edit",
      module: "wishes",
      group: "编辑",
      title: "博物馆计划编辑",
      src: "../wishes/wishes_museum_detail_edit/wishes_museum_detail_edit.html",
      image: "../wishes/wishes_museum_detail_edit/wishes_museum_detail_edit.png",
      summary: "演示对心愿任务进行补充和调整的状态。",
      actions: ["wishes-museum", "wishes-list"]
    },
    {
      id: "wishes-number",
      module: "wishes",
      group: "详情",
      title: "数字目标详情",
      src: "../wishes/wishes_number_detail/wishes_number_detail.html",
      image: "../wishes/wishes_number_detail/wishes_number_detail.png",
      summary: "适合展示打卡式进度目标，例如爬山、游泳或百日计划。",
      actions: ["wishes-number-edit", "wishes-list"]
    },
    {
      id: "wishes-number-edit",
      module: "wishes",
      group: "编辑",
      title: "数字目标编辑",
      src: "../wishes/wishes_number_detail_edit/wishes_number_detail_edit.html",
      image: "../wishes/wishes_number_detail_edit/wishes_number_detail_edit.png",
      summary: "用于演示数值型心愿的目标和节奏调整。",
      actions: ["wishes-number", "wishes-list"]
    },
    {
      id: "wishes-swim",
      module: "wishes",
      group: "详情",
      title: "游泳进度详情",
      src: "../wishes/wishes_swim_progress_detail/wishes_swim_progress_detail.html",
      image: "../wishes/wishes_swim_progress_detail/wishes_swim_progress_detail.png",
      summary: "呈现阶段型计划的完成进度和鼓励式反馈。",
      actions: ["wishes-list", "family-poster"]
    },

    {
      id: "family-home",
      module: "family-share",
      group: "分享首页",
      title: "家庭分享首页",
      src: "../family_share/family_sharing_index/family_sharing_index.html",
      image: "../family_share/family_sharing_index/family_sharing_index.png",
      summary: "展示家庭成员、AI 精选记忆和分享方式，是分享模块总入口。",
      actions: ["family-members", "family-search-results", "family-poster"]
    },
    {
      id: "family-invite",
      module: "family-share",
      group: "成员协作",
      title: "邀请成员",
      src: "../family_share/family_share_invite/family_share_invite.html",
      image: "../family_share/family_share_invite/family_share_invite.png",
      summary: "演示邀请家人加入家庭空间的入口。",
      actions: ["family-invite-token", "family-members"]
    },
    {
      id: "family-invite-token",
      module: "family-share",
      group: "成员协作",
      title: "邀请码视图",
      src: "../family_share/family_share_invite_token/family_share_invite_token.html",
      image: "../family_share/family_share_invite_token/family_share_invite_token.png",
      summary: "用于展示邀请口令、扫码或复制链接。",
      actions: ["family-invited-view", "family-invite"]
    },
    {
      id: "family-invited-view",
      module: "family-share",
      group: "成员协作",
      title: "受邀加入视图",
      src: "../family_share/family_share_invited_view/family_share_invited_view.html",
      image: "../family_share/family_share_invited_view/family_share_invited_view.png",
      summary: "从被邀请者视角展示加入家庭空间的结果。",
      actions: ["family-home", "family-members"]
    },
    {
      id: "family-members",
      module: "family-share",
      group: "成员协作",
      title: "成员管理",
      src: "../family_share/family_member_management/family_member_management.html",
      image: "../family_share/family_member_management/family_member_management.png",
      summary: "适合演示权限边界、角色视图和家庭协作。",
      actions: ["family-invite", "family-home"]
    },
    {
      id: "family-search-empty",
      module: "family-share",
      group: "记忆检索",
      title: "搜索空状态",
      src: "../family_share/memory_search_empty_state/memory_search_empty_state.html",
      image: "../family_share/memory_search_empty_state/memory_search_empty_state.png",
      summary: "用于演示没有搜索命中时的反馈。",
      actions: ["family-search-loading", "family-home"]
    },
    {
      id: "family-search-loading",
      module: "family-share",
      group: "记忆检索",
      title: "搜索加载中",
      src: "../family_share/memory_search_loading_state/memory_search_loading_state.html",
      image: "../family_share/memory_search_loading_state/memory_search_loading_state.png",
      summary: "适合讲解 AI 正在整理图片、文字和视频素材的状态。",
      actions: ["family-search-results", "family-filter"]
    },
    {
      id: "family-search-results",
      module: "family-share",
      group: "记忆检索",
      title: "搜索结果列表",
      src: "../family_share/memory_search_result_list/memory_search_result_list.html",
      image: "../family_share/memory_search_result_list/memory_search_result_list.png",
      summary: "展示 AI 整理后的记忆搜索结果，适合承接时间线或家庭分享场景。",
      actions: ["family-filter", "family-filtered-results", "family-poster"]
    },
    {
      id: "family-filter",
      module: "family-share",
      group: "记忆检索",
      title: "筛选下拉展开",
      src: "../family_share/custom_filter_dropdown_expanded/custom_filter_dropdown_expanded.html",
      image: "../family_share/custom_filter_dropdown_expanded/custom_filter_dropdown_expanded.png",
      summary: "演示在海量记忆素材中按时间、成员、标签进行过滤。",
      actions: ["family-filtered-results", "family-search-results"]
    },
    {
      id: "family-filtered-results",
      module: "family-share",
      group: "记忆检索",
      title: "筛选结果视图",
      src: "../family_share/custom_filtered_search_result/custom_filtered_search_result.html",
      image: "../family_share/custom_filtered_search_result/custom_filtered_search_result.png",
      summary: "用于呈现更精准的记忆筛选结果。",
      actions: ["family-poster", "family-search-results"]
    },
    {
      id: "family-poster",
      module: "family-share",
      group: "海报分享",
      title: "长图海报预览",
      src: "../family_share/long_image_poster/long_image_poster.html",
      image: "../family_share/long_image_poster/long_image_poster.png",
      summary: "对应成长长图、叙事式滑动和一句话海报分享。",
      actions: ["family-home", "journey-milestones", "record-photo-text"]
    }
  ],
  flows: [
    {
      id: "flow-overview",
      label: "1. 产品总览",
      description: "从旅程首页进入，快速扫过周洞察、时间线和里程碑。",
      steps: ["journey-loading", "journey-home", "journey-weekly-insight", "journey-list", "journey-milestones"]
    },
    {
      id: "flow-record-ai",
      label: "2. 记录到 AI 分类",
      description: "演示用户输入成长事件后，如何被识别、分类并回流到时间线与里程碑。",
      steps: ["record-center", "record-text", "record-text-ai", "journey-list", "journey-milestones"]
    },
    {
      id: "flow-reminder",
      label: "3. 日历提醒与疫苗计划",
      description: "展示日历、日期聚焦与具体提醒详情页面。",
      steps: ["journey-calendar", "journey-calendar-select", "journey-vaccine"]
    },
    {
      id: "flow-analysis",
      label: "4. 数据分析与喂养建议",
      description: "从生长、睡眠、饮食到情绪，演示分析模块的完整面貌。",
      steps: ["data-growth", "data-sleep-day", "data-sleep-month", "data-diet-week", "data-diet-month", "data-mood"]
    },
    {
      id: "flow-wishes",
      label: "5. 心愿清单与计划进度",
      description: "展示亲子计划、任务进度和详情编辑能力。",
      steps: ["wishes-list", "wishes-museum", "wishes-museum-edit", "wishes-number", "wishes-number-edit", "wishes-swim"]
    },
    {
      id: "flow-share",
      label: "6. 家庭分享与海报",
      description: "从家庭成员管理到 AI 精选搜索，再到长图海报分享。",
      steps: ["family-home", "family-members", "family-search-loading", "family-search-results", "family-filtered-results", "family-poster"]
    },
    {
      id: "flow-profile",
      label: "7. 宝宝画像配置",
      description: "演示宝宝档案、偏好和头像设置，解释 AI 推荐画像来源。",
      steps: ["baby-profile-view", "baby-profile-edit", "baby-profile-preferences", "baby-profile-photo", "data-diet-week"]
    }
  ]
};
