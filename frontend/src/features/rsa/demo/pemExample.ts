/** Disposable sample keys, generated only when the user requests an example. */
function pem(label: string, buffer: ArrayBuffer): string {
  const encoded = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return `-----BEGIN ${label}-----\n${encoded.match(/.{1,64}/g)!.join("\n")}\n-----END ${label}-----\n`;
}

export async function createPemExample() {
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const text = "Cipher Workbench — Ví dụ chữ ký PEM tiếng Việt.";
  const [privateKey, publicKey, signature] = await Promise.all([
    crypto.subtle.exportKey("pkcs8", keys.privateKey),
    crypto.subtle.exportKey("spki", keys.publicKey),
    crypto.subtle.sign(
      { name: "RSA-PSS", saltLength: 32 },
      keys.privateKey,
      new TextEncoder().encode(text),
    ),
  ]);
  return {
    text,
    privateKey: pem("PRIVATE KEY", privateKey),
    publicKey: pem("PUBLIC KEY", publicKey),
    signature: btoa(String.fromCharCode(...new Uint8Array(signature))),
  };
}
