import { useId } from "react";

export function RsaFilePicker({
  label,
  hint,
  accept,
  file,
  kind = "text",
  onChange,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  kind?: "text" | "key";
  onChange: (file: File) => void;
}) {
  const id = useId();
  const size = file
    ? file.size < 1024
      ? `${file.size} B`
      : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(file.size / 1024)} KiB`
    : null;
  return (
    <div className="rsa-file-picker">
      <span className="rsa-file-picker__label" id={`${id}-label`}>
        {label}
      </span>
      <label className="rsa-file-picker__control" data-selected={Boolean(file)}>
        <input
          className="rsa-file-picker__input"
          type="file"
          aria-label={label}
          aria-describedby={`${id}-hint`}
          accept={accept}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = "";
            if (selected) onChange(selected);
          }}
        />
        <span className="rsa-file-picker__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {kind === "key" ? (
              <>
                <circle cx="8" cy="8" r="4" />
                <path d="m11 11 9 9m-4-4 3-3m-6 0 3-3" />
              </>
            ) : (
              <>
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <path d="M14 3v6h6M8 13h8m-8 4h5" />
              </>
            )}
          </svg>
        </span>
        <span className="rsa-file-picker__details" aria-live="polite">
          <span className="rsa-file-picker__name">
            {file?.name ?? (kind === "key" ? "Chọn khóa từ máy" : "Chọn tài liệu từ máy")}
          </span>
          <span className="rsa-file-picker__meta">
            {file
              ? `${size} · Đã chọn`
              : kind === "key"
                ? ".pem hoặc .key"
                : "Văn bản UTF-8 · .txt"}
          </span>
        </span>
        <span className="rsa-file-picker__action" aria-hidden="true">
          {file ? "Đổi tệp" : "Chọn tệp"}
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13V3m-4 4 4-4 4 4M4 12v4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-4" />
          </svg>
        </span>
      </label>
      <span className="rsa-file-picker__hint" id={`${id}-hint`}>
        {hint}
      </span>
    </div>
  );
}
