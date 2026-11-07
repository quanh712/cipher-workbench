import type { HistoryItem } from "./historyApi";
import type { SignatureHistoryDetail } from "./signatureHistoryApi";

export const HISTORY_TTL = 60 * 60 * 1000;
export const HISTORY_KEY = "cipher-workbench.history.v1";
const MAX_ITEMS = 100;
const MAX_BYTES = 256_000;
export type BrowserHistoryRow = HistoryItem | SignatureHistoryDetail;
let storageWarning = "";
export function getHistoryStorageWarning() {
  return storageWarning;
}
export function historyExpired(row: { createdAt: string }, now = Date.now()) {
  const time = Date.parse(row.createdAt);
  return !Number.isFinite(time) || time > now || now - time >= HISTORY_TTL;
}
// Serialize each row once. Keep the newest prefix, including UTF-8 and array separators.
function boundedHistory(rows: BrowserHistoryRow[]) {
  const bounded: BrowserHistoryRow[] = [];
  const encoded: string[] = [];
  const encoder = new TextEncoder();
  let bytes = 2; // []
  for (const row of rows.slice(0, MAX_ITEMS)) {
    const serialized = JSON.stringify(row);
    const added = encoder.encode(serialized).byteLength + (bounded.length ? 1 : 0);
    if (bytes + added > MAX_BYTES) break;
    bytes += added;
    bounded.push(row);
    encoded.push(serialized);
  }
  return { rows: bounded, serialized: `[${encoded.join(",")}]` };
}
function write(rows: BrowserHistoryRow[]) {
  try {
    localStorage.setItem(HISTORY_KEY, boundedHistory(rows).serialized);
    storageWarning = "";
    window.dispatchEvent(new Event("browser-history-change"));
    return true;
  } catch {
    storageWarning =
      "Trình duyệt không cho lưu lịch sử hoặc bộ nhớ đã đầy. Kết quả hiện tại vẫn dùng được.";
    window.dispatchEvent(new Event("browser-history-change"));
    return false;
  }
}
export function readBrowserHistory(): BrowserHistoryRow[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    const { rows } = boundedHistory(
      value
        .filter(
          (row): row is BrowserHistoryRow =>
            row &&
            typeof row === "object" &&
            Number.isSafeInteger(row.id) &&
            typeof row.createdAt === "string" &&
            !historyExpired(row) &&
            typeof row.cipher === "string" &&
            typeof row.succeeded === "boolean",
        )
        .slice(0, MAX_ITEMS),
    );
    if (rows.length !== value.length) write(rows);
    return rows;
  } catch {
    storageWarning = "Không đọc được lịch sử trên trình duyệt này.";
    return [];
  }
}
export function appendBrowserHistory(row: BrowserHistoryRow): boolean {
  return write([row, ...readBrowserHistory()]);
}
export function deleteBrowserHistory(id?: number) {
  return write(id === undefined ? [] : readBrowserHistory().filter((row) => row.id !== id));
}
export function browserHistoryPage<T extends BrowserHistoryRow>(rows: T[], cursor?: string) {
  const filtered = cursor ? rows.filter((row) => row.id < Number(cursor)) : rows;
  const items = filtered.slice(0, 20);
  return { items, nextCursor: filtered.length > 20 ? String(items.at(-1)!.id) : null };
}
