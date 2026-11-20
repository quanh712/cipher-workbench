import type { DesDraft, DesFieldErrors } from "../types/cipher";

const publicMode = import.meta.env.VITE_PUBLIC_MODE === "true";
export const DES_MAX_INPUT_BYTES = publicMode ? 16 * 1024 : 5 * 1024 * 1024;
export const DES_MAX_HEX_BYTES = publicMode ? (DES_MAX_INPUT_BYTES + 8) * 2 : DES_MAX_INPUT_BYTES;
export const DES_LIMIT_MESSAGE = publicMode
  ? "DES public: tối đa 16 KiB bản rõ hoặc 32.784 ký tự HEX."
  : "Dữ liệu vượt quá 5 MiB.";
export const DES_FILE_HINT = publicMode
  ? "File .txt UTF-8: mã hóa tối đa 16 KiB, giải mã tối đa 32.784 byte HEX."
  : "Chỉ nhận file .txt UTF-8, tối đa 5 MiB. File encrypt ra HEX; file decrypt luôn trả văn bản.";
export const DES_MAX_ROUND_TRIP_TEXT_BYTES = publicMode ? DES_MAX_INPUT_BYTES : 2_621_439;
export const utf8ByteLength = (text: string) => new TextEncoder().encode(text).byteLength;
export const stripAsciiWhitespace = (text: string) => text.replace(/[\t\n\v\f\r ]/g, "");

function hexError(value: string, label: string, exact: boolean): string | undefined {
  const hex = stripAsciiWhitespace(value);
  if (!hex) return `Vui lòng nhập ${label}.`;
  if (!/^[0-9a-f]+$/i.test(hex)) return `${label} chỉ được chứa ký tự hex 0–9, A–F.`;
  if (exact ? hex.length !== 16 : hex.length % 16 !== 0)
    return `${label} phải ${exact ? "đúng 16" : "có độ dài là bội của 16"} ký tự hex (64 bit), hiện có ${hex.length}.`;
}

export function validateDesDraft(draft: DesDraft, demo = true): DesFieldErrors {
  const errors: DesFieldErrors = {};
  const maximum =
    draft.mode === "encrypt" && draft.format === "text" ? DES_MAX_INPUT_BYTES : DES_MAX_HEX_BYTES;
  const fileMaximum = draft.mode === "encrypt" ? DES_MAX_INPUT_BYTES : DES_MAX_HEX_BYTES;
  if (draft.inputType === "text" && draft.text.length === 0) {
    errors.input = "Vui lòng nhập nội dung.";
  }
  if (draft.inputType === "file" && !draft.file) {
    errors.file = "Vui lòng chọn file.";
  }
  if (!draft.key.trim()) errors.key = "Vui lòng nhập khóa DES.";
  if (!demo) {
    const keyError = hexError(draft.key, "Khóa", true);
    if (keyError) errors.key = keyError;
    if (draft.cipherMode === "CBC") {
      const ivError = hexError(draft.iv, "IV", true);
      if (ivError) errors.iv = ivError;
    }
    if (draft.inputType === "text") {
      if (utf8ByteLength(draft.text) > maximum) errors.input = DES_LIMIT_MESSAGE;
      else if (draft.mode === "decrypt" || draft.format === "hex") {
        const inputError = hexError(draft.text, "Dữ liệu hex", false);
        if (inputError) errors.input = inputError;
      }
    } else if (draft.file) {
      if (!/\.txt$/i.test(draft.file.name)) errors.file = "Chỉ chấp nhận file .txt.";
      else if (draft.file.size > fileMaximum)
        errors.file = publicMode ? DES_LIMIT_MESSAGE : "File vượt quá dung lượng tối đa 5 MB.";
      else if (draft.file.size === 0) errors.file = "File không được để trống.";
    }
  }
  return errors;
}
