import { useEffect, useRef, useState } from "react";
import type { PemResult, RsaGateway } from "../services/rsaGateway";
import { saveBlob } from "../../../shared/utils/download";

export function RsaPemPanel({ gateway }: { gateway: RsaGateway | null }) {
  const [operation, setOperation] = useState<"sign" | "verify">("sign");
  const [source, setSource] = useState("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [signature, setSignature] = useState("");
  const [result, setResult] = useState<PemResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
    },
    [],
  );
  function invalidate() {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
    setResult(null);
    setError("");
  }
  async function submit() {
    if (!gateway?.standardSignature || pending.current) return;
    invalidate();
    const controller = new AbortController();
    pending.current = controller;
    try {
      if (
        source === "file" &&
        (!file || !/\.txt$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024)
      )
        throw new Error("Chọn file .txt UTF-8, không rỗng, tối đa 5 MiB.");
      if (source === "text" && (!text || new TextEncoder().encode(text).length > 5 * 1024 * 1024))
        throw new Error("Nhập văn bản không rỗng, tối đa 5 MiB UTF-8.");
      const fields =
        operation === "sign"
          ? { privateKeyPem: privateKey, ...(passphrase ? { passphrase } : {}) }
          : { publicKeyPem: publicKey, signature };
      let payload: Record<string, string> | FormData;
      if (source === "file") {
        const form = new FormData();
        form.set("file", file!);
        Object.entries(fields).forEach(([key, value]) => {
          if (value !== undefined) form.set(key, value);
        });
        payload = form;
      } else payload = { ...fields, source: "text", text } as Record<string, string>;
      setBusy(true);
      const response = await gateway.standardSignature(operation, payload, controller.signal);
      if (controller.signal.aborted) return;
      setResult(response);
      setPrivateKey("");
      setPassphrase("");
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(failure instanceof Error ? failure.message : "Không thể xử lý chữ ký PEM.");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  const field = (
    label: string,
    value: string,
    update: (value: string) => void,
    rows = 4,
    readOnly = false,
  ) => (
    <label className="rsa__field rsa__field--text">
      <span>{label}</span>
      <textarea
        readOnly={readOnly}
        rows={rows}
        value={value}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => {
          invalidate();
          update(event.target.value);
        }}
      />
    </label>
  );
  return (
    <section className="panel rsa__section" aria-label="Chữ ký PEM">
      <div className="panel__header">
        <h2>Chữ ký PEM · RSA-PSS / SHA-256</h2>
      </div>
      <form
        className="rsa__section-body"
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <p className="rsa__help">
          Dùng khóa RSA định dạng PEM. Khóa số ở tab học thuật không dùng cho luồng này. Khóa riêng
          và mật khẩu được xóa sau khi xử lý thành công hoặc rời tab.
        </p>
        <p className="rsa__help">
          Nội dung file, khóa PEM và mật khẩu không được lưu vào lịch sử trình duyệt. Nếu bật lịch
          sử máy chủ, backend có thể lưu nội dung ký.
        </p>
        <label className="rsa__field">
          <span>Thao tác PEM</span>
          <select
            value={operation}
            onChange={(event) => {
              invalidate();
              setOperation(event.target.value as "sign" | "verify");
              setPrivateKey("");
              setPassphrase("");
            }}
          >
            <option value="sign">Ký PEM</option>
            <option value="verify">Kiểm tra PEM</option>
          </select>
        </label>
        <label className="rsa__field">
          <span>Nguồn nội dung</span>
          <select
            value={source}
            onChange={(event) => {
              invalidate();
              setSource(event.target.value);
              setFile(null);
            }}
          >
            <option value="text">Văn bản</option>
            <option value="file">File .txt</option>
          </select>
        </label>
        {source === "text" ? (
          field("Nội dung ký / kiểm tra", text, setText)
        ) : (
          <label className="rsa__field">
            <span>File ký / kiểm tra (.txt, tối đa 5 MiB)</span>
            <input
              type="file"
              accept=".txt,text/plain"
              onChange={(event) => {
                invalidate();
                setFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>
        )}
        {operation === "sign" ? (
          <>
            {field("Private key PEM", privateKey, setPrivateKey, 6)}
            <label className="rsa__field">
              <span>Mật khẩu khóa (nếu có)</span>
              <input
                type="password"
                autoComplete="off"
                value={passphrase}
                onChange={(event) => {
                  invalidate();
                  setPassphrase(event.target.value);
                }}
              />
            </label>
          </>
        ) : (
          <>
            {field("Public key PEM", publicKey, setPublicKey, 6)}
            {field("Chữ ký base64", signature, setSignature)}
          </>
        )}
        <button className="button button--primary" disabled={busy || !gateway?.standardSignature}>
          {busy ? "Đang xử lý…" : operation === "sign" ? "Ký PEM" : "Kiểm tra PEM"}
        </button>
        {error && (
          <p className="rsa__message rsa__message--error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="rsa__signature-result" role="status">
            <p className="rsa__message">
              {result.valid === undefined
                ? "Ký PEM thành công."
                : result.valid
                  ? "Chữ ký hợp lệ."
                  : "Chữ ký không hợp lệ: nội dung, khóa hoặc chữ ký không khớp."}
            </p>
            <p className="rsa__help">
              {result.contentBytes} byte · SHA-256:{" "}
              <span className="rsa__digest">{result.sha256}</span>
            </p>
            {result.signature && (
              <>
                {field("Chữ ký đã tạo", result.signature, () => {}, 4, true)}
                {field("Public key đã trích xuất", result.publicKeyPem!, () => {}, 4, true)}
                <div className="button-group">
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() =>
                      saveBlob(
                        new Blob([result.signature!], { type: "text/plain" }),
                        "rsa-signature.txt",
                      )
                    }
                  >
                    Tải chữ ký
                  </button>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() =>
                      saveBlob(
                        new Blob([result.publicKeyPem!], { type: "text/plain" }),
                        "rsa-public.pem",
                      )
                    }
                  >
                    Tải public key
                  </button>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => {
                      setPublicKey(result.publicKeyPem!);
                      setSignature(result.signature!);
                      invalidate();
                      setOperation("verify");
                    }}
                  >
                    Dùng để kiểm tra
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
