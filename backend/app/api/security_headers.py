"""Browser defenses shared by API responses and the frontend shell."""

import base64
import hashlib
import re

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.errors.response_headers import SECURITY_HEADERS


def frontend_csp(html: str) -> str:
    # Hash the build's theme bootstrap; do not allow arbitrary inline JavaScript.
    hashes = []
    for match in re.finditer(r"<script\b([^>]*)>(.*?)</script\s*>", html, re.I | re.S):
        if re.search(r"\bsrc\s*=", match[1], re.I):
            continue
        digest = base64.b64encode(hashlib.sha256(match[2].encode("utf-8")).digest()).decode()
        hashes.append(f"'sha256-{digest}'")
    return "; ".join(
        [
            "default-src 'self'",
            "script-src 'self' " + " ".join(hashes),
            "script-src-attr 'none'",
            # Existing CSS-in-JS style attributes and inlined entry CSS require inline styles.
            # This allowance is for CSS only; script execution stays hash constrained.
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
        ]
    )


class SecurityHeaders:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def secure_send(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                existing = {name.lower() for name, _ in headers}
                headers.extend(
                    (name.lower().encode(), value.encode())
                    for name, value in SECURITY_HEADERS.items()
                    if name.lower().encode() not in existing
                )
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, secure_send)
