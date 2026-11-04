import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { getHistory, getDhHistory } from "./historyApi";
import {
  appendBrowserHistory,
  readBrowserHistory,
  deleteBrowserHistory,
  HISTORY_TTL,
  HISTORY_KEY,
} from "./browserHistory";
import { getSignatureDetail, verificationDraft, deleteSignature } from "./signatureHistoryApi";
import { browserHistoryFetch } from "../../../shared/services/browserHistoryFetch";
const row = (id = 1) => ({
  id,
  createdAt: new Date().toISOString(),
  cipher: "caesar" as const,
  operation: "encrypt" as const,
  source: "text" as const,
  responseMode: null,
  inputLength: 5,
  outputLength: 5,
  httpStatus: 200,
  succeeded: true,
  durationMs: 1,
});
beforeEach(() => localStorage.removeItem(HISTORY_KEY));
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("filters and paginates browser history without contacting the server", async () => {
  const network = vi.spyOn(globalThis, "fetch");
  for (let i = 1; i <= 23; i++) appendBrowserHistory(row(i));
  const page = await getHistory({ cipher: "caesar", operation: "encrypt" });
  expect(page.items).toHaveLength(20);
  expect((await getHistory({ cursor: page.nextCursor! })).items).toHaveLength(3);
  expect((await getDhHistory({})).items).toHaveLength(0);
  expect(network).not.toHaveBeenCalled();
});
it("expires at exactly one hour and physically prunes expired rows on read", () => {
  vi.useFakeTimers();
  appendBrowserHistory(row());
  vi.advanceTimersByTime(HISTORY_TTL - 1);
  expect(readBrowserHistory()).toHaveLength(1);
  vi.advanceTimersByTime(1);
  expect(readBrowserHistory()).toEqual([]);
  expect(localStorage.getItem(HISTORY_KEY)).toBe("[]");
});
it("bounds retained records, deletes entries and clears all", () => {
  for (let i = 0; i < 110; i++) appendBrowserHistory(row(i));
  expect(readBrowserHistory()).toHaveLength(100);
  deleteBrowserHistory(109);
  expect(readBrowserHistory()).toHaveLength(99);
  deleteBrowserHistory();
  expect(readBrowserHistory()).toEqual([]);
});
it("does not fail the operation when storage is unavailable", async () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ success: true, result: "BCD" }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await expect(
    browserHistoryFetch("/api/caesar/encrypt", {
      body: JSON.stringify({ text: "ABC", key: "secret-key" }),
    }),
  ).resolves.toBeInstanceOf(Response);
});
it("stores only public raw RSA data for reuse, excludes private key and traces", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        result: {
          mode: "raw-integer",
          signature: "588",
          publicKey: { e: "17", n: "3233" },
          trace: { exponent: "private-exponent" },
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );
  await browserHistoryFetch("/api/rsa/sign/raw", {
    body: JSON.stringify({ m: "65", e: "17", n: "3233", d: "private-exponent" }),
  });
  const rows = readBrowserHistory();
  expect(localStorage.getItem(HISTORY_KEY)).not.toContain("private-exponent");
  expect(verificationDraft(await getSignatureDetail(rows[0].id))).toEqual({
    m: "65",
    signature: "588",
    e: "17",
    n: "3233",
  });
  await deleteSignature(rows[0].id);
  expect(readBrowserHistory()).toEqual([]);
});
it("never persists uploaded bytes, original text, cipher keys, or DH secrets", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          success: true,
          result: "private-upload-result",
          privateKeyA: "private-dh-secret",
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
  );
  const form = new FormData();
  form.append("file", new File(["private-upload-bytes"], "private-name.txt"));
  form.append("action", "encrypt");
  form.append("key", "private-cipher-key");
  await browserHistoryFetch("/api/des/file", { body: form });
  await browserHistoryFetch("/api/dh/exchange", {
    body: JSON.stringify({ privateKeyA: "private-dh-secret" }),
  });
  await browserHistoryFetch("/api/caesar/encrypt", {
    body: JSON.stringify({ text: "private-original-text", key: 3 }),
  });
  const stored = localStorage.getItem(HISTORY_KEY)!;
  for (const secret of [
    "private-upload-bytes",
    "private-upload-result",
    "private-name.txt",
    "private-cipher-key",
    "private-dh-secret",
    "private-original-text",
  ])
    expect(stored).not.toContain(secret);
  expect(readBrowserHistory()).toHaveLength(3);
});
it("recovers from malformed local storage", () => {
  localStorage.setItem(HISTORY_KEY, "broken");
  expect(readBrowserHistory()).toEqual([]);
});

it.each([
  ["params", "validate_params"],
  ["params/random", "generate_params"],
  ["keypair", "generate_keypair"],
  ["shared-secret", "derive_shared_secret"],
  ["caesar", "encrypt"],
])("maps DH route %s to metadata operation %s", async (path, operation) => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("{}", { headers: { "Content-Type": "application/json" } }),
  );
  await browserHistoryFetch(`/api/dh/${path}`, {
    body: JSON.stringify({ action: "encrypt", privateKey: "never-store-this" }),
  });
  expect((await getDhHistory({})).items[0].operation).toBe(operation);
  expect(localStorage.getItem(HISTORY_KEY)).not.toContain("never-store-this");
});
it("bounds an oversized prior record and retains safe new operations", () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([{ ...row(), oversized: "x".repeat(300_000) }]));
  expect(readBrowserHistory()).toHaveLength(0);
  appendBrowserHistory(row(2));
  expect(readBrowserHistory()).toHaveLength(1);
  expect(new TextEncoder().encode(localStorage.getItem(HISTORY_KEY)!).byteLength).toBeLessThan(
    256_001,
  );
});
it("labels JSON file processing without retaining original file contents", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
  await browserHistoryFetch(
    "/api/hill/encrypt",
    { body: JSON.stringify({ text: "private-file-content", key: [3, 4] }) },
    { source: "file", inputLength: 20 },
  );
  expect(readBrowserHistory()[0]).toMatchObject({ source: "file", inputLength: 20 });
  expect(localStorage.getItem(HISTORY_KEY)).not.toContain("private-file-content");
});
