"""Security policies must cover shell routes, rejected requests and server errors."""

import base64
import hashlib

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.frontend import register_frontend
from app.api.public_guard import PublicResourceGuard
from app.api.security_headers import SECURITY_HEADERS, SecurityHeaders
from app.errors.handlers import register_exception_handlers


def test_shell_csp_hashes_exact_bootstrap_and_preserves_cache(tmp_path):
    script = "\nwindow.theme = 'dark';\n"
    (tmp_path / "index.html").write_text(
        f'<script>{script}</script><script src="/app.js"></script>'
    )
    (tmp_path / "app.js").write_text("console.log('ok')")
    app = FastAPI()
    app.add_middleware(SecurityHeaders)
    register_frontend(app, str(tmp_path))
    digest = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
    with TestClient(app) as client:
        for path in ("/", "/workspace/hill", "/index.html", "/app.js"):
            response = client.get(path)
            assert response.status_code == 200
            policy = response.headers["content-security-policy"]
            assert f"'sha256-{digest}'" in policy
            assert "frame-ancestors 'none'" in policy
            script_policy = next(
                p for p in policy.split(";") if p.strip().startswith("script-src ")
            )
            assert "unsafe-inline" not in script_policy
            assert "unsafe-eval" not in policy
            for name, value in SECURITY_HEADERS.items():
                assert response.headers[name] == value
            assert response.headers["cache-control"] == "no-cache"


def test_security_headers_on_guard_rejection_and_unexpected_error():
    app = FastAPI()
    app.add_middleware(PublicResourceGuard, max_bytes=2)
    app.add_middleware(SecurityHeaders)
    register_exception_handlers(app)

    @app.get("/api/crash")
    async def crash():
        raise ValueError("private input must never be returned")

    with TestClient(app, raise_server_exceptions=False) as client:
        rejected = client.post("/api/rejected", content=b"123")
        assert rejected.status_code == 413
        crashed = client.get("/api/crash")
        assert crashed.status_code == 500
        assert "private input" not in crashed.text
        for response in (rejected, crashed):
            for name, value in SECURITY_HEADERS.items():
                assert response.headers[name] == value
