"""Deployment invariants: stateless public boot and same-origin routing."""

import os
import subprocess
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.frontend import register_frontend


def test_frontend_serves_assets_and_deep_links_without_swallowing_api(tmp_path):
    (tmp_path / "index.html").write_text("<html>cipher UI</html>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets/app.js").write_text("console.log('cipher')")
    app = FastAPI()
    register_frontend(app, str(tmp_path))
    with TestClient(app) as client:
        assert client.get("/").text == "<html>cipher UI</html>"
        assert client.get("/workspace/caesar").status_code == 200
        assert client.get("/assets/app.js").text == "console.log('cipher')"
        for path in ("/api", "/api/missing", "/assets/missing.js", "/missing.css"):
            response = client.get(path)
            assert response.status_code == 404
            assert response.headers["content-type"].startswith("application/json")
        assert client.get("/%2e%2e/private.txt").status_code == 404


@pytest.mark.parametrize(
    ("path", "cache"),
    [
        ("assets/index-aB12_cd3.js", "public, max-age=31536000, immutable"),
        ("assets/RsaWorkspace-aB12_cd3.css", "public, max-age=31536000, immutable"),
        ("assets/app.js", "no-cache"),
        ("theme-bootstrap.js", "no-cache"),
        ("fonts/barlow/font.woff2", "no-cache"),
        ("index.html", "no-cache"),
    ],
)
def test_frontend_cache_depends_on_asset_fingerprint(tmp_path, path, cache):
    (tmp_path / "index.html").write_text("<html>cipher UI</html>")
    target = tmp_path / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("asset")
    app = FastAPI()
    register_frontend(app, str(tmp_path))
    with TestClient(app) as client:
        assert client.get(f"/{path}").headers["cache-control"] == cache
        assert client.get("/").headers["cache-control"] == "no-cache"
        assert client.get("/workspace/rsa").headers["cache-control"] == "no-cache"


def test_frontend_requires_real_build(tmp_path):
    with pytest.raises(RuntimeError, match=r"index\.html"):
        register_frontend(FastAPI(), str(tmp_path))


def test_public_boot_ignores_database_and_history_settings():
    # A fresh interpreter verifies import-time public configuration, without
    # changing the legacy app instance imported by the rest of the test suite.
    script = """
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as client:
    health = client.get('/api/health').json()['result']
    assert health == {'app': 'ok', 'database': 'disabled', 'history': 'disabled'}
    assert app.state.db is None
    assert client.get('/api/release').json() == {'revision': 'test-revision'}
    response = client.post('/api/caesar/encrypt', json={'text': 'Hi', 'key': 1})
    assert response.json() == {'success': True, 'result': 'Ij'}
    assert 'set-cookie' not in response.headers
    assert client.get('/api/history').status_code == 404
"""
    result = subprocess.run(
        [sys.executable, "-c", script],
        env={
            **os.environ,
            "PUBLIC_MODE": "true",
            "DATABASE_URL": "invalid",
            "HISTORY_API_ENABLED": "true",
            "GIT_SHA": "test-revision",
            "STATIC_DIR": "",
        },
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
