const publicMode = import.meta.env.VITE_PUBLIC_MODE === "true";
// Match the server budget before uploading data that would produce a large trace.
export const HILL_MAX_BYTES = publicMode ? 16 * 1024 : 5 * 1024 * 1024;
export const HILL_SIZE_ERROR = publicMode
  ? "Bản public chỉ xử lý tối đa 16 KiB văn bản Hill. Hãy rút ngắn nội dung."
  : "Văn bản vượt quá giới hạn 5 MiB.";
export const HILL_FILE_HINT = publicMode
  ? "Chỉ nhận file .txt UTF-8, tối đa 16 KiB"
  : "Chỉ nhận file .txt UTF-8, tối đa 5 MiB";
