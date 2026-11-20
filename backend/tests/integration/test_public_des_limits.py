"""Public DES budgets include the ciphertext needed for an exact-limit round trip."""

from unittest.mock import Mock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import routes_des
from app.api.public_limits import DES_PLAIN_BYTES
from app.api.request_size_guard import MultipartCompletionGuard
from app.api.routes_des_file import router as file_router
from app.errors.handlers import register_exception_handlers


@pytest.fixture
def client():
    app = FastAPI()
    app.state.public_mode = True
    app.add_middleware(MultipartCompletionGuard)
    app.include_router(routes_des.router)
    app.include_router(file_router)
    register_exception_handlers(app)
    with TestClient(app) as client:
        yield client


def test_exact_plain_limit_round_trip(client):
    plain = "A" * DES_PLAIN_BYTES
    signed = client.post("/api/des/encrypt", json={"text": plain, "key": "133457799BBCDFF1"})
    assert signed.status_code == 200
    cipher = signed.json()["result"]
    assert len(cipher) == (DES_PLAIN_BYTES + 8) * 2
    restored = client.post("/api/des/decrypt", json={"text": cipher, "key": "133457799BBCDFF1"})
    assert restored.status_code == 200
    assert restored.json()["result"] == plain


@pytest.mark.parametrize("file", [False, True])
def test_first_byte_over_never_calls_core(client, monkeypatch, file):
    core = Mock(side_effect=AssertionError("oversized DES must not reach core"))
    monkeypatch.setattr(routes_des, "encrypt_data", core)
    data = "A" * (DES_PLAIN_BYTES + 1)
    if file:
        response = client.post(
            "/api/des/file",
            files={"file": ("audit.txt", data)},
            data={"key": "133457799BBCDFF1", "action": "encrypt"},
        )
    else:
        response = client.post("/api/des/encrypt", json={"text": data, "key": "133457799BBCDFF1"})
    assert response.status_code == 413
    assert "16 KiB" in response.json()["message"]
    core.assert_not_called()


def test_file_boundary_and_ciphertext_round_trip(client):
    raw = b"A" * DES_PLAIN_BYTES
    result = client.post(
        "/api/des/file",
        files={"file": ("audit.txt", raw)},
        data={"key": "133457799BBCDFF1", "action": "encrypt"},
    )
    assert result.status_code == 200
    restored = client.post(
        "/api/des/file",
        files={"file": ("cipher.txt", result.json()["result"])},
        data={"key": "133457799BBCDFF1", "action": "decrypt"},
    )
    assert restored.status_code == 200
    assert restored.json()["result"].encode() == raw
