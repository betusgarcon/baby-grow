# AI 服务接口文档

> 基础 URL: `http://localhost:8001`

## 健康检查

```http
GET /health
```

响应：

```json
{
  "status": "ok",
  "service": "baby-grow-ai",
  "ollama": "ok"
}
```

## 文本智能提取

```http
POST /api/baby/records/extract
```

请求体：

```json
{
  "baby_id": "baby-001",
  "baby_age_months": 10,
  "text": "今天宝宝第一次自己站起来了，中午吃了南瓜泥和米粉",
  "source_type": "TEXT"
}
```

响应体：

```json
{
  "status": "ok",
  "data": {
    "milestones": [
      { "type": "运动", "event": "首次自己站起来", "is_first": true }
    ],
    "food": [
      { "name": "南瓜泥", "category": "蔬菜", "is_first": true },
      { "name": "米粉", "category": "谷物", "is_first": false }
    ],
    "milk": [],
    "sleep": [],
    "mood": []
  },
  "confidence": 0.92,
  "model_name": "qwen2.5:7b-instruct-q5_K_M",
  "elapsed_ms": 2500
}
```

## 食谱推荐

```http
POST /api/baby/recipes/recommend
```

请求体：

```json
{
  "baby_id": "baby-001",
  "baby_age_months": 9,
  "query": "中午吃什么",
  "allergens": ["鸡蛋"],
  "liked_foods": ["南瓜"],
  "disliked_foods": [],
  "texture_level": "碎末"
}
```

响应体：

```json
{
  "status": "ok",
  "summary": "今天可以尝试鸡肉南瓜粥",
  "items": [
    {
      "mealType": "午餐",
      "dishName": "鸡肉南瓜粥",
      "reason": "适合9个月以上宝宝，质地软烂易消化",
      "ingredients": ["鸡胸肉", "南瓜", "大米"],
      "instructions": "..."
    }
  ],
  "avoid_items": ["鸡蛋"],
  "confidence": 0.88,
  "model_name": "qwen2.5:7b-instruct-q5_K_M",
  "elapsed_ms": 8000
}
```

## 错误响应

当 AI 服务不可用时，会返回 503：

```json
{
  "detail": "Ollama unreachable"
}
```

## Java 后端透传

Java 后端可以通过 `/api/baby/records/extract` 和 `/api/baby/recipes/recommend` 将请求转发到 Python AI 服务，小程序无需直接访问 AI 服务。

AI 服务地址通过 `ai.service.url` 配置，默认：`http://localhost:8001`。
