"""共享测试配置。

有一部分回归用例会直接调用本机的 Ollama / embedding 模型（食谱 Agent、引用、
抽取与检索）。CI 环境没有模型，这些用例会在收集阶段被跳过；本地要跑全量请设置：

    RUN_AI_INTEGRATION=1 pytest
"""

import os

import pytest


def pytest_collection_modifyitems(config, items):
    if os.getenv("RUN_AI_INTEGRATION") == "1":
        return

    skip = pytest.mark.skip(
        reason="requires local Ollama models; set RUN_AI_INTEGRATION=1 to run"
    )
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip)
