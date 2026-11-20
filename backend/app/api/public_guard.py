"""Bounded single-process resource protection for the small public deployment.

The rate budget is deliberately global: proxy-provided IP headers are untrusted,
and a Render ingress peer must not be mistaken for an individual browser.
"""

import asyncio
import time

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class PublicResourceGuard:
    """Cap API request size (including chunked bodies), rate, and concurrent work."""

    def __init__(
        self,
        app: ASGIApp,
        max_bytes: int = 8 * 1024 * 1024,
        requests_per_minute: int = 300,
        max_concurrent: int = 4,
        body_timeout: float = 30,
        body_idle_timeout: float = 10,
    ) -> None:
        self.app = app
        self.max_bytes = max_bytes
        self.requests_per_minute = requests_per_minute
        self.max_concurrent = max_concurrent
        if body_timeout <= 0 or body_idle_timeout <= 0:
            raise ValueError("Body timeouts must be positive")
        self.body_timeout = body_timeout
        self.body_idle_timeout = body_idle_timeout
        self.window_start = time.monotonic()
        self.requests = 0
        self.active = 0

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        path = scope.get("path", "")
        if scope["type"] != "http" or not path.startswith("/api/") or path == "/api/health":
            await self.app(scope, receive, send)
            return
        now = time.monotonic()
        if now - self.window_start >= 60:
            self.window_start = now
            self.requests = 0
        if self.requests >= self.requests_per_minute:
            await self._reject(
                scope, receive, send, 429, "Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."
            )
            return
        self.requests += 1
        if self.active >= self.max_concurrent:
            await self._reject(scope, receive, send, 503, "Máy chủ đang bận. Vui lòng thử lại sau.")
            return
        self.active += 1
        try:
            # Bound buffering even if Content-Length is missing, incorrect, or chunked.
            body = bytearray()
            # Small DES payloads must not carry megabytes of ignored/invalid fields.
            request_max = (
                min(self.max_bytes, 256 * 1024) if path.startswith("/api/des/") else self.max_bytes
            )
            if path.split("/")[2] in {"caesar", "affine", "columnar", "vigenere", "playfair"}:
                request_max = min(
                    request_max, (1024 if path.startswith("/api/playfair/") else 512) * 1024
                )
            # Bound both silent uploads and continuous trickles before they hold all slots.
            deadline = time.monotonic() + self.body_timeout
            while True:
                remaining = min(self.body_idle_timeout, deadline - time.monotonic())
                try:
                    message = await asyncio.wait_for(receive(), timeout=max(0, remaining))
                except TimeoutError:
                    await self._reject(
                        scope,
                        receive,
                        send,
                        408,
                        "Hết thời gian tải dữ liệu. Vui lòng thử lại.",
                    )
                    return
                if message["type"] == "http.disconnect":
                    return
                chunk = message.get("body", b"")
                if len(body) + len(chunk) > request_max:
                    await self._reject(
                        scope, receive, send, 413, "Yêu cầu vượt quá dung lượng cho phép."
                    )
                    return
                body.extend(chunk)
                if not message.get("more_body", False):
                    break
            pending = True

            async def replay() -> Message:
                nonlocal pending
                if pending:
                    pending = False
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()

            await self.app(scope, replay, send)
        finally:
            self.active -= 1

    @staticmethod
    async def _reject(
        scope: Scope, receive: Receive, send: Send, status: int, message: str
    ) -> None:
        response = JSONResponse(
            {"success": False, "message": message},
            status_code=status,
            headers={"Retry-After": "60"} if status in {429, 503} else None,
        )
        await response(scope, receive, send)
