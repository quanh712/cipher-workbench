"""Untrusted key work must stop before its reserved capacity is released."""

import asyncio

import pytest

from app.services import pem_process

EXPENSIVE_PEM = "-----BEGIN ENCRYPTED PRIVATE KEY-----\nMIGFMGEGCSqGSIb3DQEFDTBUMDMGCSqGSIb3DQEFDDAmBBBTU1NTU1NTU1NTU1NTU1NTAgQ7msoA\nMAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBBJSUlJSUlJSUlJSUlJSUlJBCAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==\n-----END ENCRYPTED PRIVATE KEY-----\n".encode()


def test_expensive_pem_is_killed_and_capacity_recovers(monkeypatch):
    monkeypatch.setattr(pem_process, "PEM_WALL_SECONDS", 0.25)
    children = []
    create = asyncio.create_subprocess_exec

    async def tracked(*args, **kwargs):
        child = await create(*args, **kwargs)
        children.append(child)
        return child

    monkeypatch.setattr(asyncio, "create_subprocess_exec", tracked)

    async def check():
        for _ in range(3):
            with pytest.raises(pem_process.PemDeadlineError):
                await pem_process.run_pem("sign", b"audit", EXPENSIVE_PEM, password="audit")
            assert children[-1].returncode is not None

    asyncio.run(check())


def test_cancel_stops_child_before_releasing_capacity(monkeypatch):
    children = []
    create = asyncio.create_subprocess_exec

    async def tracked(*args, **kwargs):
        child = await create(*args, **kwargs)
        children.append(child)
        return child

    monkeypatch.setattr(asyncio, "create_subprocess_exec", tracked)

    async def check():
        task = asyncio.create_task(
            pem_process.run_pem("sign", b"audit", EXPENSIVE_PEM, password="audit")
        )
        while not children:
            await asyncio.sleep(0.01)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert children[0].returncode is not None

    asyncio.run(check())


def test_capacity_rejects_without_starting_more_children(monkeypatch):
    async def check():
        acquired = [pem_process._CAPACITY.acquire(False) for _ in range(2)]
        try:
            assert all(acquired)
            with pytest.raises(pem_process.PemCapacityError):
                await pem_process.run_pem("sign", b"audit", EXPENSIVE_PEM, password="audit")
        finally:
            for reserved in acquired:
                if reserved:
                    pem_process._CAPACITY.release()

    asyncio.run(check())
