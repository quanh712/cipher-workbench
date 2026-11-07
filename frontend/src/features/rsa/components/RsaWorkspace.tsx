import type { VerificationDraft } from "../../history/services/signatureHistoryApi";
import { useRef, useState } from "react";
import { Notification } from "../../../shared/components/Notification";
import type { NoticeState } from "../../../shared/types/cipher";
import { CipherModeSelector } from "../../../shared/components/CipherModeSelector";
import { saveBlob } from "../../../shared/utils/download";
import { useRsaSignature } from "../hooks/useRsaSignature";
import { RsaFilePicker } from "./RsaFilePicker";
import { RsaPemPanel, type RsaPemPanelHandle } from "./RsaPemPanel";
import { RsaSignaturePanel } from "./RsaSignaturePanel";
import { parseRsaCipher, type RsaCipherController } from "../hooks/useRsaCipher";
import { decimal } from "../utils/validation";
import type { EuclidRow, ModPowRow, RsaInputType, RsaTask } from "../types/cipher";
import "./rsa.css";

function TaskMessage({ cipher, task }: { cipher: RsaCipherController; task: RsaTask }) {
  if (cipher.taskErrors[task])
    return (
      <p className="rsa__message rsa__message--error" role="alert">
        {cipher.taskErrors[task]}
      </p>
    );
  if (cipher.statuses[task] === "loading")
    return (
      <p className="rsa__message" role="status">
        Đang xử lý…
      </p>
    );
  return null;
}

