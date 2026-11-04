import { browserHistoryPage, readBrowserHistory, deleteBrowserHistory } from "./browserHistory";
import { HistoryApiError, type HistoryItem } from "./historyApi";

export interface VerificationDraft {
  m: string;
  signature: string;
  e: string;
  n: string;
}
export interface SignatureHistoryItem extends Omit<HistoryItem, "operation"> {
  operation: "sign" | "verify";
  valid: boolean | null;
  processingState: string;
}
export interface SignatureHistoryDetail extends SignatureHistoryItem {
  payload: Record<string, unknown>;
}

export async function getSignatureHistory(
  operation: "sign" | "verify",
  cursor?: string,
  signal?: AbortSignal,
): Promise<{ items: SignatureHistoryItem[]; nextCursor: string | null }> {
  signal?.throwIfAborted();
  return browserHistoryPage(
    readBrowserHistory().filter(
      (row) => row.cipher === "rsa" && row.operation === operation,
    ) as SignatureHistoryDetail[],
    cursor,
  );
}
export async function getSignatureDetail(
  id: number,
  signal?: AbortSignal,
): Promise<SignatureHistoryDetail> {
  signal?.throwIfAborted();
  const row = readBrowserHistory().find((row) => row.id === id && "payload" in row);
  if (!row) throw new HistoryApiError("Bản ghi đã hết hạn hoặc bị xóa trên trình duyệt này.", 404);
  return row as SignatureHistoryDetail;
}
export async function deleteSignature(id: number, signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  if (!deleteBrowserHistory(id))
    throw new HistoryApiError("Không thể xóa lịch sử trong trình duyệt.", 0);
}
export function verificationDraft(detail: SignatureHistoryDetail): VerificationDraft | null {
  const { numeric_input: input, public_key: key, signature, result } = detail.payload;
  if (
    !input ||
    typeof input !== "object" ||
    !key ||
    typeof key !== "object" ||
    !result ||
    typeof result !== "object" ||
    !("mode" in result) ||
    result.mode !== "raw-integer" ||
    !("m" in input) ||
    !("e" in key) ||
    !("n" in key)
  )
    return null;
  const values = [input.m, signature, key.e, key.n];
  if (!values.every((value) => typeof value === "string" && /^\d{1,128}$/.test(value))) return null;
  return { m: String(input.m), signature: String(signature), e: String(key.e), n: String(key.n) };
}
