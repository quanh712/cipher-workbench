"""Bounded, killable subprocess boundary for user-supplied PEM operations."""

import asyncio
import base64
import contextlib
import json
import sys
from threading import BoundedSemaphore
from typing import Any

from app.core.rsa_signatures import RsaSignatureError

PEM_WALL_SECONDS = 8
_CAPACITY = BoundedSemaphore(2)


class PemCapacityError(Exception):
    pass


class PemDeadlineError(Exception):
    pass


async def run_pem(operation: str, content: bytes, pem: bytes, **options: Any) -> Any:
    # A thread timeout cannot stop OpenSSL. Reserve capacity until the child
    # has exited, including cancellation and forced termination.
    if not _CAPACITY.acquire(blocking=False):
        raise PemCapacityError()
    process = None
    try:
        payload = json.dumps(
            {
                "operation": operation,
                "content": base64.b64encode(content).decode("ascii"),
                "pem": pem.decode("utf-8"),
                **options,
            }
        ).encode()
        process = await asyncio.create_subprocess_exec(
            sys.executable,
            "-m",
            "app.services.pem_worker",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        try:
            stdout, _ = await asyncio.wait_for(
                process.communicate(payload), timeout=PEM_WALL_SECONDS
            )
        except TimeoutError:
            raise PemDeadlineError() from None
        if process.returncode != 0:
            raise PemDeadlineError()
        result = json.loads(stdout)
        if "error" in result:
            raise RsaSignatureError(result["error"], result["field"])
        return result["result"]
    finally:
        if process is not None and process.returncode is None:
            with contextlib.suppress(ProcessLookupError):
                process.kill()
            await process.wait()
        _CAPACITY.release()
