"""文生图网关（心愿头图）。

**为什么不接进 `services/model_gateway/`**

那套抽象是 chat 形状的：`BaseModelGateway` 只有 `chat` / `embed` 两个抽象方法，
`ModelResponse.content` 是 `str`。出图的入参是 prompt、返回是图片字节，套不进去。
硬塞的话，得给 `OllamaGateway` 和 `OpenAIGateway` 各加一个它们**根本不具备**的能力的
桩方法——那是让抽象说谎。加上目前只有一家出图供应商，本来也没有 fallback 链可言。

所以这里是一个独立的小客户端。将来出现第二家供应商时，再从这里抽公共抽象。

**⚠️ 接口形状尚未实测确认**

下面的请求字段名与响应结构（`image_size` / `batch_size` / `images[].url`）取自硅基流动
公开文档的约定，但**没有用真实 key 打过**——文档域名与 GitHub 镜像都被本机网络策略
拦掉了，无法在线核对。它的接口是 OpenAI 风格但并不等同（OpenAI 用 `size`、返回
`data[].url`）。

因此把映射收敛到 `_request_body()` 与 `_first_image_url()` 两处：真打一次发现有出入时，
只改这两个函数即可，其余代码不受影响。首次启用前请务必先实测。

Lifespan:
    New. Provider-specific; may be generalized if a second image vendor is added.
"""

import base64
import logging
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# 画面风格。写死在服务端而不是让调用方传——前端与 Java 都不该做 prompt 工程，
# 风格要改时只改这一处。
STYLE_SUFFIX = (
    "children's picture book illustration, soft warm pastel palette, "
    "gentle rounded shapes, flat vector style, calm and minimal"
)

# 出图模型很爱在画面上渲染文字，而渲染出来的文字基本都是乱码，所以显式排掉。
NEGATIVE_PROMPT = (
    "text, words, letters, numbers, watermark, signature, logo, caption, "
    "photorealistic, harsh contrast, scary, dark, deformed, extra limbs"
)

# 家长的描述会直接进提示词，截断一下，避免超长输入既烧 token 又把主体冲淡
PROMPT_MAX_CHARS = 300


class ImageGenerationError(RuntimeError):
    """出图失败。消息会原样透给调用方，所以要写成人能看懂的一句话。"""


@dataclass
class ImageResult:
    """一张生成好的图片。"""

    content: bytes
    mime: str
    model: str
    elapsed_ms: int
    remote_url: str


def _age_phrase(age_months: int) -> str:
    """把月龄转成画面风格上的提示。只是软引导，不追求精确。"""
    if age_months < 12:
        return "for a baby"
    if age_months < 36:
        return "for a toddler"
    return "for a young child"


def build_prompt(title: str, description: str, age_months: int) -> str:
    """由心愿名称与家长描述拼出提示词。"""
    subject = " ".join(title.split())
    brief = " ".join(description.split())[:PROMPT_MAX_CHARS]

    parts = [f"{subject}." if subject else "A gentle family moment."]
    if brief:
        parts.append(f"{brief}.")
    parts.append(f"{STYLE_SUFFIX}, {_age_phrase(age_months)}.")
    return " ".join(parts)


