"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, Textarea, Button, Badge } from "@/components/ui";
import { ValidasiBadge } from "@/components/shared";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";
import { useUmkmKelompok } from "@/lib/useUmkmKelompok";
import type { LaporanValidasiStatus } from "@/lib/umkmFeedbackStorage";

const FEEDBACK_MAX_LENGTH = 1000;

interface FeedbackRow {
  id: string;
  pemberi_role: string | null;
  jenis_feedback: string | null;
  isi_feedback: string | null;
  created_at: string | null;
}

interface LaporanRow {
  id: string;
  judul_laporan: string | null;
  isi_laporan: string | null;
  file_url: string | null;
  created_at: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UmkmMentoringLaporanDetailPage({
  params,
}: {
  params: Promise<{ id: string; laporanId: string }>;
}) {
  const { id, laporanId } = use(params);
  const { groups, isHydrated: groupsHydrated } = useUmkmKelompok();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [laporan, setLaporan] = useState<LaporanRow | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackRow[]>([]);
  const [fileSignedUrl, setFileSignedUrl] = useState<string | null>(null);
  const [dataHydrated, setDataHydrated] = useState(false);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const isHydrated = groupsHydrated && dataHydrated;

  const [isiFeedback, setIsiFeedback] = useState("");
  const [statusValidasi, setStatusValidasi] = useState<LaporanValidasiStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      setIsiFeedback("");
      setStatusValidasi(null);
      setSubmitError("");
      setJustSubmitted(false);

      try {
        const profile = await getCurrentProfile();
        if (isMounted) setProfileId(profile.id);

        const { data: laporanData, error: laporanError } = await supabase
          .from("laporan_progress")
          .select("id, judul_laporan, isi_laporan, file_url, created_at")
          .eq("id", laporanId)
          .eq("kelompok_id", id)
          .maybeSingle();
        if (laporanError) throw laporanError;

        if (!laporanData) {
          if (isMounted) setNotFoundFlag(true);
          return;
        }

        const { data: feedbackData, error: feedbackError } = await supabase
          .from("feedback")
          .select("id, pemberi_role, jenis_feedback, isi_feedback, created_at")
          .eq("laporan_id", laporanId)
          .order("created_at", { ascending: false });
        if (feedbackError) throw feedbackError;

        if (isMounted) {
          setLaporan(laporanData as LaporanRow);
          setFeedbackList((feedbackData ?? []) as FeedbackRow[]);
        }

        if (laporanData.file_url) {
          const { data: signedData } = await supabase.storage
            .from("laporan-progress")
            .createSignedUrl(laporanData.file_url as string, 60 * 60);
          if (isMounted) setFileSignedUrl(signedData?.signedUrl ?? null);
        } else if (isMounted) {
          setFileSignedUrl(null);
        }
      } catch (error) {
        console.error("Failed to load laporan detail (cek RLS SELECT laporan_progress/feedback):", error);
        if (isMounted) setNotFoundFlag(true);
      } finally {
        if (isMounted) setDataHydrated(true);
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id, laporanId]);

  if (!isHydrated) {
    return null;
  }

  // RLS (kelompok_select_umkm) already guarantees ownership of the kelompok.
  const group = groups.find((g) => g.id === id);
  if (!group || notFoundFlag || !laporan) {
    notFound();
  }

  const umkmFeedback = feedbackList
    .filter((f) => f.pemberi_role === "umkm")
    .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
    .map((f, index) => ({ ...f, revisionNumber: index + 1 }))
    .reverse();
  const latest = umkmFeedback[0] ?? null;

  const canSubmit = isiFeedback.trim() !== "" && statusValidasi !== null;

