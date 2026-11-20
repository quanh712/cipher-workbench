"""The worker emits only results or safe domain errors; never third-party errors."""

import base64
import io
import json
from types import SimpleNamespace

import pytest

from app.core.rsa_signatures import RsaSignatureError
from app.services import pem_worker


@pytest.mark.parametrize("operation", ["sign", "verify", "invalid-key"])
def test_worker_protocol(monkeypatch, capsys, operation):
    payload = {
        "operation": "sign" if operation == "invalid-key" else operation,
        "content": base64.b64encode(b"audit").decode(),
        "pem": "fixture",
        "password": None,
        "signature": "Zml4dHVyZQ=",
    }
    monkeypatch.setattr(pem_worker.sys, "platform", "test")
    monkeypatch.setattr(
        pem_worker.sys, "stdin", SimpleNamespace(buffer=io.BytesIO(json.dumps(payload).encode()))
    )

    def sign(*args):
        if operation == "invalid-key":
            raise RsaSignatureError("INVALID_PRIVATE_KEY", "privateKey")
        return b"signature", b"PUBLIC"

    monkeypatch.setattr(pem_worker.rsa_signatures, "sign_with_public_key", sign)
    monkeypatch.setattr(pem_worker.rsa_signatures, "verify_bytes_base64", lambda *args: True)
    pem_worker.main()
    value = json.loads(capsys.readouterr().out)
    if operation == "invalid-key":
        assert value == {"error": "INVALID_PRIVATE_KEY", "field": "privateKey"}
    elif operation == "sign":
        assert value == {"result": [base64.b64encode(b"signature").decode(), "PUBLIC"]}
    else:
        assert value == {"result": True}
