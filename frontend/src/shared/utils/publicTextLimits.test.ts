import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("counts public text and file limits in bytes at the exact boundary", async () => {
  vi.stubEnv("VITE_PUBLIC_MODE", "true");
  vi.resetModules();
  const { publicTextError, validateTextFile } = await import("./textFileValidation");
  expect(publicTextError("é".repeat(32768))).toBeNull();
  expect(publicTextError("é".repeat(32768) + "a")).toMatch(/64 KiB/);
  expect(validateTextFile(new File([new Uint8Array(65536)], "x.txt"))).toBeNull();
  expect(validateTextFile(new File([new Uint8Array(65537)], "x.txt"))).toMatch(/64 KiB/);
});
