"""Bounds protect validation, and a slow core cannot block unrelated async work."""

import asyncio
import threading

import httpx
import pytest
from fastapi import FastAPI

from app.api import routes_additional_text, routes_text
from app.api.public_limits import CLASSICAL_BYTES
from app.api.request_size_guard import MultipartCompletionGuard
from app.api.routes_additional_file import playfair_file_router
from app.errors.handlers import register_exception_handlers


def application():
    app = FastAPI()
    app.state.public_mode = True
    app.add_middleware(MultipartCompletionGuard)
    app.include_router(routes_additional_text.playfair_router)
    app.include_router(playfair_file_router)
    app.include_router(routes_text.router)
    register_exception_handlers(app)
    return app


@pytest.mark.parametrize("file", [False, True])
def test_oversized_text_and_file_are_rejected_before_core(monkeypatch, file):
    def forbidden(*args):
        raise AssertionError("oversized request reached validation/core")

    monkeypatch.setattr(routes_additional_text, "validate_additional_text_request", forbidden)

    async def check():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application()), base_url="http://test"
        ) as client:
            if file:
                response = await client.post(
                    "/api/playfair/file",
                    files={"file": ("x.txt", b"A" * (CLASSICAL_BYTES + 1))},
                    data={"key": "MONARCHY", "action": "encrypt"},
                )
            else:
                response = await client.post(
                    "/api/playfair/encrypt",
                    json={"text": "A" * (CLASSICAL_BYTES + 1), "key": "MONARCHY"},
                )
            assert response.status_code == 413
            assert "64 KiB" in response.json()["message"]

    asyncio.run(check())


def test_slow_classical_core_leaves_event_loop_responsive(monkeypatch):
    started = threading.Event()
    release = threading.Event()

    def slow(*args):
        started.set()
        assert release.wait(2)
        return "AUDIT"

    monkeypatch.setattr(routes_additional_text, "transform_playfair", slow)

    async def check():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application()), base_url="http://test"
        ) as client:
            task = asyncio.create_task(
                client.post("/api/playfair/encrypt", json={"text": "AB", "key": "MONARCHY"})
            )
            try:
                for _ in range(100):
                    if started.is_set():
                        break
                    await asyncio.sleep(0.005)
                assert started.is_set()
                # This completes while the Playfair worker is still blocked.
                result = await asyncio.wait_for(
                    client.post("/api/caesar/encrypt", json={"text": "ABC", "key": 3}), timeout=0.5
                )
                assert result.json()["result"] == "DEF"
                assert not task.done()
            finally:
                release.set()
            assert (await task).status_code == 200

    asyncio.run(check())


def test_playfair_filler_expansion_remains_decryptable_as_text_and_file():
    async def check():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=application()), base_url="http://test"
        ) as client:
            plain = "A" * CLASSICAL_BYTES
            encrypted = await client.post(
                "/api/playfair/encrypt", json={"text": plain, "key": "MONARCHY"}
            )
            assert encrypted.status_code == 200
            cipher = encrypted.json()["result"]
            assert len(cipher) == CLASSICAL_BYTES * 2
            decrypted = await client.post(
                "/api/playfair/decrypt", json={"text": cipher, "key": "MONARCHY"}
            )
            assert decrypted.status_code == 200
            assert decrypted.json()["padding"]["filtered"] == plain
            file = await client.post(
                "/api/playfair/file",
                files={"file": ("cipher.txt", cipher)},
                data={"key": "MONARCHY", "action": "decrypt", "strip_padding": "true"},
            )
            assert file.status_code == 200
            assert file.json()["padding"]["filtered"] == plain

    asyncio.run(check())
