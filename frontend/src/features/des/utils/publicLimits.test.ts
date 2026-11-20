import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("public DES accepts exact plaintext and its padded hex ciphertext", async () => {
  vi.stubEnv("VITE_PUBLIC_MODE", "true");
  vi.resetModules();
  const { validateDesDraft } = await import("./validation");
  const draft = {
    mode: "encrypt" as const,
    inputType: "text" as const,
    text: "A".repeat(16384),
    file: null,
    key: "133457799BBCDFF1",
    cipherMode: "ECB" as const,
    format: "text" as const,
    iv: "",
  };
  expect(validateDesDraft(draft, false)).toEqual({});
  expect(validateDesDraft({ ...draft, text: draft.text + "A" }, false).input).toMatch(/16 KiB/);
  expect(validateDesDraft({ ...draft, mode: "decrypt", text: "A".repeat(32784) }, false)).toEqual(
    {},
  );
  expect(
    validateDesDraft(
      { ...draft, inputType: "file", file: new File([new Uint8Array(16385)], "x.txt") },
      false,
    ).file,
  ).toMatch(/16 KiB/);
});
