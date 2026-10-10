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

## 记录提取（文字 / 图片）

```http
POST /api/baby/records/extract
```

一个端点同时服务两种输入，**由是否带 `media_base64` 决定走哪个模型**——调用方不需要知道
底下是文本模型还是视觉模型。

请求体（文字）：

```json
{
  "baby_id": "baby-001",
  "baby_age_months": 10,
  "text": "今天宝宝第一次自己站起来了，中午吃了南瓜泥和米粉",
  "source_type": "TEXT"
}
```

请求体（图片）：

```json
{
  "baby_id": "baby-001",
  "baby_age_months": 10,
  "text": "午餐",
  "source_type": "IMAGE",
  "media_base64": "<图片的 base64，不含 data URI 前缀>",
  "media_mime": "image/jpeg"
}
```

`text` 在图片模式下退化为可选说明（即家长附的一行字）。`text` 与 `media_base64` 至少要有一个。

**图片以 base64 内联传入，而不是给 URL 让 AI 去拉**：AI 服务连不到业务库、也没有用户
token，共享文件系统又会让两边的部署耦在一起。代价是带宽——超过 10MB 的媒体由调用方
（Java 后端）拒绝，不走这条链路。

图片模式走 `VISION_MODEL`（默认 `qwen3-vl:8b`，需先 `ollama pull`）。若画面里确实没有可
提取的记录，模型会返回空对象而不是编造内容。

响应体（两种模式同形）：

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
