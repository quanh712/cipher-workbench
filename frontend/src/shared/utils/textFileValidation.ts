export const PUBLIC_MODE = import.meta.env.VITE_PUBLIC_MODE === "true";
export const MAX_TEXT_FILE_BYTES = PUBLIC_MODE ? 64 * 1024 : 5 * 1024 * 1024;
export const TEXT_FILE_HINT = PUBLIC_MODE
  ? "Chỉ nhận file .txt UTF-8, tối đa 64 KiB"
  : "Chỉ nhận file .txt UTF-8, tối đa 5 MiB";
export function publicTextError(text: string, maximum = MAX_TEXT_FILE_BYTES): string | null {
  return PUBLIC_MODE && new TextEncoder().encode(text).byteLength > maximum
    ? `Bản public chỉ xử lý tối đa ${maximum / 1024} KiB văn bản.`
    : null;
}

export function validateTextFile(file: File | null, maximum = MAX_TEXT_FILE_BYTES): string | null {
  if (!file) return "Vui lòng chọn file.";
  if (!/\.txt$/i.test(file.name)) return "Chỉ chấp nhận file .txt.";
  if (file.size > maximum)
    return PUBLIC_MODE
      ? `File vượt quá dung lượng tối đa ${maximum / 1024} KiB.`
      : "File vượt quá dung lượng tối đa 5 MB.";
  if (file.size === 0) return "File không được để trống.";
  return null;
}

export async function readTextFile(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
