FROM node:25-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_PUBLIC_MODE=true VITE_ENABLE_HILL=true VITE_ENABLE_DES=true VITE_ENABLE_RSA=true VITE_ENABLE_DIFFIE_HELLMAN=true
RUN npm run build

FROM ghcr.io/astral-sh/uv:0.13.9 AS uv
FROM python:3.12-slim-bookworm AS backend
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev

FROM python:3.12-slim-bookworm
ARG GIT_SHA=development
LABEL org.opencontainers.image.revision=${GIT_SHA}
ENV GIT_SHA=${GIT_SHA} PUBLIC_MODE=true STATIC_DIR=/app/static PORT=8000 \
    PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PATH=/app/.venv/bin:$PATH
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
WORKDIR /app
COPY --from=backend /app/.venv /app/.venv
COPY backend/app ./app
COPY --from=frontend /build/dist ./static
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8000')+'/api/health',timeout=4)"
# Do not trust arbitrary forwarding headers; resource budgets are process-global.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --no-proxy-headers --limit-concurrency 32 --timeout-keep-alive 5"]
