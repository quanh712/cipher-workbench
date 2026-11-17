"""Exercise limits without relying on browser Content-Length or forwarded IPs."""

import asyncio

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.api.public_guard import PublicResourceGuard


def make_app(**limits):
    app = FastAPI()
    app.add_middleware(PublicResourceGuard, **limits)

    @app.post("/api/echo")
    async def echo(request: Request):
        return {"bytes": len(await request.body())}

    @app.get("/api/health")
    async def health():
        return {"ok": True}

    return app


def test_streaming_body_limit_and_recovery():
    with TestClient(make_app(max_bytes=4)) as client:
        assert client.post("/api/echo", content=iter([b"123", b"45"])).status_code == 413
        assert client.post("/api/echo", content=b"1234").json() == {"bytes": 4}


def test_rate_budget_cannot_be_reset_with_spoofed_forwarding_header():
    with TestClient(make_app(requests_per_minute=1)) as client:
        assert client.post("/api/echo", content=b"1").status_code == 200
        limited = client.post("/api/echo", headers={"X-Forwarded-For": "203.0.113.9"})
        assert limited.status_code == 429
        assert limited.headers["retry-after"] == "60"
        assert client.get("/api/health").status_code == 200


def test_concurrency_budget_and_release_after_completed_request():
    async def exercise():
        entered = asyncio.Event()
        release = asyncio.Event()

        async def downstream(scope, receive, send):
            entered.set()
            await release.wait()

        guard = PublicResourceGuard(downstream, max_concurrent=1)
        scope = {"type": "http", "path": "/api/work", "method": "POST"}
        statuses = []

        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(message):
            if message["type"] == "http.response.start":
                statuses.append(message["status"])

        first = asyncio.create_task(guard(scope, receive, send))
        await entered.wait()
        await guard(scope, receive, send)
        assert statuses == [503]
        release.set()
        await first
        await guard(scope, receive, send)
        assert guard.active == 0

    asyncio.run(exercise())


def test_upload_deadlines_release_slots_and_allow_recovery():
    async def exercise(trickle):
        called = False

        async def downstream(scope, receive, send):
            nonlocal called
            called = True

        guard = PublicResourceGuard(
            downstream, max_concurrent=1, body_timeout=0.04, body_idle_timeout=0.02
        )
        scope = {"type": "http", "path": "/api/work", "method": "POST"}
        statuses = []

        async def slow_receive():
            if trickle:
                await asyncio.sleep(0.005)
                return {"type": "http.request", "body": b"a", "more_body": True}
            await asyncio.Event().wait()

        async def send(message):
            if message["type"] == "http.response.start":
                statuses.append(message["status"])

        await asyncio.wait_for(guard(scope, slow_receive, send), timeout=1)
        assert statuses == [408]
        assert guard.active == 0
        assert not called

        async def complete():
            return {"type": "http.request", "body": b"ok", "more_body": False}

        await guard(scope, complete, send)
        assert called
        assert guard.active == 0

    asyncio.run(exercise(False))
    asyncio.run(exercise(True))


def test_disconnect_releases_upload_slot():
    async def exercise():
        async def downstream(scope, receive, send):
            raise AssertionError("Disconnected uploads must not reach the application")

        async def receive():
            return {"type": "http.disconnect"}

        async def send(message):
            raise AssertionError("Do not respond after disconnect")

        guard = PublicResourceGuard(downstream)
        await guard({"type": "http", "path": "/api/work"}, receive, send)
        assert guard.active == 0

    asyncio.run(exercise())
