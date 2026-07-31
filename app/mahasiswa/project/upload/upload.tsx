"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { useMahasiswaKelompok } from "@/lib/useMahasiswaKelompok";

export default function UploadProgressPage() {
  const router = useRouter();
  const { activeGroup, isHydrated } = useMahasiswaKelompok();

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [judul, setJudul] = useState("");
  const [progress, setProgress] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFile(fileList[0]);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    pickFile(e.dataTransfer.files);
  };

  if (!isHydrated) {
    return null;
  }

  if (!activeGroup) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-semibold text-slate-900">
          Anda belum terhubung dengan kelompok manapun.
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Hubungi dosen atau admin untuk ditambahkan ke sebuah kelompok terlebih dahulu.
        </p>
      </div>
    );
  }

  async function handleUpload() {
    if (isSubmitting || !activeGroup) return;

    const judulTrimmed = judul.trim();
    const progressNumber = Number(progress);

    if (judulTrimmed === "") {
      setError("Judul laporan wajib diisi.");
      return;
    }
    if (progress === "" || Number.isNaN(progressNumber) || progressNumber < 0 || progressNumber > 100) {
      setError("Persentase progress harus berupa angka 0-100.");
      return;
    }
    if (!file) {
      setError("Pilih file laporan terlebih dahulu.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const { data: inserted, error: insertError } = await supabase
        .from("laporan_progress")
        .insert({
          kelompok_id: activeGroup.id,
          judul_laporan: judulTrimmed,
          isi_laporan: comment.trim() || null,
          persentase_progress: progressNumber,
          status: "draft",
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const laporanId = inserted.id as string;
      const filePath = `${activeGroup.id}/${laporanId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("laporan-progress")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("laporan_progress")
        .update({ file_url: filePath, status: "submitted", tanggal_submit: new Date().toISOString() })
        .eq("id", laporanId);
      if (updateError) throw updateError;

      setJustSubmitted(true);
      setTimeout(() => router.push(`/mahasiswa/project/history/${laporanId}`), 700);
    } catch (err) {
      console.error("Failed to submit laporan progress:", err);
      setError("Gagal mengirim laporan. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {/* Judul & Progress */}
      <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Detail Laporan</h2>
        <p className="mt-1 text-sm text-slate-400">
          Kelompok: {activeGroup.code} &middot; {activeGroup.umkmName}
        </p>
        <div className="mt-4 grid max-w-md gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="judul-laporan">
              Judul Laporan
            </label>
            <Input
              id="judul-laporan"
              placeholder="Contoh: Progress riset target market"
              value={judul}
              onChange={(e) => {
                setJudul(e.target.value);
                setError("");
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="progress-persen">
              Progress (%)
            </label>
            <Input
              id="progress-persen"
              type="number"
              min={0}
              max={100}
              placeholder="0 - 100"
              value={progress}
              onChange={(e) => {
                setProgress(e.target.value);
                setError("");
              }}
            />
          </div>
        </div>
      </div>

      {/* Add File Progress */}
      <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors",
            isDragging
              ? "border-purple-400 bg-purple-50"
              : "border-slate-200 hover:border-purple-300 hover:bg-slate-50",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={(e) => pickFile(e.target.files)}
          />
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <Plus size={28} className="text-purple-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">Add File Progress</p>
          <p className="mt-2 text-sm text-slate-400">
            Drag &amp; drop file here or click to browse
          </p>
          <p className="mt-1 text-sm text-slate-400">
            PDF, DOCX, PPTX, XLSX, PNG, JPG (Max. 25MB)
          </p>
        </div>
        {file && (
          <ul className="mt-4 flex flex-col gap-1.5 text-sm text-slate-700">
            <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs font-medium text-red-500 hover:text-red-600"
              >
                Hapus
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* Comment */}
      <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Comment</h2>
        <textarea
          value={comment}
          maxLength={500}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your comment here..."
          rows={5}
          className="mt-4 w-full resize-none border-b border-slate-200 pb-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-purple-400"
        />
        <p className="mt-1 text-right text-xs text-slate-400">
          {comment.length} / 500
        </p>
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}
      {justSubmitted && (
        <p className="mt-4 rounded-xl bg-green-100 px-3.5 py-2 text-sm font-medium text-green-700">
          Laporan berhasil dikirim. Status: Menunggu Feedback. Mengarahkan ke riwayat...
        </p>
      )}

      {/* Upload button */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleUpload}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 px-10 py-3.5 text-sm font-bold text-white shadow-md shadow-purple-500/30 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Mengunggah..." : "⬆ Upload"}
        </button>
      </div>
    </div>
  );
}
