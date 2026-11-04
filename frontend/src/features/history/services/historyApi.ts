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

export type DatabaseStatus = "ok" | "disabled" | "unavailable";
export type HistoryStatus = "enabled" | "disabled";

export interface HealthStatus {
  database: DatabaseStatus;
  history: HistoryStatus;
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

const SYSTEM_ERROR = "Không thể tải lịch sử. Vui lòng thử lại.";

async function readBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new HistoryApiError(SYSTEM_ERROR, response.status);
  }
}

function readError(body: unknown, status: number): never {
  if (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    body.success === false &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    throw new HistoryApiError(body.message, status);
  }
  throw new HistoryApiError(SYSTEM_ERROR, status);
}

export async function getHealthStatus(signal?: AbortSignal): Promise<HealthStatus> {
  const response = await fetch("/api/health", { signal });
  const body = await readBody(response);
  if (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    body.success === true &&
    "result" in body &&
    typeof body.result === "object" &&
    body.result !== null &&
    "database" in body.result &&
    ["ok", "disabled", "unavailable"].includes(String(body.result.database)) &&
    "history" in body.result &&
    ["enabled", "disabled"].includes(String(body.result.history)) &&
    ((response.status === 200 && body.result.database !== "unavailable") ||
      (response.status === 503 && body.result.database === "unavailable"))
  ) {
    return {
      database: body.result.database as DatabaseStatus,
      history: body.result.history as HistoryStatus,
    };
  }
  return readError(body, response.status);
}

export function canShowServerHistory(health: HealthStatus): boolean {
  return health.database === "ok" && health.history === "enabled";
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
