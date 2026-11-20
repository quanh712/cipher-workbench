"""One disposable worker for untrusted PEM parsing and RSA operations."""

import base64
import json
import sys

from app.core import rsa_signatures


def main() -> None:
    # Untrusted PEM can request arbitrary KDF work. OS limits complement the
    # parent's wall deadline; never skip RSA key validation to save CPU.
    if sys.platform == "linux":
        import resource

        resource.setrlimit(resource.RLIMIT_CPU, (4, 4))
        resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    payload = json.loads(sys.stdin.buffer.read(8 * 1024 * 1024))
    content = base64.b64decode(payload["content"], validate=True)
    try:
        if payload["operation"] == "sign":
            signature, public = rsa_signatures.sign_with_public_key(
                content, payload["pem"], payload["password"]
            )
            result = [rsa_signatures.encode_signature(signature), public.decode("ascii")]
        elif payload["operation"] == "verify":
            result = rsa_signatures.verify_bytes_base64(
                content, payload["signature"], payload["pem"]
            )
        else:
            raise ValueError("Unknown worker operation")
        print(json.dumps({"result": result}))
    except rsa_signatures.RsaSignatureError as exc:
        print(json.dumps({"error": exc.code, "field": exc.field}))


if __name__ == "__main__":
    main()
