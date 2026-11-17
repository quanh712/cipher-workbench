import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("rejects public Hill files beyond the server trace budget", async () => {
  vi.stubEnv("VITE_PUBLIC_MODE", "true");
  vi.resetModules();
  const { HILL_MAX_BYTES, HILL_SIZE_ERROR, HILL_FILE_HINT } = await import("./limits");
  const { validateHillFile } = await import("./fileText");
  expect(HILL_MAX_BYTES).toBe(16384);
  expect(validateHillFile(new File(["A".repeat(16384)], "input.txt"))).toBeNull();
  expect(validateHillFile(new File(["A".repeat(16385)], "input.txt"))).toBe(HILL_SIZE_ERROR);
  expect(HILL_FILE_HINT).toContain("16 KiB");
});

it("preserves the existing non-public Hill limit", async () => {
  vi.stubEnv("VITE_PUBLIC_MODE", "false");
  vi.resetModules();
  const { HILL_MAX_BYTES } = await import("./limits");
  expect(HILL_MAX_BYTES).toBe(5 * 1024 * 1024);
});
