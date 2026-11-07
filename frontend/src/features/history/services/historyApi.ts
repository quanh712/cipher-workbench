import { browserHistoryPage, readBrowserHistory } from "./browserHistory";
import type { CipherAlgorithm } from "../../../shared/types/cipher";
import type { CipherMode } from "../../../shared/types/cipher";

export const dhHistoryOperations = {
  validate_params: "Kiểm tra tham số",
  generate_params: "Sinh tham số",
  generate_keypair: "Sinh cặp khóa",
  derive_shared_secret: "Tính bí mật chung",
  exchange: "Trao đổi khóa",
} as const;
export type DhHistoryOperation = keyof typeof dhHistoryOperations;
export type HistoryOperation = CipherMode | DhHistoryOperation;

export interface HistoryItem {
  id: number;
  createdAt: string;
  cipher: CipherAlgorithm;
  operation: HistoryOperation | null;
  source: "text" | "file";
  responseMode: "content" | "file" | null;
  inputLength: number | null;
  outputLength: number | null;
  httpStatus: number;
  succeeded: boolean;
  durationMs: number;
}

export interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
}

export interface HistoryQuery {
  cipher?: CipherAlgorithm;
  operation?: HistoryOperation;
  cursor?: string;
}

export class HistoryApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HistoryApiError";
  }
}

export async function getHistory(query: HistoryQuery, signal?: AbortSignal): Promise<HistoryPage> {
  signal?.throwIfAborted();
  const rows = readBrowserHistory().filter(
    (row) =>
      row.operation !== "sign" &&
      row.operation !== "verify" &&
      row.cipher !== "diffie-hellman" &&
      (!query.cipher || row.cipher === query.cipher) &&
      (!query.operation || row.operation === query.operation),
  );
  return browserHistoryPage(rows as HistoryItem[], query.cursor);
}
export async function getDhHistory(
  query: HistoryQuery,
  signal?: AbortSignal,
): Promise<HistoryPage> {
  signal?.throwIfAborted();
  return browserHistoryPage(
    readBrowserHistory().filter(
      (row) =>
        row.cipher === "diffie-hellman" && (!query.operation || row.operation === query.operation),
    ) as HistoryItem[],
    query.cursor,
  );
}