class ImageGateway:
    """硅基流动（或任何兼容其形状的）文生图接口。"""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        size: str,
        timeout: int,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._size = size
        self._timeout = timeout
        # 只在测试里传。接口形状尚未实测，得有个口子把请求/响应映射钉死，
        # 而仓库的测试约定是不用 mock 库，httpx.MockTransport 就是官方给的替代。
        self._transport = transport

    @property
    def enabled(self) -> bool:
        """没配 key 就整体关闭，让调用方明确地得到一个 503 而不是一个必然失败的请求。"""
        return bool(self._api_key)

    @property
    def model(self) -> str:
        return self._model

    def _request_body(self, prompt: str) -> dict[str, Any]:
        """请求体映射。字段名有出入时改这里。"""
        return {
            "model": self._model,
            "prompt": prompt,
            "negative_prompt": NEGATIVE_PROMPT,
            "image_size": self._size,
            "batch_size": 1,
            "num_inference_steps": 20,
            "guidance_scale": 7.5,
        }

    @staticmethod
    def _first_image_url(payload: Any) -> str:
        """响应映射。结构有出入时改这里。

        硅基流动的约定是 ``{"images": [{"url": ...}]}``；一并兼容 OpenAI 的
        ``{"data": [{"url": ...}]}``，两者只差最外层键名。
        """
        if not isinstance(payload, dict):
            raise ImageGenerationError("出图接口返回的不是 JSON 对象")

        for key in ("images", "data"):
            items = payload.get(key)
            if isinstance(items, list) and items:
                first = items[0]
                if isinstance(first, dict):
                    for url_key in ("url", "b64_json"):
                        value = first.get(url_key)
                        if isinstance(value, str) and value:
                            return value
        raise ImageGenerationError("出图接口没有返回图片")

    async def generate(self, prompt: str) -> ImageResult:
        """生成一张图，并把图片本身下载下来。

        下载放在这一侧：供应商返回的 URL 是临时的，调用方最终要的是字节
        （它得存到自己的能力 URL 后面）。也让 Java 侧不必出网。
        """
        if not self.enabled:
            raise ImageGenerationError("未配置 IMAGE_MODEL_API_KEY，文生图不可用")

        started = time.perf_counter()

        async with httpx.AsyncClient(timeout=self._timeout, transport=self._transport) as client:
            response = await self._post(client, prompt)
            remote_url = self._first_image_url(response.json())

            if remote_url.startswith("http"):
                image = await client.get(remote_url)
                if image.status_code >= 400:
                    raise ImageGenerationError(
                        f"下载生成的图片失败：HTTP {image.status_code}"
                    )
                content = image.content
                mime = image.headers.get("content-type", "image/png").split(";")[0]
            else:
                # 少数模型直接回 base64
                try:
                    content = base64.b64decode(remote_url)
                except (ValueError, TypeError) as exc:
                    raise ImageGenerationError("出图接口返回的既不是 URL 也不是合法 base64") from exc
                mime = "image/png"
                remote_url = ""

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "文生图完成 model=%s bytes=%d elapsed_ms=%d", self._model, len(content), elapsed_ms
        )
        return ImageResult(
            content=content, mime=mime, model=self._model, elapsed_ms=elapsed_ms, remote_url=remote_url
        )

    async def _post(self, client: httpx.AsyncClient, prompt: str) -> httpx.Response:
        """发一次请求，把各类失败转成一句人话。

        AI 服务用 HTTPException(detail=...) 报错，而 Java 侧的 AiClient 会把 detail
        原样透给前端，所以这里的措辞是给用户看的。
        """
        try:
            response = await client.post(
                f"{self._base_url}/images/generations",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=self._request_body(prompt),
            )
        except httpx.TimeoutException as exc:
            raise ImageGenerationError(f"出图超时（{self._timeout}s）") from exc
        except httpx.HTTPError as exc:
            raise ImageGenerationError(f"无法连接出图服务：{exc}") from exc

        if response.status_code >= 400:
            raise ImageGenerationError(
                f"出图服务返回 HTTP {response.status_code}：{response.text[:200]}"
            )
        return response

    async def health(self) -> bool:
        """只判断「配没配」，不发真实请求——探针不该花钱。"""
        return self.enabled


@lru_cache
def get_image_gateway() -> ImageGateway:
    """Return the cached image gateway.

    Cached so settings are read once per process, matching `get_settings()`.
    """
    settings = get_settings()
    return ImageGateway(
        api_key=settings.image_model_api_key,
        base_url=settings.image_model_base_url,
        model=settings.image_model_name,
        size=settings.image_model_size,
        timeout=settings.image_model_timeout,
    )


def reset_image_gateway() -> None:
    """让下一次 get_image_gateway() 重新读配置。测试用。"""
    get_image_gateway.cache_clear()
