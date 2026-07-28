"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface UploadBoxProps {
  label?: string;
  hint?: string;
  accept?: string;
  onFileSelect?: (file: File | null) => void;
  className?: string;
}

export function UploadBox({
  label = "Unggah File",
  hint = "Seret & lepas file di sini, atau klik untuk memilih",
  accept,
  onFileSelect,
  className,
}: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (file: File | null) => {
    setFileName(file?.name ?? null);
    onFileSelect?.(file);
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-navy">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-soft-gray-dark bg-soft-gray px-4 py-8 text-center transition-colors hover:border-purple"
      >
        <span className="text-sm text-gray-500">{fileName ?? hint}</span>
        <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-purple shadow-sm">
          Pilih File
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
