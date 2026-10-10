"""Unit tests for the Agent's recent-diet tool.

The point of these: the tool used to return hard-coded mock meals keyed by baby
id, which meant a recommendation could be silently based on food the baby never
ate. It now takes whatever the caller passes in, and says so plainly when there
is nothing — so the model degrades to "recommend on nutrition grounds" instead
of "assume the baby already ate this".
"""

import json

from app.agent.tools import ToolExecutor, get_recent_diet


def test_recent_diet_comes_from_the_caller():
    provided = [
        {"day": "今天", "foods": ["米粉", "南瓜泥"]},
        {"day": "昨天", "foods": ["蛋黄泥"]},
    ]
    executor = ToolExecutor(recent_diet=provided)

    result = json.loads(executor._get_recent_diet({"baby_id": "1", "days": 3}))

    assert result["recent_diet"] == provided


def test_recent_diet_is_trimmed_to_the_requested_window():
    provided = [
        {"day": "今天", "foods": ["米粉"]},
        {"day": "昨天", "foods": ["南瓜泥"]},
        {"day": "前天", "foods": ["蛋黄泥"]},
    ]
    executor = ToolExecutor(recent_diet=provided)

    result = json.loads(executor._get_recent_diet({"baby_id": "1", "days": 2}))

    assert [day["day"] for day in result["recent_diet"]] == ["今天", "昨天"]


def test_absent_recent_diet_is_stated_not_invented():
    """没有数据时返回空列表 + 明确说明，而不是编几餐出来。"""
    executor = ToolExecutor()

    result = json.loads(executor._get_recent_diet({"baby_id": "1"}))

    assert result["recent_diet"] == []
    assert "未提供" in result["note"]


def test_helper_never_falls_back_to_mock_data():
    """调用方没给数据时，不能凭空造——这是替换掉旧 mock 的核心约束。"""
    assert get_recent_diet(days=3, recent_diet=None) == []
    assert get_recent_diet(days=3, recent_diet=[]) == []
