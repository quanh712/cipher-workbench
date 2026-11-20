"""Algorithm-specific budgets for the small public deployment."""

from fastapi import Request

from app.errors.exceptions import DesError

DES_PLAIN_BYTES = 16 * 1024
DES_CIPHER_BYTES = DES_PLAIN_BYTES + 8  # PKCS#7 adds a block at the exact boundary.
DES_HEX_CHARS = DES_CIPHER_BYTES * 2
DES_LIMIT_MESSAGE = "DES public: tối đa 16 KiB bản rõ hoặc 32.784 ký tự HEX."


def public_mode(request: Request) -> bool:
    return bool(getattr(request.app.state, "public_mode", False))


def check_des(request: Request, data: bytes, *, plaintext: bool) -> None:
    # Bound block work before entering the CPU implementation, including file routes.
    maximum = DES_PLAIN_BYTES if plaintext else DES_CIPHER_BYTES
    if public_mode(request) and len(data) > maximum:
        raise DesError(413, DES_LIMIT_MESSAGE)


def check_des_text(request: Request, text: str, *, plaintext: bool) -> None:
    if public_mode(request):
        maximum = DES_PLAIN_BYTES if plaintext else DES_HEX_CHARS
        if len(text.encode("utf-8")) > maximum:
            raise DesError(413, DES_LIMIT_MESSAGE)


def des_upload_limit(request: Request, *, plaintext: bool) -> int:
    from app import config

    if public_mode(request):
        return DES_PLAIN_BYTES if plaintext else DES_HEX_CHARS
    return config.MAX_FILE_BYTES
