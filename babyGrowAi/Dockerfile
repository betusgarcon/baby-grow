# Python AI 服务镜像

FROM python:3.11-slim AS builder

WORKDIR /app

# 安装编译 psycopg2 所需系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 创建虚拟环境
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 复制全部源码和数据（editable install 需要 src 存在）
COPY . .
RUN pip install --no-cache-dir -e .

# 第二阶段：仅保留运行时所需内容
FROM python:3.11-slim

WORKDIR /app

# 安装运行时依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# 复制虚拟环境
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 复制应用源码、数据和项目元数据
# 注意：保持与 builder 阶段相同的 /app 路径，确保 egg-link 有效
COPY --from=builder /app/src ./src
COPY --from=builder /app/data ./data
COPY --from=builder /app/pyproject.toml ./

# 确保 app 包可被导入
ENV PYTHONPATH="/app/src"

EXPOSE 8001

CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8001"]
