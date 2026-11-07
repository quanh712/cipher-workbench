import {
  readBrowserHistory,
  getHistoryStorageWarning,
} from "../../history/services/browserHistory";
import { browserHistoryFetch } from "../../../shared/services/browserHistoryFetch";
import { RsaGatewayError, type RsaGateway } from "./rsaGateway";
import type { ModPowRow } from "../types/cipher";

const INVALID_RESPONSE = "Phản hồi RSA từ máy chủ không hợp lệ.";
type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RsaGatewayError(INVALID_RESPONSE);
  }
  return value as JsonObject;
}

function requireValue(condition: boolean): asserts condition {
  if (!condition) throw new RsaGatewayError(INVALID_RESPONSE);
}

function decimal(value: unknown, signed = false): string {
  requireValue(typeof value === "string" && (signed ? /^-?\d+$/ : /^\d+$/).test(value));
  return value as string;
}

function integer(value: unknown): number {
  requireValue(typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
  return value as number;
}

function decimals(value: unknown): string[] {
  requireValue(Array.isArray(value) && value.length > 0);
  return (value as unknown[]).map((item) => decimal(item));
}

async function post(
  path: string,
  payload: JsonObject | FormData,
  signal: AbortSignal,
): Promise<JsonObject> {
  signal.throwIfAborted();
  const response = await browserHistoryFetch(`/api/rsa/${path}`, {
    method: "POST",
    headers: payload instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    credentials: "include",
    signal,
  });
  let body: JsonObject;
  try {
    body = object(await response.json());
  } catch (error) {
    if (signal.aborted) throw error;
    throw new RsaGatewayError(INVALID_RESPONSE);
  }
  if (!response.ok || body.success !== true) {
    if (body.success === false && typeof body.message === "string" && body.message.trim()) {
      throw new RsaGatewayError(body.message);
    }
    throw new RsaGatewayError(INVALID_RESPONSE);
  }
  signal.throwIfAborted();
  return body;
}

function traceRows(
  value: unknown,
  operation: "encrypt" | "decrypt" | "sign" | "verify",
): ModPowRow[] {
  const trace = object(value);
  requireValue(trace.operation === operation);
  if (operation === "encrypt" || operation === "decrypt") requireValue(trace.blockIndex === 0);
  decimal(trace.input);
  decimal(trace.exponent);
  decimal(trace.modulus);
  decimal(trace.result);
  requireValue(Array.isArray(trace.steps) && trace.steps.length > 0);
  return (trace.steps as unknown[]).map((item) => {
    const step = object(item);
    requireValue(step.bit === 0 || step.bit === 1);
    return {
      index: integer(step.i),
      bit: step.bit as 0 | 1,
      base: decimal(step.base),
      before: decimal(step.before),
      after: decimal(step.result),
    };
  });
}

export const rsaApi: RsaGateway = {
  async standardSignature(operation, payload, signal) {
    const body = await post(operation, payload, signal);
    const result = object(body.result);
    requireValue(
      result.mode === "standard" && (result.source === "text" || result.source === "file"),
    );
    requireValue(typeof result.sha256 === "string" && /^[a-f0-9]{64}$/.test(result.sha256));
    integer(result.contentBytes);
    const algorithm = object(result.algorithm);
    requireValue(
      algorithm.scheme === "RSASSA-PSS" &&
        algorithm.hash === "SHA-256" &&
        algorithm.mgf === "MGF1-SHA-256" &&
        algorithm.saltLength === 32 &&
        algorithm.signatureEncoding === "base64",
    );
    if (operation === "sign")
      requireValue(typeof result.signature === "string" && typeof result.publicKeyPem === "string");
    else requireValue(typeof result.valid === "boolean");
    return result as unknown as import("./rsaGateway").PemResult;
  },
  async encryptFile(parameters, signal) {
    const form = new FormData();
    form.set("file", parameters.file);
    form.set("e", parameters.e);
    form.set("n", parameters.n);
    form.set("mode", parameters.mode);
    form.set("traceBlockIndex", "0");
    const body = await post("encrypt", form, signal);
    requireValue(body.inputType === "text" && body.mode === parameters.mode);
    const blocks = decimals(body.blocks);
    const cipher = decimals(body.cipher);
    requireValue(blocks.length === cipher.length);
    const originalUtf8ByteLength = integer(body.originalUtf8ByteLength);
    const blockSize = integer(body.blockSize);
    const output =
      parameters.mode === "block"
        ? JSON.stringify({ mode: parameters.mode, cipher, originalUtf8ByteLength })
        : JSON.stringify(cipher);
    return {
      operation: "encrypt",
      inputType: "text",
      output,
      blocks,
      cipher,
      mode: parameters.mode,
      originalUtf8ByteLength,
      blockSize,
      rows: traceRows(body.trace, "encrypt"),
    };
  },
  async signature(parameters, signal) {
    const { operation, ...payload } = parameters;
    const body = await post(`${operation}/raw`, payload, signal);
    const result = object(body.result);
    requireValue(result.mode === "raw-integer" && typeof result.warning === "string");
    requireValue(BigInt(decimal(result.m)) === BigInt(parameters.m));
    const publicKey = object(result.publicKey);
    requireValue(BigInt(decimal(publicKey.n)) === BigInt(parameters.n));
    requireValue(BigInt(decimal(publicKey.e)) === BigInt(parameters.e));
    const signature = decimal(result.signature);
    const trace = object(result.trace);
    const recoveredMessage = operation === "verify" ? decimal(result.recoveredMessage) : undefined;
    requireValue(
      BigInt(decimal(trace.input)) ===
        BigInt(operation === "sign" ? parameters.m : parameters.signature),
    );
    requireValue(
      BigInt(decimal(trace.exponent)) ===
        BigInt(operation === "sign" ? parameters.d : parameters.e),
    );
    requireValue(BigInt(decimal(trace.modulus)) === BigInt(parameters.n));
    requireValue(decimal(trace.result) === (recoveredMessage ?? signature));
    if (operation === "verify") {
      requireValue(typeof result.valid === "boolean");
      requireValue(BigInt(signature) === BigInt(parameters.signature));
    }
    const local = readBrowserHistory().find(
      (row) => row.cipher === "rsa" && row.operation === operation,
    );
    const history = {
      saved: !!local && !getHistoryStorageWarning(),
      id: local?.id ?? null,
      reason: getHistoryStorageWarning() ? "unavailable" : "saved",
    };
    const kind = operation === "sign" ? "signed" : result.valid ? "valid" : "invalid";
    return {
      kind,
      signature,
      recoveredMessage,
      warning: result.warning as string,
      history: {
        saved: history.saved as boolean,
        id: history.id as number | null,
        reason: history.reason as string,
      },
      message:
        kind === "signed"
          ? "Ký thành công."
          : kind === "valid"
            ? "Chữ ký hợp lệ: thông điệp khôi phục khớp thông điệp gốc."
            : "Chữ ký không hợp lệ: thông điệp khôi phục khác thông điệp gốc.",
      steps: [],
      rows: traceRows(trace, operation),
    };
  },
  async transform(parameters, signal) {
    const { operation, inputType, n } = parameters;
    const payload: JsonObject = { n, inputType, traceBlockIndex: 0 };
    const mode = parameters.mode ?? "char";
    if (inputType === "text") payload.mode = mode;
    if (operation === "decrypt" && mode === "block")
      payload.originalUtf8ByteLength = parameters.originalUtf8ByteLength;
    if (operation === "encrypt") {
      payload.e = parameters.e;
      payload.data = parameters.data;
    } else {
      payload.d = parameters.d;
      payload.cipher = parameters.cipher;
    }
    const body = await post(operation, payload, signal);
    requireValue(body.inputType === inputType);
    requireValue(
      inputType === "text"
        ? body.mode === mode &&
            (mode === "char" ? body.blockSize === 1 : integer(body.blockSize) >= 1)
        : body.blockSize === null,
    );
    if (inputType === "text") integer(body.originalUtf8ByteLength);
    const blocks = decimals(body.blocks);
    if (inputType === "number") requireValue(blocks.length === 1);
    let cipher: string[];
    let output: string;
    if (operation === "encrypt") {
      cipher = decimals(body.cipher);
      requireValue(cipher.length === blocks.length);
      const expectedLength =
        inputType === "number"
          ? 1
          : mode === "char"
            ? Array.from(parameters.data).length
            : Math.ceil(new TextEncoder().encode(parameters.data).length / integer(body.blockSize));
      requireValue(blocks.length === expectedLength);
      output =
        inputType === "text" && mode === "block"
          ? JSON.stringify({ mode, cipher, originalUtf8ByteLength: body.originalUtf8ByteLength })
          : JSON.stringify(cipher);
    } else {
      cipher = parameters.cipher;
      requireValue(blocks.length === cipher.length && typeof body.plaintext === "string");
      output = body.plaintext as string;
      if (inputType === "number") requireValue(decimal(output) === blocks[0]);
      else if (mode === "char") requireValue(Array.from(output).length === blocks.length);
    }
    return {
      operation,
      inputType,
      output,
      blocks,
      cipher,
      mode,
      blockSize: inputType === "text" ? integer(body.blockSize) : undefined,
      originalUtf8ByteLength:
        inputType === "text" ? integer(body.originalUtf8ByteLength) : undefined,
      rows: traceRows(body.trace, operation),
    };
  },
  async generateKey(parameters, signal) {
    const body = await post("keys", { p: parameters.p, q: parameters.q, e: parameters.e }, signal);
    const n = decimal(body.n);
    const e = decimal(body.e);
    const d = decimal(body.d);
    const publicKey = object(body.publicKey);
    const privateKey = object(body.privateKey);
    requireValue(
      publicKey.n === n && publicKey.e === e && privateKey.n === n && privateKey.d === d,
    );
    requireValue(Array.isArray(body.egcdSteps) && body.egcdSteps.length > 0);
    const euclidRows = (body.egcdSteps as unknown[]).map((item) => {
      const step = object(item);
      integer(step.index);
      return {
        quotient: step.q === null ? null : decimal(step.q, true),
        remainder: decimal(step.r, true),
        coefficient: decimal(step.t, true),
      };
    });
    return { p: parameters.p, q: parameters.q, e, n, d, phi: decimal(body.phi), euclidRows };
  },
};
