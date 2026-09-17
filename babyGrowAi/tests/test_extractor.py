"""Unit tests for `BabyRecordExtractor`.

Covers happy path, JSON validation retry, and gateway failure handling.
"""

import json
from pathlib import Path

import pytest

from app.extractor import BabyRecordExtractor
from app.models import ExtractionResult

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _fake_gateway(response_text: str):
    """Return a minimal fake gateway that always returns the given content."""
    class FakeGateway:
        async def chat_sync(self, messages, format=None, options=None):
            return {"message": {"content": response_text}}

    return FakeGateway()


def load_samples():
    """Load extraction regression samples."""
    with open(FIXTURES_DIR / "extraction_samples.json", encoding="utf-8") as f:
        return json.load(f)["samples"]


@pytest.mark.asyncio
async def test_extract_with_valid_json():
    """A valid model response should be parsed into an structured result."""
    raw_json = '{"milestones":[{"type":"运动","event":"首次自己站起来","is_first":true}],"food":[{"name":"南瓜泥","category":"蔬菜","is_first":true}],"milk":[]}'
    extractor = BabyRecordExtractor(gateway=_fake_gateway(raw_json))
    result = await extractor.extract("今天宝宝第一次自己站起来了，还吃了南瓜泥", baby_age_months=10)

    assert result.status == "ok"
    assert result.data is not None
    assert len(result.data.milestones) == 1
    assert result.data.milestones[0].event == "首次自己站起来"
    assert len(result.data.food) == 1


@pytest.mark.asyncio
async def test_extract_json_validation_retry():
    """If the first response is not valid JSON, the extractor should retry once."""
    invalid_json = "not valid json"
    valid_json = '{"milestones":[{"type":"语言","event":"首次叫爸爸","is_first":true}],"food":[]}'

    class FakeGateway:
        def __init__(self):
            self.calls = 0

        async def chat_sync(self, messages, format=None, options=None):
            self.calls += 1
            if self.calls == 1:
                return {"message": {"content": invalid_json}}
            return {"message": {"content": valid_json}}

    gateway = FakeGateway()
    extractor = BabyRecordExtractor(gateway=gateway)
    result = await extractor.extract("宝宝第一次叫了爸爸", baby_age_months=9)

    assert result.status == "ok"
    assert result.data is not None
    assert gateway.calls == 2


@pytest.mark.asyncio
async def test_extract_failure_returns_error():
    """A gateway exception should be surfaced as an error response."""
    class FailingGateway:
        async def chat_sync(self, messages, format=None, options=None):
            raise RuntimeError("Ollama unreachable")

    extractor = BabyRecordExtractor(gateway=FailingGateway())
    result = await extractor.extract("今天宝宝吃了苹果", baby_age_months=8)

    assert result.status == "error"
    assert result.error is not None
    assert result.data is None
