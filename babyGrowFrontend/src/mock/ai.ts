/**
 * AI 能力 Mock 数据
 *
 * 只有在未配置 TARO_APP_API_BASE_URL 时才生效——配置了后端之后，
 * /api/baby/records 与 /api/baby/ai-tasks 会走真实请求（见 api/config.ts 的 REAL_API_PATHS）。
 */

import type {
  AiTaskResponse,
  ExtractRecordResponse,
  RecommendRecipeResponse,
} from '@/api/modules/ai'

const MOCK_TASK_ID = 1

const mockExtraction: ExtractRecordResponse = {
  status: 'ok',
  data: {
    milestones: [{ type: '运动', event: '首次自己站起来', is_first: true }],
    food: [
      { name: '南瓜泥', category: '蔬菜', is_first: true },
      { name: '米粉', category: '谷物', is_first: false },
    ],
    milk: [],
  },
  raw_text: '今天宝宝第一次自己站起来了，中午吃了南瓜泥和米粉',
  confidence: 0.92,
  model_name: 'mock',
  elapsed_ms: 1200,
}

export const aiMockRoutes = [
  {
    path: '/api/baby/records/extract',
    handler: (): ExtractRecordResponse => mockExtraction,
  },
  {
    path: '/api/baby/records/recognize',
    handler: () => ({ taskId: MOCK_TASK_ID, status: 'pending' }),
  },
  {
    // 与 recognize 返回的 taskId 对应，模拟「一次轮询即完成」
    path: `/api/baby/ai-tasks/${MOCK_TASK_ID}`,
    handler: (): AiTaskResponse => ({
      taskId: MOCK_TASK_ID,
      status: 'succeeded',
      result: mockExtraction,
    }),
  },
  {
    path: '/api/baby/records/commit',
    handler: () => ({
      id: `mock-record-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type: 'memory',
      filterKey: 'photos',
      time: '2:30 PM',
      badge: 'AI LOG',
      title: 'Log Processed',
      description: 'Significant milestone: First solid food intake detected.',
    }),
  },
  {
    path: '/api/baby/recipes/recommend',
    handler: (): RecommendRecipeResponse => ({
      status: 'ok',
      summary: '今天可以尝试鸡肉南瓜粥，富含蛋白质和维生素A。',
      items: [
        {
          mealType: '午餐',
          dishName: '鸡肉南瓜粥',
          reason: '适合9个月以上宝宝，质地软烂易消化',
          ingredients: ['鸡胸肉', '南瓜', '大米'],
        },
      ],
      avoid_items: ['整颗坚果', '蜂蜜'],
      confidence: 0.88,
      model_name: 'mock',
      elapsed_ms: 1500,
    }),
  },
]
