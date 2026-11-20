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


CLASSICAL_BYTES = 64 * 1024
CLASSICAL_MESSAGE = (
    "Bản public: tối đa 64 KiB văn bản/file, 128 KiB khi giải mã Playfair và 2 KiB khóa."
)


def classical_bytes(request: Request, action: str = "") -> int:
    # Playfair may insert a filler after every letter. Accept its entire
    # ciphertext on decrypt so exact-limit encryption remains usable.
    expanded = request.url.path.startswith("/api/playfair/") and (
        request.url.path.endswith("/decrypt") or action == "decrypt"
    )
    return CLASSICAL_BYTES * (2 if expanded else 1)


def check_classical(request: Request, fields: dict) -> None:
    from app.errors.exceptions import AppError

    if not public_mode(request):
        return
    # Bound normalization and validation as well as the eventual transform.
    for name, value in fields.items():
        if isinstance(value, str):
            try:
                length = len(value.encode("utf-8"))
            except UnicodeEncodeError:
                raise AppError(422, "Văn bản phải là UTF-8 hợp lệ.") from None
            if length > (classical_bytes(request) if name == "text" else 2048):
                raise AppError(413, CLASSICAL_MESSAGE)


async def read_classical_file(request: Request, reader, action: str = "") -> bytes:
    from app import config
    from app.errors.exceptions import AppError, FileTooLargeError
    from app.services.file_processing import read_limited_bytes

    try:
        return await read_limited_bytes(
            reader,
            classical_bytes(request, action) if public_mode(request) else config.MAX_FILE_BYTES,
        )
    except FileTooLargeError:
        if public_mode(request):
            raise AppError(413, CLASSICAL_MESSAGE) from None
        raise
