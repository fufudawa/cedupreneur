"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, History as HistoryIcon, FileText, FileDown, ChevronRight, MessageSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, Badge, Button, Timeline } from "@/components/ui";
import type { TimelineItem } from "@/components/ui";
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

const REPORT_STATUS_TIMELINE: Record<string, TimelineItem["status"]> = {
  draft: "belum",
  submitted: "proses",
  reviewed: "selesai",
};

const PEMBERI_ROLE_LABEL: Record<string, string> = {
  dosen: "Dosen",
  umkm: "Mitra UMKM",
};

interface LaporanRow {
  id: string;
  judul_laporan: string | null;
  status: string | null;
  created_at: string | null;
}

interface FeedbackFeedItem {
  id: string;
  source: string;
  content: string;
  createdAt: string | null;
  laporanId: string;
  laporanTitle: string;
  laporanStatus: string | null;
}

function formatDateTime(iso: string | null) {
  if (!iso) return { date: "-", time: "-" };
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function MyProjectPage() {
  const { activeGroup, isHydrated: groupHydrated } = useMahasiswaKelompok();

  const [laporanList, setLaporanList] = useState<LaporanRow[]>([]);
  const [feedbackFeed, setFeedbackFeed] = useState<FeedbackFeedItem[]>([]);
  const [dataHydrated, setDataHydrated] = useState(false);
  const [fileMateriSignedUrl, setFileMateriSignedUrl] = useState<string | null>(null);
  const isHydrated = groupHydrated && dataHydrated;

  useEffect(() => {
    let isMounted = true;

    async function loadFileMateriUrl() {
      if (!activeGroup?.projectFileUrl) {
        if (isMounted) setFileMateriSignedUrl(null);
        return;
      }
      const { data, error } = await supabase.storage
        .from("project-materi")
        .createSignedUrl(activeGroup.projectFileUrl, 60 * 60);
      if (error) {
        console.error("Failed to create signed URL for file materi:", error);
        if (isMounted) setFileMateriSignedUrl(null);
        return;
      }
      if (isMounted) setFileMateriSignedUrl(data.signedUrl);
    }

    loadFileMateriUrl();

    return () => {
      isMounted = false;
    };
  }, [activeGroup?.projectFileUrl]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!activeGroup) {
        if (isMounted) {
          setLaporanList([]);
          setFeedbackFeed([]);
          setDataHydrated(true);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("laporan_progress")
          .select(
            `
              id, judul_laporan, status, created_at,
              feedback ( id, pemberi_role, isi_feedback, created_at )
            `
          )
          .eq("kelompok_id", activeGroup.id)
          .order("created_at", { ascending: false });
        if (error) throw error;

        type Row = LaporanRow & {
          feedback: { id: string; pemberi_role: string | null; isi_feedback: string | null; created_at: string | null }[] | null;
        };
        const rows = (data ?? []) as unknown as Row[];

        const feed: FeedbackFeedItem[] = rows
          .flatMap((row) =>
            (row.feedback ?? []).map((fb) => ({
              id: fb.id,
              source: PEMBERI_ROLE_LABEL[fb.pemberi_role ?? ""] ?? "-",
              content: fb.isi_feedback ?? "",
              createdAt: fb.created_at,
              laporanId: row.id,
              laporanTitle: row.judul_laporan ?? "Laporan Progress",
              laporanStatus: row.status,
            }))
          )
          .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

        if (isMounted) {
          setLaporanList(rows.map(({ id, judul_laporan, status, created_at }) => ({ id, judul_laporan, status, created_at })));
          setFeedbackFeed(feed);
        }
      } catch (error) {
        console.error("Failed to load project data (cek RLS SELECT laporan_progress/feedback):", error);
        if (isMounted) {
          setLaporanList([]);
          setFeedbackFeed([]);
        }
      } finally {
        if (isMounted) setDataHydrated(true);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeGroup]);

  if (!isHydrated) {
    return null;
  }

  if (!activeGroup) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl p-12 text-center">
        <p className="text-sm font-semibold text-navy">Anda belum terhubung dengan kelompok manapun.</p>
        <p className="text-sm text-muted">Hubungi dosen atau admin untuk ditambahkan ke sebuah kelompok.</p>
      </Card>
    );
  }

  const trackOfProject: TimelineItem[] = laporanList.slice(0, 5).map((report) => ({
    id: report.id,
    title: report.judul_laporan ?? "Laporan Progress",
    description: REPORT_STATUS_LABEL[report.status ?? "draft"],
    status: REPORT_STATUS_TIMELINE[report.status ?? "draft"] ?? "belum",
  }));

  const recentHistory = laporanList.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
      {/* File Materi Project — dibuat menonjol supaya gampang ditemukan */}
      {activeGroup.projectFileUrl && (
        <Card className="min-w-0 rounded-2xl border-2 border-purple/30 bg-purple/5 p-6 lg:col-span-2">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
                <FileDown size={22} strokeWidth={2} />
              </span>
              <div>
                <p className="text-base font-bold text-navy">File Materi Project</p>
                <p className="text-sm text-muted">Materi/panduan yang diunggah dosen untuk project ini.</p>
              </div>
            </div>
            {fileMateriSignedUrl ? (
              <a href={fileMateriSignedUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto">
                  <FileDown size={18} strokeWidth={2} />
                  Buka File Materi
                </Button>
              </a>
            ) : (
              <Button variant="secondary" className="w-full sm:w-auto" disabled>
                Memuat file...
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Track of project */}
      <Card className="min-w-0 rounded-2xl p-6">
        <CardTitle className="text-lg">Track of project</CardTitle>
        <p className="mb-6 mt-1 text-sm text-muted">Timeline</p>
        {trackOfProject.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Belum ada laporan progress yang dapat dipantau.</p>
        ) : (
          <Timeline items={trackOfProject} />
        )}
      </Card>

      {/* Upload + History */}
      <div className="flex min-w-0 flex-col gap-6">
        <Link href="/mahasiswa/project/upload">
          <Button variant="secondary" className="h-[70px] w-full text-base">
            <Upload size={20} strokeWidth={2} />
            Upload
          </Button>
        </Link>

        <Card className="rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">History</CardTitle>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple/10 text-purple">
              <HistoryIcon size={18} strokeWidth={2} />
            </span>
          </CardHeader>

          {recentHistory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Belum ada laporan yang diunggah.</p>
          ) : (
            <div className="divide-y divide-soft-gray-dark">
              {recentHistory.map((report) => {
                const { date, time } = formatDateTime(report.created_at);
                return (
                  <div
                    key={report.id}
                    className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple/10 text-purple">
                        <FileText size={18} strokeWidth={2} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-navy">
                          {report.judul_laporan ?? "Laporan Progress"}
                        </p>
                        <Badge variant={REPORT_STATUS_BADGE_VARIANT[report.status ?? "draft"] ?? "gray"}>
                          {REPORT_STATUS_LABEL[report.status ?? "draft"]}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      <p>{date}</p>
                      <p>{time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link
            href="/mahasiswa/project/history"
            className="mt-4 flex items-center gap-1 text-sm font-semibold text-purple hover:text-purple-dark"
          >
            Lihat semua history
            <ChevronRight size={16} />
          </Link>
        </Card>
      </div>

      {/* New Feedback */}
      <Card className="min-w-0 rounded-2xl p-6 lg:col-span-2">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-lg">New Feedback</CardTitle>
            {feedbackFeed.length > 0 && (
              <Badge variant="orange">{feedbackFeed.length} feedback</Badge>
            )}
          </div>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange/10 text-orange">
            <MessageSquare size={14} strokeWidth={2} />
          </span>
        </CardHeader>

        {feedbackFeed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-purple/10 text-purple">
              <MessageSquare size={26} strokeWidth={2} />
            </span>
            <p className="text-base font-bold text-navy">Belum ada feedback terbaru</p>
            <p className="text-sm text-muted">
              Feedback dari dosen atau mitra UMKM akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {feedbackFeed.map((item) => (
              <div key={item.id} className="rounded-2xl border border-soft-gray-dark p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy">{item.laporanTitle}</p>
                  <Badge variant={REPORT_STATUS_BADGE_VARIANT[item.laporanStatus ?? "draft"] ?? "gray"}>
                    {REPORT_STATUS_LABEL[item.laporanStatus ?? "draft"]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs font-medium text-purple">{item.source}</p>
                <p className="mt-2 text-sm text-muted">{item.content}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/mahasiswa/project/history/${item.laporanId}`}>
                    <Button variant="outline" size="sm">
                      Lihat Detail
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
