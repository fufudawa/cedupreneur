"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, CardTitle, Badge, Button } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { useMahasiswaKelompok } from "@/lib/useMahasiswaKelompok";

const REPORT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu Feedback",
  reviewed: "Selesai Direview",
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
  persentase_progress: number | null;
  status: string | null;
  tanggal_submit: string | null;
  created_at: string | null;
}

interface FeedbackRow {
  id: string;
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

export default function ProjectHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isHydrated: groupHydrated } = useMahasiswaKelompok();

  const [laporan, setLaporan] = useState<LaporanRow | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackRow[]>([]);
  const [detailHydrated, setDetailHydrated] = useState(false);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const isHydrated = groupHydrated && detailHydrated;

  useEffect(() => {
    let isMounted = true;

    async function loadDetail() {
      try {
        const { data: laporanData, error: laporanError } = await supabase
          .from("laporan_progress")
          .select("id, judul_laporan, isi_laporan, persentase_progress, status, tanggal_submit, created_at")
          .eq("id", id)
          .maybeSingle();
        if (laporanError) throw laporanError;

        if (!laporanData) {
          if (isMounted) setNotFoundFlag(true);
          return;
        }

        const { data: feedbackData, error: feedbackError } = await supabase
          .from("feedback")
          .select("id, pemberi_role, isi_feedback, created_at")
          .eq("laporan_id", id)
          .order("created_at", { ascending: false });
        if (feedbackError) throw feedbackError;

        if (isMounted) {
          setLaporan(laporanData as LaporanRow);
          setFeedbackList((feedbackData ?? []) as FeedbackRow[]);
        }
      } catch (error) {
        console.error("Failed to load laporan detail (cek RLS SELECT laporan_progress/feedback):", error);
        if (isMounted) setNotFoundFlag(true);
      } finally {
        if (isMounted) setDetailHydrated(true);
      }
    }

    loadDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (!isHydrated) {
    return null;
  }

  if (notFoundFlag || !laporan) {
    notFound();
  }

  const status = laporan.status ?? "draft";
  const dosenFeedback = feedbackList.filter((f) => f.pemberi_role === "dosen");
  const umkmFeedback = feedbackList.filter((f) => f.pemberi_role === "umkm");

  return (
    <div>
      <PageHeader
        title="Detail Progress"
        description={laporan.judul_laporan ?? "Laporan Progress"}
        actions={
          <Link href="/mahasiswa/project/history">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Riwayat Upload
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-6">
        {/* Informasi laporan */}
        <Card className="rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">{laporan.judul_laporan ?? "Laporan Progress"}</CardTitle>
            <Badge variant={REPORT_STATUS_BADGE_VARIANT[status] ?? "gray"}>
              {REPORT_STATUS_LABEL[status] ?? status}
            </Badge>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Progress</dt>
              <dd className="mt-1 font-medium text-navy">{laporan.persentase_progress ?? 0}%</dd>
            </div>
            <div>
              <dt className="text-muted">Tanggal &amp; Waktu Upload</dt>
              <dd className="mt-1 font-medium text-navy">{formatDateTime(laporan.tanggal_submit ?? laporan.created_at)}</dd>
            </div>
          </dl>

          <Link href="/mahasiswa/project/upload" className="mt-6 inline-block">
            <Button variant="secondary">Upload Laporan Baru</Button>
          </Link>
        </Card>

        {/* Komentar mahasiswa saat submit */}
        {laporan.isi_laporan && (
          <Card className="rounded-2xl p-6">
            <CardTitle className="text-lg">Komentar Mahasiswa</CardTitle>
            <p className="mt-3 text-sm text-navy">{laporan.isi_laporan}</p>
          </Card>
        )}

        {/* Feedback Dosen */}
        <Card className="rounded-2xl p-6">
          <CardTitle className="text-lg">Feedback Dosen</CardTitle>
          {dosenFeedback.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada feedback dari dosen.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {dosenFeedback.map((feedback) => (
                <div key={feedback.id} className="rounded-2xl border border-soft-gray-dark p-4">
                  <p className="text-xs text-muted">{formatDateTime(feedback.created_at)}</p>
                  <p className="mt-1 text-sm text-navy">{feedback.isi_feedback}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Feedback UMKM */}
        <Card className="rounded-2xl p-6">
          <CardTitle className="text-lg">Feedback UMKM</CardTitle>
          {umkmFeedback.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada feedback dari UMKM.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {umkmFeedback.map((feedback) => (
                <div key={feedback.id} className="rounded-2xl border border-soft-gray-dark p-4">
                  <p className="text-xs font-medium text-navy">
                    {PEMBERI_ROLE_LABEL[feedback.pemberi_role ?? ""] ?? "-"}
                  </p>
                  <p className="text-xs text-muted">{formatDateTime(feedback.created_at)}</p>
                  <p className="mt-1 text-sm text-navy">{feedback.isi_feedback}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
