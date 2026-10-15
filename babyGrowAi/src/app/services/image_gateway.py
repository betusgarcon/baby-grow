"""文生图网关（心愿头图）。

**为什么不接进 `services/model_gateway/`**

那套抽象是 chat 形状的：`BaseModelGateway` 只有 `chat` / `embed` 两个抽象方法，
`ModelResponse.content` 是 `str`。出图的入参是 prompt、返回是图片字节，套不进去。
硬塞的话，得给 `OllamaGateway` 和 `OpenAIGateway` 各加一个它们**根本不具备**的能力的
桩方法——那是让抽象说谎。加上目前只有一家出图供应商，本来也没有 fallback 链可言。

所以这里是一个独立的小客户端。将来出现第二家供应商时，再从这里抽公共抽象。

**接口形状：已实测确认（2026-10-15）**

用真实 key 打过一次，结论与实现一致，两处曾经的疑点都已定案：

- 请求字段名就是 `image_size` / `batch_size` / `num_inference_steps` /
  `guidance_scale`（不是 OpenAI 的 `size`）；`negative_prompt` 也被接受。
- 响应是 `{"images": [{"url": ...}], "timings": {...}, "seed": ...}`，
  另有同样的 `data[].url`。`_first_image_url()` 两种键名都兼容。
- 返回的 URL 是 `https://s3.siliconflow.cn/temporary/...`，**带时效**，
  但下载**不需要** Authorization（已确认可匿名 GET）——所以下面的下载逻辑是对的。
- 该 URL 的 `Content-Type` 是 `application/octet-stream` 而非图片类型，
  所以类型要按魔数判（见 `_resolve_mime`）。
- 实测 Kolors 出图约 3.4s / 2.0MB（1024x1024 PNG），远快于
  `IMAGE_MODEL_TIMEOUT` 的 120s 默认值。

Lifespan:
    New. Provider-specific; may be generalized if a second image vendor is added.
"""

import base64
import ipaddress
import logging
import time
from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from urllib.parse import urlparse

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

# 图片魔数 → MIME。
#
# 为什么需要这个：供应商 CDN 返回的 Content-Type 是 application/octet-stream，
# **不是** image/png（实测确认）。照抄这个 header 会让 media_assets.mime 存成
# "application/octet-stream"，文件名还会被拼成 .octet-stream，下游拿到的就不是
# 一个图片类型。所以 header 不可信时按内容识别。
_MAGIC_TO_MIME: tuple[tuple[bytes, str], ...] = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
)


def _sniff_mime(content: bytes) -> str | None:
    for magic, mime in _MAGIC_TO_MIME:
        if content.startswith(magic):
            return mime
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return None


def _resolve_mime(declared: str | None, content: bytes) -> str:
    """以 header 为准，但它不是图片类型时按内容判断，最后兜底 PNG。"""
    mime = (declared or "").split(";")[0].strip().lower()
    if mime.startswith("image/"):
        return mime
    return _sniff_mime(content) or "image/png"


class ImageGenerationError(RuntimeError):
    """出图失败。消息会原样透给调用方，所以要写成人能看懂的一句话。"""


# 只有 https 且目标是公网地址才允许去取。
#
# 这个 URL 来自供应商的响应体，不是我们自己的配置，所以不能无条件 GET：被篡改的
# 供应商（或链路上的中间人）可以让这里返回 http://169.254.169.254/... 或某个内网
# 主机，本服务就会替它去取，再把字节当作图片回给调用方——一次服务端请求伪造。
# 供应商 CDN 是 https 公网域名，收紧到「https + 非内网」对正常流程零影响。
_BLOCKED_HOST_SUFFIXES = (".local", ".internal", ".localhost")
_BLOCKED_HOSTS = frozenset({"localhost", "metadata", "metadata.google.internal"})


def _assert_fetchable(url: str) -> None:
    """校验供应商给的下载地址可以安全访问。不通过就抛 ImageGenerationError。"""
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ImageGenerationError(f"出图服务返回的图片地址不是 https：{url[:120]}")

    host = (parsed.hostname or "").lower()
    if not host:
        raise ImageGenerationError("出图服务返回的图片地址没有主机名")

    if host in _BLOCKED_HOSTS or host.endswith(_BLOCKED_HOST_SUFFIXES):
        raise ImageGenerationError(f"拒绝访问内网地址：{host}")

    # IP 字面量：直接按网段判断，不给回环 / 私有 / 链路本地（含云元数据 169.254.169.254）
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return  # 域名，交给上面的后缀规则
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
        raise ImageGenerationError(f"拒绝访问内网地址：{host}")


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
            content, mime, remote_url = await self._extract_image(client, response)

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "文生图完成 model=%s bytes=%d elapsed_ms=%d", self._model, len(content), elapsed_ms
        )
        return ImageResult(
            content=content, mime=mime, model=self._model, elapsed_ms=elapsed_ms, remote_url=remote_url
        )

    async def _extract_image(
        self, client: httpx.AsyncClient, response: httpx.Response
    ) -> tuple[bytes, str, str]:
        """把出图响应变成「字节 + mime + 来源 URL」。失败一律折成 ImageGenerationError。

        这里每一步都可能以**非** ImageGenerationError 的方式炸掉，而调用方
        （`generate_cover`）只接 ImageGenerationError——漏掉一种，用户看到的就是
        500 加一段堆栈，而不是它准备好的 503。两个具体的漏点：
        200 但响应体是网关错误页或截断内容 → `json.JSONDecodeError`；
        下载时连接失败或超时 → `httpx.HTTPError`。
        """
        try:
            payload = response.json()
        except ValueError as exc:  # 含 json.JSONDecodeError
            raise ImageGenerationError("出图服务返回的不是合法 JSON") from exc

        remote_url = self._first_image_url(payload)

        if remote_url.startswith("http"):
            _assert_fetchable(remote_url)
            try:
                image = await client.get(remote_url)
            except httpx.HTTPError as exc:
                raise ImageGenerationError(f"下载生成的图片失败：{exc}") from exc
            if image.status_code >= 400:
                raise ImageGenerationError(f"下载生成的图片失败：HTTP {image.status_code}")
            content = image.content
            # header 是 application/octet-stream，得按内容判类型
            mime = _resolve_mime(image.headers.get("content-type"), content)
            return content, mime, remote_url

        # 少数模型直接回 base64。
        # validate=True：不加的话 b64decode 会**静默忽略**非字母表字符，于是
        # `data:image/png;base64,AAAA` 这种带前缀的串也会「解码成功」，
        # 得到一堆被前缀位偏移污染的字节，却被打上 image/png 存进库。
        try:
            content = base64.b64decode(remote_url, validate=True)
        except (ValueError, TypeError) as exc:
            raise ImageGenerationError("出图接口返回的既不是 URL 也不是合法 base64") from exc

        # mime 不再是写死的 image/png：按魔数判，判不出来就说明这压根不是图片
        mime = _sniff_mime(content)
        if mime is None:
            raise ImageGenerationError("出图接口返回的 base64 不是可识别的图片")
        return content, mime, ""

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
