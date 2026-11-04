import { appendBrowserHistory } from "../../features/history/services/browserHistory";
import type { BrowserHistoryRow } from "../../features/history/services/browserHistory";
import type { CipherAlgorithm } from "../types/cipher";

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const decimal = (value: unknown) =>
  typeof value === "string" && /^\d{1,128}$/.test(value) ? value : undefined;
let sequence = 0;
export interface HistoryContext {
  source: "file";
  inputLength: number;
}
/** Record only an allowlist: no request objects, keys, traces or uploaded content are persisted. */
async function recordedFetch(
  url: string,
  init: RequestInit = {},
  context?: HistoryContext,
): Promise<Response> {
  const started = Date.now();
  let response = await fetch(url, init);
  init.signal?.throwIfAborted();
  const [, algorithm, endpoint] = /^\/api\/([^/]+)\/([^/?]+)/.exec(url) ?? [];
  const recognized = [
    "caesar",
    "affine",
    "vigenere",
    "playfair",
    "columnar",
    "hill",
    "des",
    "rsa",
    "dh",
  ];
  if (!recognized.includes(algorithm)) return response;
  let request: Record<string, unknown> = {};
  const form = init.body instanceof FormData ? init.body : null;
  if (typeof init.body === "string") {
    try {
      request = object(JSON.parse(init.body));
    } catch {
      /* metadata remains empty */
    }
  }
  const dhOperations: Record<string, string> = {
    params: "validate_params",
    "params/random": "generate_params",
    keypair: "generate_keypair",
    "shared-secret": "derive_shared_secret",
    exchange: "exchange",
  };
  const dhPath = url.replace(/^\/api\/dh\//, "").split("?")[0];
  const operation =
    algorithm === "dh"
      ? dhPath === "caesar"
        ? (form?.get("action") ?? request.action)
        : dhOperations[dhPath]
      : endpoint === "file"
        ? form?.get("action")
        : endpoint;
  if (
    ![
      "encrypt",
      "decrypt",
      "sign",
      "verify",
      "validate_params",
      "generate_params",
      "generate_keypair",
      "derive_shared_secret",
      "exchange",
    ].includes(String(operation))
  )
    return response;
  let body: Record<string, unknown> = {};
  if (
    algorithm === "rsa" &&
    (operation === "sign" || operation === "verify") &&
    response.headers.get("content-type")?.includes("application/json")
  ) {
    try {
      const text = await response.text();
      response = new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      body = object(JSON.parse(text));
    } catch {
      /* malformed response is recorded as failed */
    }
  }
  const result = object(body.result);
  const file = form?.get("file");
  const row = {
    id: Date.now() * 1000 + (sequence++ % 1000),
    createdAt: new Date().toISOString(),
    cipher: (algorithm === "dh" ? "diffie-hellman" : algorithm) as CipherAlgorithm,
    operation,
    source: context?.source ?? (form ? "file" : "text"),
    responseMode: form?.get("response_mode") ?? null,
    inputLength:
      context?.inputLength ??
      (file instanceof File
        ? file.size
        : typeof request.text === "string"
          ? request.text.length
          : null),
    outputLength: typeof body.result === "string" ? body.result.length : null,
    httpStatus: response.status,
    succeeded: response.ok && body.success !== false,
    durationMs: Math.max(0, Date.now() - started),
  } as BrowserHistoryRow;
  if (algorithm === "rsa" && (operation === "sign" || operation === "verify")) {
    const key = object(result.publicKey);
    const payload: Record<string, unknown> = {
      result: { mode: result.mode === "raw-integer" ? "raw-integer" : "standard" },
    };
    if (!form && result.mode === "raw-integer") {
      payload.numeric_input = { m: decimal(request.m) };
      payload.public_key = { e: decimal(key.e), n: decimal(key.n) };
      payload.signature = decimal(result.signature);
      payload.result = { mode: "raw-integer", recoveredMessage: decimal(result.recoveredMessage) };
    }
    Object.assign(row, {
      valid: typeof result.valid === "boolean" ? result.valid : null,
      processingState: row.succeeded ? "completed" : "failed",
      payload,
    });
  }
  appendBrowserHistory(row);
  return response;
}

let pending = 0;
export function pendingApiRequests() {
  return pending;
}
export async function browserHistoryFetch(
  url: string,
  init: RequestInit = {},
  context?: HistoryContext,
): Promise<Response> {
  pending++;
  window.dispatchEvent(new Event("api-pending-change"));
  try {
    return await recordedFetch(url, init, context);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new Error("Không kết nối được máy chủ. Vui lòng thử lại sau ít phút.", { cause: error });
  } finally {
    pending--;
    window.dispatchEvent(new Event("api-pending-change"));
  }
}
