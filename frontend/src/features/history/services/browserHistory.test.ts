import { beforeEach, expect, it } from "vitest";
import { HISTORY_KEY, appendBrowserHistory, readBrowserHistory } from "./browserHistory";
import type { HistoryItem } from "./historyApi";

function row(id: number): HistoryItem {
  return {
    id,
    createdAt: new Date().toISOString(),
    cipher: "caesar",
    operation: "encrypt",
    source: "text",
    responseMode: "content",
    inputLength: 1,
    outputLength: 1,
    httpStatus: 200,
    succeeded: true,
    durationMs: 1,
  };
}
beforeEach(() => localStorage.clear());
it("keeps the newest 100 rows in order", () => {
  for (let id = 1; id <= 105; id++) appendBrowserHistory(row(id));
  const rows = readBrowserHistory();
  expect(rows).toHaveLength(100);
  expect(rows[0].id).toBe(105);
  expect(rows.at(-1)!.id).toBe(6);
});
it("counts UTF-8 bytes and JSON separators at the exact capacity boundary", () => {
  const newest = row(3);
  const older = row(2);
  // Extra legacy fields are retained on read; include multibyte and escaped characters.
  const large = { ...newest, legacy: 'Tiếng Việt 😀\n"'.repeat(9000) };
  const prefix = JSON.stringify([large, older]);
  const remaining = 256_000 - new TextEncoder().encode(prefix).byteLength;
  expect(remaining).toBeGreaterThan(0);
  large.legacy += "x".repeat(remaining);
  const exact = [large, older];
  expect(new TextEncoder().encode(JSON.stringify(exact)).byteLength).toBe(256_000);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([...exact, row(1)]));
  expect(readBrowserHistory().map((item) => item.id)).toEqual([3, 2]);
  expect(new TextEncoder().encode(localStorage.getItem(HISTORY_KEY)!).byteLength).toBe(256_000);
  large.legacy += "x";
  localStorage.setItem(HISTORY_KEY, JSON.stringify(exact));
  expect(readBrowserHistory().map((item) => item.id)).toEqual([3]);
});
it("keeps an empty prefix if the newest row alone exceeds capacity", () => {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify([{ ...row(2), legacy: "x".repeat(256_000) }, row(1)]),
  );
  expect(readBrowserHistory()).toEqual([]);
  expect(localStorage.getItem(HISTORY_KEY)).toBe("[]");
});