  async function handleSubmit() {
    if (!canSubmit || statusValidasi === null || !profileId || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const { error } = await supabase.from("feedback").insert({
        laporan_id: laporanId,
        pemberi_id: profileId,
        pemberi_role: "umkm",
        jenis_feedback: statusValidasi === "tuntas" ? "sesuai" : "perlu_penyesuaian",
        isi_feedback: isiFeedback.trim(),
      });
      if (error) throw error;

      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("id, pemberi_role, jenis_feedback, isi_feedback, created_at")
        .eq("laporan_id", laporanId)
        .order("created_at", { ascending: false });
      if (feedbackError) throw feedbackError;

      setFeedbackList((feedbackData ?? []) as FeedbackRow[]);
      setIsiFeedback("");
      setStatusValidasi(null);
      setJustSubmitted(true);
    } catch (error) {
      console.error("Failed to submit umkm feedback:", error);
      setSubmitError("Gagal mengirim feedback. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/umkm/mentoring/${group!.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-purple hover:underline"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Kembali ke Mentoring
        </Link>
        <h1 className="mt-3 text-xl font-bold text-navy">{group!.code}</h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <span>
            Laporan: <span className="font-medium text-navy">{laporan!.judul_laporan ?? "Laporan Progress"}</span>
          </span>
          <span>
            Tanggal submit: <span className="font-medium text-navy">{formatDate(laporan!.created_at)}</span>
          </span>
          <span>
            UMKM pendamping: <span className="font-medium text-navy">{group!.umkmName}</span>
          </span>
        </div>
      </div>

      <Card className="rounded-2xl p-5">
        <CardHeader>
          <CardTitle>File Laporan</CardTitle>
        </CardHeader>
        {laporan!.file_url ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
                <FileText size={22} strokeWidth={2} />
              </div>
              <p className="truncate text-sm font-medium text-navy">
                {laporan!.file_url.split("/").pop()}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {fileSignedUrl && (
                <a href={fileSignedUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <Download size={16} strokeWidth={2} />
                    Buka File
                  </Button>
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Belum ada file yang diunggah.</p>
        )}
      </Card>

      {laporan!.isi_laporan && (
        <Card className="rounded-2xl p-5">
          <CardHeader>
            <CardTitle>Komentar Kelompok</CardTitle>
          </CardHeader>
          <p className="text-sm text-navy">{laporan!.isi_laporan}</p>
        </Card>
      )}

      {latest && (
        <Card className="rounded-2xl p-5">
          <CardHeader>
            <CardTitle>Feedback Terbaru</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <ValidasiBadge status={latest.jenis_feedback === "sesuai" ? "tuntas" : "belum_tuntas"} />
            <span className="text-xs text-muted">{formatDateTime(latest.created_at)}</span>
          </div>
          <p className="mt-2 text-sm text-navy">{latest.isi_feedback}</p>
        </Card>
      )}

      <Card className="rounded-2xl p-5">
        <CardHeader>
          <CardTitle>Tulis komentar atau masukan</CardTitle>
        </CardHeader>

        <Textarea
          placeholder="Berikan masukan praktis berdasarkan kondisi usaha Anda..."
          value={isiFeedback}
          onChange={(e) => {
            setJustSubmitted(false);
            setIsiFeedback(e.target.value.slice(0, FEEDBACK_MAX_LENGTH));
          }}
          maxLength={FEEDBACK_MAX_LENGTH}
          rows={5}
          className="resize-none"
        />
        <p className="mt-1 text-right text-xs text-muted">
          {isiFeedback.length} / {FEEDBACK_MAX_LENGTH}
        </p>

        <div className="mt-5">
          <p className="text-sm font-medium text-navy">
            Apakah laporan ini sudah sesuai dengan kondisi dan kebutuhan usaha?
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="radio"
                name="statusValidasi"
                value="belum_tuntas"
                checked={statusValidasi === "belum_tuntas"}
                onChange={() => {
                  setJustSubmitted(false);
                  setStatusValidasi("belum_tuntas");
                }}
                className="h-4 w-4 accent-orange"
              />
              Perlu Penyesuaian
            </label>
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                type="radio"
                name="statusValidasi"
                value="tuntas"
                checked={statusValidasi === "tuntas"}
                onChange={() => {
                  setJustSubmitted(false);
                  setStatusValidasi("tuntas");
                }}
                className="h-4 w-4 accent-purple"
              />
              Sesuai
            </label>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Pilih Perlu Penyesuaian jika mahasiswa masih perlu menyesuaikan laporan dengan kondisi usaha.
          </p>
        </div>

        {submitError && <p className="mt-4 text-sm font-medium text-pink">{submitError}</p>}
        {justSubmitted && (
          <p className="mt-4 rounded-xl bg-green-100 px-3.5 py-2 text-sm font-medium text-green-700">
            Feedback berhasil dikirim
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Link href={`/umkm/mentoring/${group!.id}`}>
            <Button variant="outline">Batal</Button>
          </Link>
          <Button variant="secondary" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Mengirim..." : latest ? "Kirim Feedback Baru" : "Kirim Feedback"}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl p-5">
        <CardHeader>
          <CardTitle>Riwayat Feedback UMKM</CardTitle>
        </CardHeader>
        {umkmFeedback.length === 0 ? (
          <p className="text-sm text-muted">Belum ada feedback dari UMKM.</p>
        ) : (
          <div className="flex flex-col">
            {umkmFeedback.map((feedback) => (
              <div key={feedback.id} className="border-b border-soft-gray-dark py-4 first:pt-0 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-navy">{group!.umkmName}</p>
                    <Badge variant="gray">Ke-{feedback.revisionNumber}</Badge>
                  </div>
                  <ValidasiBadge status={feedback.jenis_feedback === "sesuai" ? "tuntas" : "belum_tuntas"} />
                </div>
                <p className="mt-1 text-xs text-muted">{formatDateTime(feedback.created_at)}</p>
                <p className="mt-1 text-sm text-navy">{feedback.isi_feedback}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
