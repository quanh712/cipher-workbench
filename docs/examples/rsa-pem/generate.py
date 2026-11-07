"""Generate disposable RSA-PSS/SHA-256 demo inputs (requires cryptography)."""
import argparse
import base64
import json
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    # A new directory avoids overwriting an existing example or key.
    args.output.mkdir(parents=True, exist_ok=False, mode=0o700)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode("ascii")
    public = key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode("ascii")
    text = "Cipher Workbench — Ví dụ chữ ký PEM."
    signature = base64.b64encode(key.sign(
        text.encode("utf-8"),
        padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32),
        hashes.SHA256(),
    )).decode("ascii")
    sign = {"source": "text", "text": text, "privateKeyPem": private}
    verify = {
        "source": "text", "text": text,
        "signature": signature, "publicKeyPem": public,
    }
    files = {
        "private.pem": private, "public.pem": public,
        "message.txt": text, "signature.txt": signature,
        "sign.json": json.dumps(sign, ensure_ascii=False, indent=2),
        "verify.json": json.dumps(verify, ensure_ascii=False, indent=2),
        "verify-tampered.json": json.dumps(
            {**verify, "text": text + " Đã sửa."}, ensure_ascii=False, indent=2
        ),
    }
    for name, content in files.items():
        path = args.output / name
        path.write_text(content, encoding="utf-8")
        path.chmod(0o600)
    print(args.output.resolve())


if __name__ == "__main__":
    main()
