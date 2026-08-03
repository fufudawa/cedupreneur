"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Badge, Button, Textarea, ProgressBar } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";
import { useDosenKelompokBimbingan } from "@/lib/useDosenKelompokBimbingan";

const FEEDBACK_MAX_LENGTH = 1000;
const FEEDBACK_MIN_LENGTH = 5;

const REPORT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu Feedback",
  reviewed: "Sudah Direview",
};

const REPORT_STATUS_BADGE_VARIANT: Record<string, "gray" | "orange" | "green"> = {
  draft: "gray",
  submitted: "orange",
  reviewed: "green",
};

const PEMBERI_ROLE_LABEL: Record<string, string> = {
  dosen: "Dosen",
  umkm: "UMKM",
};

interface LaporanRow {
  id: string;
  judul_laporan: string | null;
  isi_laporan: string | null;
  status: string | null;
  tanggal_submit: string | null;
  created_at: string | null;
}

interface FeedbackRow {
  id: string;
  laporan_id: string;
  pemberi_role: string | null;
  isi_feedback: string | null;
  created_at: string | null;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DosenMentoringDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { groups, isHydrated: groupsHydrated } = useDosenKelompokBimbingan();
  const group = groups.find((g) => g.id === id);

  const [laporanList, setLaporanList] = useState<LaporanRow[]>([]);
  const [feedbackByLaporan, setFeedbackByLaporan] = useState<Record<string, FeedbackRow[]>>({});
  const [detailHydrated, setDetailHydrated] = useState(false);
  const [selectedLaporanId, setSelectedLaporanId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isHydrated = groupsHydrated && detailHydrated;

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      // Reset form draft & status hydrasi setiap kali pindah kelompok (navigasi
      // client-side antar halaman detail Mentoring tidak remount komponen ini).
      setDetailHydrated(false);
      setContent("");
      setTouched(false);
      setSubmitError(null);

      try {
        const { data: laporanData, error: laporanError } = await supabase
          .from("laporan_progress")
          .select("id, judul_laporan, isi_laporan, status, tanggal_submit, created_at")
          .eq("kelompok_id", id)
          .order("created_at", { ascending: false });
        if (laporanError) throw laporanError;

        const rows = (laporanData ?? []) as LaporanRow[];
        const laporanIds = rows.map((r) => r.id);

        let grouped: Record<string, FeedbackRow[]> = {};
        if (laporanIds.length > 0) {
          const { data: feedbackData, error: feedbackError } = await supabase
            .from("feedback")
            .select("id, laporan_id, pemberi_role, isi_feedback, created_at")
            .in("laporan_id", laporanIds)
            .order("created_at", { ascending: false });
          if (feedbackError) throw feedbackError;

          grouped = {};
          for (const fb of (feedbackData ?? []) as FeedbackRow[]) {
            if (!grouped[fb.laporan_id]) grouped[fb.laporan_id] = [];
            grouped[fb.laporan_id].push(fb);
          }
        }

        if (isMounted) {
          setLaporanList(rows);
          setFeedbackByLaporan(grouped);
          setSelectedLaporanId(rows[0]?.id ?? null);
        }
      } catch (error) {
        console.error("Failed to load mentoring detail (cek RLS SELECT laporan_progress/feedback):", error);
        if (isMounted) {
          setLaporanList([]);
          setFeedbackByLaporan({});
        }
      } finally {
        if (isMounted) setDetailHydrated(true);
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!isHydrated) {
    return null;
  }
  if (!group) {
    notFound();
  }

  const activeLaporan = laporanList.find((l) => l.id === selectedLaporanId) ?? null;
  const activeFeedbacks = activeLaporan ? (feedbackByLaporan[activeLaporan.id] ?? []) : [];

  const waitingCount = laporanList.filter((l) => l.status === "submitted").length;
  const reviewedCount = laporanList.filter((l) => l.status === "reviewed").length;

  const errors = {
    content: content.trim().length < FEEDBACK_MIN_LENGTH ? "Feedback wajib diisi." : null,
  };
  const isValid = Object.values(errors).every((message) => message === null);

  const handleSelectLaporan = (laporanId: string) => {
    setSelectedLaporanId(laporanId);
    setContent("");
    setTouched(false);
    setSubmitError(null);
  };

  async function reloadFeedback(laporanId: string) {
    const { data, error } = await supabase
      .from("feedback")
      .select("id, laporan_id, pemberi_role, isi_feedback, created_at")
      .eq("laporan_id", laporanId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    setFeedbackByLaporan((prev) => ({ ...prev, [laporanId]: (data ?? []) as FeedbackRow[] }));
  }

  const handleSubmitFeedback = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setSubmitError(null);
    if (!isValid || !activeLaporan) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const profile = await getCurrentProfile();
      const { error } = await supabase.from("feedback").insert({
        laporan_id: activeLaporan.id,
        pemberi_id: profile.id,
        pemberi_role: "dosen",
        jenis_feedback: "catatan_dosen",
        isi_feedback: content.trim(),
      });
      if (error) throw error;

      await reloadFeedback(activeLaporan.id);
      setContent("");
      setTouched(false);
      setToast("Feedback berhasil dikirim.");
    } catch (error) {
      console.error("Failed to submit feedback (cek RLS INSERT pada tabel feedback):", error);
      setSubmitError("Gagal mengirim feedback. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={group.code}
        description={`${group.umkmName} · ${group.members.length} Anggota`}
        actions={
          <Link href="/dosen/mentoring-feedback">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Mentoring
            </Button>
          </Link>
        }
      />

      {toast && (
        <div className="fixed right-6 top-6 z-50 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <Card className="mb-6 min-w-0 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Progress</p>
            <p className="mt-1 text-lg font-bold text-navy">{group.progress}%</p>
          </div>
          <div>
            <p className="text-xs text-muted">Total Laporan</p>
            <p className="mt-1 text-lg font-bold text-navy">{laporanList.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Menunggu Feedback</p>
            <p className="mt-1 text-lg font-bold text-orange">{waitingCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Sudah Direview</p>
            <p className="mt-1 text-lg font-bold text-green-700">{reviewedCount}</p>
          </div>
        </div>
        <ProgressBar value={group.progress} showLabel={false} className="mt-4" />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-2xl border border-soft-gray-dark bg-white p-4">
          <h3 className="px-2 text-sm font-semibold text-navy">Daftar Laporan</h3>
          {laporanList.length === 0 ? (
            <p className="mt-3 px-2 text-sm text-muted">Belum ada laporan yang dikirim untuk kelompok ini.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {laporanList.map((laporan) => {
                const isSelected = laporan.id === selectedLaporanId;
                const status = laporan.status ?? "draft";
                return (
                  <button
                    key={laporan.id}
                    type="button"
                    onClick={() => handleSelectLaporan(laporan.id)}
                    className={`min-w-0 rounded-xl border p-3 text-left transition-colors ${
                      isSelected ? "border-purple bg-purple/5" : "border-soft-gray-dark bg-white hover:bg-soft-gray"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-navy">
                      {laporan.judul_laporan ?? "Laporan Progress"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted">{formatDateTime(laporan.tanggal_submit)}</span>
                      <Badge variant={REPORT_STATUS_BADGE_VARIANT[status] ?? "gray"}>
                        {REPORT_STATUS_LABEL[status] ?? status}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 flex flex-col gap-6">
          {activeLaporan ? (
            <>
              <Card className="min-w-0 rounded-2xl p-6">
                <p className="text-lg font-bold text-navy">{activeLaporan.judul_laporan ?? "Laporan Progress"}</p>
                {activeLaporan.isi_laporan && (
                  <p className="mt-2 text-sm text-navy">{activeLaporan.isi_laporan}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={14} strokeWidth={2} />
                    {formatDateTime(activeLaporan.tanggal_submit)}
                  </span>
                </div>
              </Card>

              <Card className="min-w-0 rounded-2xl p-6">
                <p className="text-base font-semibold text-navy">Tulis Feedback</p>
                <form onSubmit={handleSubmitFeedback} className="mt-3 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Textarea
                      placeholder="Tulis komentar, saran, atau feedback untuk kelompok ini..."
                      value={content}
                      onChange={(e) => setContent(e.target.value.slice(0, FEEDBACK_MAX_LENGTH))}
                      maxLength={FEEDBACK_MAX_LENGTH}
                      rows={5}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between gap-2">
                      {touched && errors.content ? (
                        <p className="text-xs text-pink">{errors.content}</p>
                      ) : (
                        <span />
                      )}
                      <span className="shrink-0 text-xs text-muted">
                        {content.length}/{FEEDBACK_MAX_LENGTH}
                      </span>
                    </div>
                  </div>

                  {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}

                  <div className="flex justify-end">
                    <Button type="submit" variant="secondary" disabled={isSubmitting}>
                      Kirim Feedback
                    </Button>
                  </div>
                </form>
              </Card>

              <Card className="min-w-0 rounded-2xl p-6">
                <p className="text-base font-semibold text-navy">Riwayat Feedback</p>
                {activeFeedbacks.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Belum ada feedback untuk laporan ini.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {activeFeedbacks.map((feedback) => (
                      <div key={feedback.id} className="rounded-xl border border-soft-gray-dark p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-navy">
                            {PEMBERI_ROLE_LABEL[feedback.pemberi_role ?? ""] ?? "-"}
                          </p>
                          <span className="text-xs text-muted">{formatDateTime(feedback.created_at)}</span>
                        </div>
                        <p className="mt-2 text-sm text-navy">{feedback.isi_feedback}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="min-w-0 rounded-2xl p-6">
              <p className="text-sm text-muted">
                Belum ada laporan progress untuk kelompok ini. Feedback dapat diberikan setelah mahasiswa
                mengirim laporan.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
