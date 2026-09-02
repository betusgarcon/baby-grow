/**
 * AI 能力 Mock 数据
 */

import type { ExtractRecordResponse, RecommendRecipeResponse } from '@/api/modules/ai'

export const aiMockRoutes = [
  {
    path: '/api/baby/records/extract',
    handler: (): ExtractRecordResponse => ({
      status: 'ok',
      data: {
        milestones: [
          { type: '运动', event: '首次自己站起来', is_first: true },
        ],
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
