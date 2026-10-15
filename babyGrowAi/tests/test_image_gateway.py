"""Tests for the text-to-image gateway (wish covers).

The request and response shapes in `image_gateway.py` were written from the
provider's published conventions but have **never been exercised against the
real API** (the docs domain is blocked from this machine). These tests therefore
pin down what we currently believe the shape is: when a real call reveals a
mismatch, the fix belongs in `_request_body` / `_first_image_url`, and the
assertions here are the specification to update.

A fake transport is injected rather than a mock library, matching how the rest
of the suite fakes collaborators by hand.
"""

import asyncio
import base64
import json

import httpx
import pytest

from app.services.image_gateway import (
    ImageGateway,
    ImageGenerationError,
    build_prompt,
)

# 内容无所谓，只用来确认字节被原样搬了过来
PNG_BYTES = bytes.fromhex("89504e470d0a1a0a")
CDN_URL = "https://cdn.example.com/generated.png"


def _gateway(handler, api_key: str = "test-key") -> ImageGateway:
    return ImageGateway(
        api_key=api_key,
        base_url="https://api.example.com/v1",
        model="test-model",
        size="1024x1024",
        timeout=30,
        transport=httpx.MockTransport(handler),
    )


def _serving_image(*, with_url: bool = True):
    """A handler that answers the generation POST and the CDN fetch."""
    seen: dict = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/images/generations"):
            seen["body"] = json.loads(request.content)
            seen["authorization"] = request.headers.get("authorization")
            seen["path"] = request.url.path
            if with_url:
                return httpx.Response(200, json={"images": [{"url": CDN_URL}]})
            return httpx.Response(
                200, json={"images": [{"b64_json": base64.b64encode(PNG_BYTES).decode()}]}
            )
        return httpx.Response(200, content=PNG_BYTES, headers={"content-type": "image/png"})

    return handler, seen


# ---------------------------------------------------------------------------
# prompt building
# ---------------------------------------------------------------------------


def test_prompt_carries_title_description_and_age():
    prompt = build_prompt("Learn to Swim", "Water safety and floating", 8)

    assert "Learn to Swim" in prompt
    assert "Water safety and floating" in prompt
    # 月龄只是软引导，但必须真的进到提示词里
    assert "for a baby" in prompt


def test_prompt_truncates_a_long_description():
    prompt = build_prompt("Swim", "x" * 2000, 8)

    # 风格后缀还在，但描述被截断，整体不该被拖长
    assert "x" * 400 not in prompt
    assert "picture book illustration" in prompt


def test_prompt_survives_an_empty_description():
    prompt = build_prompt("Learn to Swim", "", 8)

    assert "Learn to Swim" in prompt
    assert "picture book illustration" in prompt


# ---------------------------------------------------------------------------
# request shape
# ---------------------------------------------------------------------------


def test_request_uses_the_expected_field_names():
    handler, seen = _serving_image()

    asyncio.run(_gateway(handler).generate("a prompt"))

    assert seen["path"] == "/v1/images/generations"
    assert seen["authorization"] == "Bearer test-key"
    assert seen["body"]["model"] == "test-model"
    assert seen["body"]["prompt"] == "a prompt"
    assert seen["body"]["image_size"] == "1024x1024"
    assert seen["body"]["batch_size"] == 1
    # 出图模型爱在画面上渲染乱码文字，negative prompt 必须在
    assert "text" in seen["body"]["negative_prompt"]


# ---------------------------------------------------------------------------
# response handling
# ---------------------------------------------------------------------------


def test_generate_downloads_the_image_behind_the_url():
    handler, _ = _serving_image()

    result = asyncio.run(_gateway(handler).generate("a prompt"))

    assert result.content == PNG_BYTES
    assert result.mime == "image/png"
    assert result.model == "test-model"
    assert result.elapsed_ms >= 0


def test_generate_accepts_an_inline_base64_payload():
    handler, _ = _serving_image(with_url=False)

    result = asyncio.run(_gateway(handler).generate("a prompt"))

    assert result.content == PNG_BYTES


def test_generate_also_accepts_the_openai_data_key():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/images/generations"):
            return httpx.Response(200, json={"data": [{"url": CDN_URL}]})
        return httpx.Response(200, content=PNG_BYTES, headers={"content-type": "image/png"})

    assert asyncio.run(_gateway(handler).generate("a prompt")).content == PNG_BYTES


def test_generate_rejects_a_response_without_an_image():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"images": []})

    with pytest.raises(ImageGenerationError, match="没有返回图片"):
        asyncio.run(_gateway(handler).generate("a prompt"))


def test_generate_surfaces_an_upstream_rejection():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text="invalid api key")

    with pytest.raises(ImageGenerationError, match="401"):
        asyncio.run(_gateway(handler).generate("a prompt"))


def test_generate_surfaces_a_download_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/images/generations"):
            return httpx.Response(200, json={"images": [{"url": CDN_URL}]})
        return httpx.Response(404, text="gone")

    with pytest.raises(ImageGenerationError, match="下载"):
        asyncio.run(_gateway(handler).generate("a prompt"))


def test_generate_reports_a_timeout_in_readable_terms():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("timed out")

    with pytest.raises(ImageGenerationError, match="超时"):
        asyncio.run(_gateway(handler).generate("a prompt"))


# ---------------------------------------------------------------------------
# configuration gating
# ---------------------------------------------------------------------------


def test_a_gateway_without_a_key_is_disabled():
    gateway = _gateway(lambda request: httpx.Response(200, json={}), api_key="")

    assert gateway.enabled is False
    with pytest.raises(ImageGenerationError, match="IMAGE_MODEL_API_KEY"):
        asyncio.run(gateway.generate("a prompt"))


def test_health_reflects_only_whether_a_key_is_configured():
    """探针不该花钱，所以只判断配没配，不发真实请求。"""
    handler, seen = _serving_image()

    assert asyncio.run(_gateway(handler).health()) is True
    assert seen == {}
