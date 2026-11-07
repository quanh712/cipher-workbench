import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  API_TIMEOUT_MS,
  browserHistoryFetch,
  cancelPendingApiRequests,
  pendingApiRequests,
} from "./browserHistoryFetch";
import { HISTORY_KEY, readBrowserHistory } from "../../features/history/services/browserHistory";

beforeEach(() => localStorage.removeItem(HISTORY_KEY));
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const init = { method: "POST", body: JSON.stringify({ text: "ABC", key: 3 }) };
it("records output length without retaining input, output, or key", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ success: true, result: "DEF" }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await browserHistoryFetch("/api/caesar/encrypt", init);
  const row = readBrowserHistory()[0];
  expect(row).toMatchObject({ succeeded: true, inputLength: 3, outputLength: 3 });
  expect(JSON.stringify(row)).not.toMatch(/ABC|DEF|"key"/);
});
it("records network failures using metadata", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
  await expect(browserHistoryFetch("/api/caesar/encrypt", init)).rejects.toThrow();
  expect(readBrowserHistory()[0]).toMatchObject({ succeeded: false, httpStatus: 0 });
});
it.each(["deadline", "cancel"])(
  "releases a stalled request on %s and ignores its late response",
  async (action) => {
    vi.useFakeTimers();
    let finish!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    const request = browserHistoryFetch("/api/caesar/encrypt", init);
    const rejection = expect(request).rejects.toThrow(action === "cancel" ? /dừng chờ/ : /quá lâu/);
    if (action === "cancel") cancelPendingApiRequests();
    else await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS);
    await rejection;
    expect(pendingApiRequests()).toBe(0);
    expect(readBrowserHistory()).toHaveLength(1);
    expect(readBrowserHistory()[0].succeeded).toBe(false);
    finish(new Response(JSON.stringify({ success: true, result: "STALE" })));
    await Promise.resolve();
    expect(readBrowserHistory()).toHaveLength(1);
  },
);
it("keeps the deadline active until a download body finishes", async () => {
  vi.useFakeTimers();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(new ReadableStream({ start() {} }), { headers: { "Content-Type": "text/plain" } }),
  );
  const form = new FormData();
  form.set("file", new File(["ABC"], "input.txt"));
  form.set("action", "encrypt");
  form.set("response_mode", "file");
  const rejection = expect(
    browserHistoryFetch("/api/caesar/file", { method: "POST", body: form }),
  ).rejects.toThrow(/quá lâu/);
  await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS);
  await rejection;
  expect(pendingApiRequests()).toBe(0);
});

it("records PEM UTF-8 bytes without retaining message, signature or keys", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        result: {
          mode: "standard",
          signature: "private-result",
          publicKeyPem: "public-pem",
          contentBytes: 14,
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );
  await browserHistoryFetch("/api/rsa/sign", {
    method: "POST",
    body: JSON.stringify({
      source: "text",
      text: "Tiếng Việt",
      privateKeyPem: "private-pem",
      passphrase: "secret-password",
    }),
  });
  const row = readBrowserHistory()[0];
  expect(row).toMatchObject({
    inputLength: 14,
    payload: { result: { mode: "standard", inputLengthUnit: "bytes" } },
  });
  expect(JSON.stringify(row)).not.toMatch(
    /Tiếng Việt|private-result|public-pem|private-pem|secret-password/,
  );
});
