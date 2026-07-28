"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileUploadBoxValue {
  name: string;
  size: number;
}

interface FileUploadBoxProps {
  value: FileUploadBoxValue | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  accept: string;
  /** Lowercase extensions with dot, e.g. [".pdf", ".docx"]. */
  extensions: string[];
  maxSizeBytes: number;
  title?: string;
  helperText?: string;
  helperSubtext?: string;
  className?: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadBox({
  value,
  onSelect,
  onRemove,
  accept,
  extensions,
  maxSizeBytes,
  title = "+ Upload",
  helperText = "Drag & drop file di sini atau klik untuk memilih file.",
  helperSubtext,
  className,
}: FileUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSelect = (file: File | null) => {
    if (!file) return;
    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!extensions.includes(extension)) {
      setError("Format file tidak didukung.");
      return;
    }
    if (file.size > maxSizeBytes) {
      setError("Ukuran file maksimal 20MB.");
      return;
    }
    setError(null);
    onSelect(file);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {value ? (
        <div className="flex flex-col gap-3 rounded-xl border border-soft-gray-dark bg-soft-gray p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
              <FileText size={20} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy">{value.name}</p>
              <p className="text-xs text-muted">{formatFileSize(value.size)}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-soft-gray-dark bg-white px-3 py-1.5 text-xs font-medium text-navy transition-colors hover:bg-soft-gray"
            >
              <RefreshCw size={14} strokeWidth={2} />
              Ganti File
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 rounded-lg border border-soft-gray-dark bg-white px-3 py-1.5 text-xs font-medium text-navy transition-colors hover:bg-soft-gray"
            >
              <Trash2 size={14} strokeWidth={2} />
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            validateAndSelect(e.dataTransfer.files?.[0] ?? null);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            isDragging ? "border-purple bg-purple/5" : "border-purple/40 bg-purple/5 hover:border-purple"
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-purple shadow-sm">
            <Upload size={20} strokeWidth={2} />
          </span>
          <p className="text-base font-semibold text-navy">{title}</p>
          <p className="text-xs text-muted">{helperText}</p>
          {helperSubtext && <p className="text-xs text-muted">{helperSubtext}</p>}
        </button>
      )}
      {error && <p className="text-xs text-pink">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          validateAndSelect(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