function EuclidTable({ rows }: { rows: EuclidRow[] }) {
  return (
    <div className="rsa__table-wrap">
      <table className="rsa__table">
        <caption>Các bước Euclid mở rộng</caption>
        <thead>
          <tr>
            <th scope="col">Thương q</th>
            <th scope="col">Số dư r</th>
            <th scope="col">Hệ số t</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={row.remainder === "1" ? "rsa__table-row--hit" : ""}>
              <td>{row.quotient ?? "—"}</td>
              <td>{row.remainder}</td>
              <td>{row.coefficient}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModPowTable({ rows, title }: { rows: ModPowRow[]; title: string }) {
  return (
    <div className="rsa__table-wrap">
      <table className="rsa__table">
        <caption>
          {title} · Số mũ dạng nhị phân:{" "}
          {rows
            .map((row) => row.bit)
            .reverse()
            .join("")}{" "}
          · {rows.length} vòng
        </caption>
        <thead>
          <tr>
            <th scope="col">Bit thứ</th>
            <th scope="col">Bit</th>
            <th scope="col">Cơ số</th>
            <th scope="col">Trước bước</th>
            <th scope="col">Sau bước</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.index} className={row.bit === 1 ? "rsa__table-row--hit" : ""}>
              <td>{row.index}</td>
              <td>{row.bit}</td>
              <td>{row.base}</td>
              <td>{row.before}</td>
              <td>{row.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransformPanel({ cipher, task }: { cipher: RsaCipherController; task: RsaInputType }) {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const mode = cipher.modes[task];
  const encrypt = mode === "encrypt";
  const input = cipher.inputs[task][mode];
  const result = cipher.results[task];
  const busy = cipher.statuses[task] === "loading";
  const characters = Array.from(encrypt ? input : (result?.output ?? ""));
  const inputLabel = encrypt
    ? task === "number"
      ? "Bản rõ P (số)"
      : "Thông điệp"
    : "Bản mã (JSON)";
  const ready = cipher.hasGateway && (cipher.keySource === "manual" || Boolean(cipher.key));
  let inputError: string | null = null;
  if (input) {
    if (encrypt && task === "number") {
      const value = decimal(input);
      if (value === null || value.length > 128) {
        inputError = "P phải là số nguyên không âm, tối đa 128 chữ số.";
      }
    } else if (!encrypt) {
      try {
        parseRsaCipher(
          task === "text" && cipher.textMode === "block" && !Array.isArray(JSON.parse(input))
            ? JSON.stringify(JSON.parse(input).cipher)
            : input,
          task,
        );
      } catch (error) {
        inputError = (error as Error).message;
      }
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ kind: "success", message: "Đã sao chép." });
    } catch {
      setNotice({
        kind: "error",
        message: "Không thể sao chép. Hãy chọn nội dung và sao chép thủ công.",
      });
    }
  }
  async function paste() {
    try {
      const value = await navigator.clipboard.readText();
      cipher.setInput(task, value);
      setNotice({ kind: "success", message: "Đã dán." });
    } catch {
      setNotice({
        kind: "error",
        message: "Không thể đọc clipboard. Hãy dán trực tiếp vào ô nhập.",
      });
    }
  }
  return (
    <section className="rsa__section panel" aria-labelledby={`rsa-${task}-title`}>
      <div className="panel__header">
        <h2 id={`rsa-${task}-title`}>
          {task === "number"
            ? "Mã hóa và giải mã một khối số"
            : "Văn bản và file: ký tự / block UTF-8"}
        </h2>
      </div>
      <form
        className="rsa__section-body"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !busy) cipher.process(task);
        }}
      >
        <CipherModeSelector
          value={mode}
          disabled={false}
          onChange={(value) => {
            setNotice(null);
            cipher.setMode(task, value);
          }}
        />
        <p className="rsa__help rsa__mode-help">
          <span>{encrypt ? "Dùng khóa công khai {e, n}." : "Dùng khóa riêng {d, n}."}</span>
          <span>
            {task === "number"
              ? "Mỗi số phải thỏa 0 ≤ P < n."
              : "Văn bản và file .txt: chọn từng ký tự hoặc block UTF-8."}
          </span>
        </p>
        {task === "text" && (
          <>
            <label className="rsa__field">
              <span>Cách chia khối</span>
              <select
                value={cipher.textMode}
                onChange={(event) => cipher.setTextMode(event.target.value as "char" | "block")}
              >
                <option value="char">Từng ký tự (char)</option>
                <option value="block">Block UTF-8</option>
              </select>
            </label>
            <p className="rsa__help">
              {cipher.textMode === "block"
                ? "Gộp byte UTF-8 thành khối nhỏ hơn n (n ≥ 256). JSON kết quả kèm độ dài gốc để giải mã chính xác."
                : "Mỗi ký tự Unicode là một khối."}
            </p>
            {encrypt && (
              <label className="rsa__field">
                <span>Đầu vào văn bản</span>
                <select
                  value={cipher.textSource}
                  onChange={(event) => cipher.setTextSource(event.target.value as "text" | "file")}
                >
                  <option value="text">Nhập văn bản</option>
                  <option value="file">Tải file .txt</option>
                </select>
              </label>
            )}
            {encrypt && cipher.textSource === "file" && (
              <RsaFilePicker
                label="File mã hóa (.txt UTF-8, tối đa 1 MB / 10.000 ký tự)"
                hint="Tối đa 1 MB và 10.000 ký tự. Chọn văn bản UTF-8 để mã hóa."
                accept=".txt,text/plain"
                file={cipher.file}
                onChange={cipher.setFile}
              />
            )}
            {!encrypt && cipher.textMode === "block" && (
              <label className="rsa__field">
                <span>Độ dài UTF-8 gốc (byte, khi dán mảng)</span>
                <input
                  inputMode="numeric"
                  value={cipher.originalLength}
                  onChange={(event) => cipher.setOriginalLength(event.target.value)}
                />
              </label>
            )}
          </>
        )}
        <div className="panel rsa__transform-panel">
          <label className="rsa__field rsa__field--text">
            <span>{inputLabel}</span>
            <textarea
              disabled={task === "text" && encrypt && cipher.textSource === "file"}
              value={input}
              aria-invalid={Boolean(inputError)}
              rows={task === "number" ? 2 : 4}
              spellCheck={false}
              placeholder={encrypt ? undefined : '["11","76"]'}
              onChange={(event) => {
                setNotice(null);
                cipher.setInput(task, event.target.value);
              }}
            />
          </label>
          <div className="button-group" role="group" aria-label="Thao tác đầu vào">
            <button
              className="button button--secondary"
              type="button"
              disabled={busy}
              onClick={() => void paste()}
            >
              Dán
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={!input}
              onClick={() => void copy(input)}
            >
              Sao chép
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => {
                setNotice(null);
                cipher.setInput(task, "");
              }}
            >
              Xóa
            </button>
          </div>
          <div
            className={`status ${inputError ? "status--error" : input ? "status--success" : ""}`}
            role="status"
            aria-live="polite"
          >
            {inputError
              ? `! ${inputError}`
              : input
                ? "✓ Đầu vào hợp lệ ở mức sơ bộ."
                : "Chưa có dữ liệu"}
          </div>
        </div>
        <button className="button button--primary" type="submit" disabled={!ready || busy}>
          {busy ? "Đang xử lý…" : encrypt ? "Mã hóa" : "Giải mã"}
        </button>
        {!ready && <p className="rsa__help">Hãy sinh khóa hoặc chọn nhập khóa trước khi xử lý.</p>}
        <TaskMessage cipher={cipher} task={task} />
        <div className="panel rsa__transform-panel">
          <label className="rsa__field rsa__field--text">
            <span>Kết quả {encrypt ? "bản mã (JSON)" : "bản rõ"}</span>
            <textarea
              readOnly
              rows={3}
              value={result?.output ?? ""}
              placeholder="Kết quả sẽ hiển thị tại đây"
            />
          </label>
          <div className="button-group" role="group" aria-label="Thao tác kết quả">
            <button
              className="button button--secondary"
              type="button"
              disabled={!result}
              onClick={() => void copy(result!.output)}
            >
              Sao chép
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={!result}
              onClick={() =>
                saveBlob(
                  new Blob([result!.output], {
                    type: encrypt ? "application/json;charset=utf-8" : "text/plain;charset=utf-8",
                  }),
                  `rsa-${task}-${mode}.${encrypt ? "json" : "txt"}`,
                )
              }
            >
              Tải kết quả
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => {
                setNotice(null);
                cipher.clearTask(task);
              }}
            >
              Xóa
            </button>
          </div>
          <div
            className={`status ${cipher.statuses[task] === "error" ? "status--error" : result ? "status--success" : ""}`}
            role="status"
            aria-live="polite"
          >
            {busy
              ? "Đang gửi yêu cầu…"
              : cipher.statuses[task] === "error"
                ? "! Xử lý thất bại"
                : result
                  ? `✓ Xử lý thành công · ${result.blocks.length} khối`
                  : "Chưa xử lý"}
          </div>
        </div>
        {result && task === "text" && (
          <p className="rsa__help">
            Kích thước khối: {result.blockSize ?? 1} {result.mode === "block" ? "byte" : "ký tự"} ·
            Độ dài UTF-8 gốc: {result.originalUtf8ByteLength ?? "—"} byte
          </p>
        )}
        {result && encrypt && (
          <button
            className="button button--secondary"
            type="button"
            onClick={() => {
              const output = result.output;
              cipher.setMode(task, "decrypt");
              cipher.setInputForMode(task, "decrypt", output);
            }}
          >
            Dùng bản mã để giải mã
          </button>
        )}
        {notice && <Notification notice={notice} onClose={() => setNotice(null)} />}
        {result && (
          <>
            <details className="rsa__details rsa__trace">
              <summary>
                {encrypt ? "Bảng tính C = Pᵉ mod n" : "Bảng tính P = Cᵈ mod n"}
                {task === "text" ? " · khối đầu tiên" : ""}
              </summary>
              <ModPowTable
                rows={result.rows}
                title={encrypt ? "Các bước mã hóa" : "Các bước giải mã"}
              />
            </details>
            {task === "text" && (
              <details className="rsa__details rsa__trace">
                <summary>Xem từng khối {result.mode === "block" ? "UTF-8" : "ký tự"}</summary>
                <div className="rsa__table-wrap">
                  <table className="rsa__table">
                    <caption>
                      Kết quả từng khối {result.mode === "block" ? "UTF-8" : "ký tự"}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Khối</th>
                        <th scope="col">Ký tự</th>
                        <th scope="col">P (mã)</th>
                        <th scope="col">C</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.blocks.map((block, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>
                            {result.mode === "block"
                              ? "—"
                              : characters[index] === " "
                                ? "␣"
                                : characters[index]}
                          </td>
                          <td>{block}</td>
                          <td>{result.cipher[index]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </>
        )}
      </form>
    </section>
  );
}

export function RsaWorkspace({
  cipher,
  verification,
}: {
  cipher: RsaCipherController;
  verification?: VerificationDraft;
}) {
  const { draft, key, fieldErrors } = cipher;
  const [tab, setTab] = useState<"encrypt" | "signature" | "pem">(
    verification ? "signature" : "encrypt",
  );
  const signature = useRsaSignature(cipher, tab === "signature", verification);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pemPanel = useRef<RsaPemPanelHandle | null>(null);
  const signatureTab = tab === "signature";
  const tabs = ["encrypt", "signature", "pem"] as const;
  return (
    <div className="cipher-workspace rsa" aria-busy={cipher.isBusy || signature.loading}>
      <header className="rsa__intro">
        <div>
          <h2>RSA từng bước</h2>
          <p>
            {signatureTab
              ? "Dùng khóa riêng để ký một số và khóa công khai để kiểm tra chữ ký."
              : tab === "pem"
                ? "Ký hoặc kiểm tra văn bản và file bằng khóa PEM."
                : "Sinh khóa hoặc nhập khóa có sẵn, rồi chọn mã hóa hay giải mã cho số và văn bản."}
          </p>
        </div>
      </header>
      <div className="rsa__toolbar">
        <div className="rsa__tabs" role="tablist" aria-label="Chức năng RSA">
          {tabs.map((value, index) => (
            <button
              key={value}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`rsa-tab-${value}`}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls={`rsa-panel-${value}`}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => setTab(value)}
              onKeyDown={(event) => {
                let next: number | null = null;
                if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key))
                  next =
                    (index +
                      (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) +
                      tabs.length) %
                    tabs.length;
                if (event.key === "Home") next = 0;
                if (event.key === "End") next = tabs.length - 1;
                if (next === null) return;
                event.preventDefault();
                setTab(tabs[next]);
                tabRefs.current[next]?.focus();
              }}
            >
              {value === "encrypt"
                ? "Mã hóa / Giải mã"
                : value === "signature"
                  ? "Chữ ký số nguyên"
                  : "Chữ ký PEM"}
            </button>
          ))}
        </div>
        <div className="button-group rsa__toolbar-actions" role="group" aria-label="Thao tác RSA">
          <button
            className="button button--secondary"
            type="button"
            onClick={() => {
              if (tab === "pem") {
                void pemPanel.current?.loadExample();
                return;
              }
              if (signatureTab)
                signature.loadScenario(signature.mode === "sign" ? "sign-success" : "verify-valid");
              else {
                signature.reset();
                cipher.loadExample();
              }
            }}
          >
            Tạo ví dụ
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => {
              signature.reset();
              cipher.resetAll();
            }}
          >
            Đặt lại
          </button>
        </div>
      </div>
      <div hidden={tab === "pem"}>
        <details className="rsa__details">
          <summary>
            {signatureTab ? "Luồng chữ ký RSA · Alice và Bob" : "Luồng mã hóa RSA · Alice và Bob"}
          </summary>
          {signatureTab ? (
            <ol className="rsa__flow" aria-label="Luồng chữ ký RSA">
              <li>
                <strong>Alice giữ khóa riêng</strong>
                <span>Công bố khóa công khai {"{e, n}"}</span>
              </li>
              <li>
                <strong>Alice ký thông điệp</strong>
                <span>s = mᵈ mod n</span>
              </li>
              <li>
                <strong>Gửi m và chữ ký s</strong>
                <span>Giữ nguyên thông điệp gốc</span>
              </li>
              <li>
                <strong>Bob kiểm tra</strong>
                <span>Tính sᵉ mod n và so sánh với m</span>
              </li>
            </ol>
          ) : (
            <ol className="rsa__flow" aria-label="Luồng mã hóa RSA">
              <li>
                <strong>Bob sinh khóa</strong>
                <span>
                  Công bố {"{e, n}"}, giữ {"{d, n}"}
                </span>
              </li>
              <li>
                <strong>Alice mã hóa</strong>
                <span>Dùng khóa công khai của Bob</span>
              </li>
              <li>
                <strong>Gửi bản mã</strong>
                <span>Truyền C qua kênh liên lạc</span>
              </li>
              <li>
                <strong>Bob giải mã</strong>
                <span>Dùng khóa riêng của mình</span>
              </li>
            </ol>
          )}
        </details>
        <p className="rsa__help">
          {signatureTab
            ? "RSA học thuật: ký và kiểm tra bằng lũy thừa modulo n."
            : "RSA biến đổi từng khối số bằng lũy thừa modulo n."}
        </p>
        <section className="rsa__section panel" aria-labelledby="rsa-key-title">
          <div className="panel__header">
            <h2 id="rsa-key-title">Khóa RSA</h2>
          </div>
          <div className="rsa__section-body">
            <div className="rsa__presets" role="group" aria-label="Cách nhập khóa RSA">
              {(["generate", "manual"] as const).map((source) => (
                <button
                  className="button button--secondary"
                  type="button"
                  key={source}
                  aria-pressed={cipher.keySource === source}
                  onClick={() => cipher.setKeySource(source)}
                >
                  {source === "generate" ? "Sinh khóa" : "Nhập khóa"}
                </button>
              ))}
            </div>
            {cipher.keySource === "generate" ? (
              <form
                className="rsa__key-form"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void cipher.generateKey();
                }}
              >
                <p className="rsa__help">
                  Chọn hai số nguyên tố khác nhau. n = p·q, φ(n) = (p−1)(q−1), d là nghịch đảo của e
                  modulo φ(n).
                </p>
                <div className="rsa__presets" role="group" aria-label="Bộ tham số mẫu RSA">
                  {[
                    { label: "Giáo trình · 17, 11, 7", p: "17", q: "11", e: "7" },
                    { label: "61, 53, 17", p: "61", q: "53", e: "17" },
                    { label: "Tiếng Việt · 101, 113, 3533", p: "101", q: "113", e: "3533" },
                  ].map((preset) => (
                    <button
                      className="button button--secondary"
                      type="button"
                      key={preset.label}
                      onClick={() => cipher.choosePreset(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="rsa__fields">
                  {(["p", "q", "e"] as const).map((field) => (
                    <label className="rsa__field" key={field}>
                      <span>
                        {field === "e" ? "e · số mũ công khai" : `${field} · số nguyên tố`}
                      </span>
                      <input
                        value={draft[field]}
                        inputMode="numeric"
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={Boolean(fieldErrors[field])}
                        aria-describedby={fieldErrors[field] ? `rsa-${field}-error` : undefined}
                        onChange={(event) => cipher.setParameter(field, event.target.value)}
                      />
                      {fieldErrors[field] && (
                        <small id={`rsa-${field}-error`} role="alert">
                          {fieldErrors[field]}
                        </small>
                      )}
                    </label>
                  ))}
                </div>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={!cipher.hasGateway || cipher.statuses.key === "loading"}
                >
                  Tạo khóa
                </button>
                <TaskMessage cipher={cipher} task="key" />
                {key && (
                  <>
                    <dl className="rsa__facts">
                      <div>
                        <dt>n = p·q</dt>
                        <dd>{key.n}</dd>
                      </div>
                      <div>
                        <dt>φ(n)</dt>
                        <dd>{key.phi}</dd>
                      </div>
                      <div>
                        <dt>Khóa công khai</dt>
                        <dd>{`{${key.e}, ${key.n}}`}</dd>
                      </div>
                      <div>
                        <dt>Khóa riêng</dt>
                        <dd>{`{${key.d}, ${key.n}}`}</dd>
                      </div>
                    </dl>
                    <details className="rsa__details rsa__trace">
                      <summary>Xem từng bước Euclid mở rộng tìm d</summary>
                      <EuclidTable rows={key.euclidRows} />
                    </details>
                  </>
                )}
              </form>
            ) : (
              <>
                <p className="rsa__help">
                  {signatureTab
                    ? "Ký cần d, e và n; kiểm tra chữ ký cần e và n. Bộ khóa được giữ khi chuyển tab."
                    : "Mã hóa chỉ cần e và n; giải mã chỉ cần d và n."}
                </p>
                <div className="rsa__fields">
                  {(["n", "e", "d"] as const).map((field) => (
                    <label className="rsa__field" key={field}>
                      <span>
                        {field === "n"
                          ? "n · modulo"
                          : field === "e"
                            ? "e · khóa công khai"
                            : "d · khóa riêng"}
                      </span>
                      <input
                        value={cipher.manualKey[field]}
                        inputMode="numeric"
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(event) => cipher.setManualKey(field, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      {tab === "pem" && cipher.active && (
        <div id="rsa-panel-pem" role="tabpanel" aria-labelledby="rsa-tab-pem">
          <RsaPemPanel ref={pemPanel} key={cipher.resetVersion} gateway={cipher.gateway} />
        </div>
      )}
      <div
        id="rsa-panel-signature"
        role="tabpanel"
        aria-labelledby="rsa-tab-signature"
        hidden={!signatureTab}
      >
        <RsaSignaturePanel signature={signature} />
      </div>
      <div
        className="rsa__encryption-panel"
        id="rsa-panel-encrypt"
        role="tabpanel"
        aria-labelledby="rsa-tab-encrypt"
        hidden={tab !== "encrypt"}
      >
        <TransformPanel key={`number-${cipher.resetVersion}`} cipher={cipher} task="number" />
        <TransformPanel key={`text-${cipher.resetVersion}`} cipher={cipher} task="text" />
        <details className="rsa__details">
          <summary>Vì sao giải mã đúng?</summary>
          <div className="rsa__explanation">
            <div>
              <p>Vì e·d ≡ 1 (mod φ(n)), ta có e·d = 1 + k·φ(n).</p>
              <p>
                Khi P nguyên tố cùng nhau với n, định lý Euler cho P<sup>φ(n)</sup> ≡ 1 (mod n), nên
                Cᵈ ≡ P (mod n).
              </p>
              <p>
                Trường hợp P chia hết cho p hoặc q cần xét riêng theo từng số nguyên tố. Điều kiện P
                &lt; n giúp lấy lại đúng P.
              </p>
            </div>
            <div>
              <h2>Giới hạn của ví dụ</h2>
              <p>
                Các số nguyên tố ở đây rất nhỏ và phép mã hóa không có padding. Mỗi ký tự luôn cho
                cùng một kết quả với cùng khóa. Đây là bài minh họa, không dùng để bảo vệ thông tin
                nhạy cảm.
              </p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
