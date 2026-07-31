"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, ValidasiBadge } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, Button, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useAdminMonitoring } from "@/lib/useAdminMonitoring";
import { getAllActivities, formatActivityDateTime, ACTIVITY_TYPE_LABEL } from "@/lib/adminDashboardData";

type FeedbackTab = "all" | "dosen" | "umkm";

const LAPORAN_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu Feedback",
  reviewed: "Selesai Direview",
};

const LAPORAN_STATUS_VARIANT: Record<string, "gray" | "orange" | "green"> = {
  draft: "gray",
  submitted: "orange",
  reviewed: "green",
};

interface CombinedFeedbackItem {
  id: string;
  source: "dosen" | "umkm";
  giverName: string;
  roleLabel: string;
  laporanTitle: string;
  content: string;
  statusLabel: string;
  statusVariant: "green" | "orange";
  createdAt: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMonitoringDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { groups, isHydrated } = useAdminMonitoring();

  const [feedbackTab, setFeedbackTab] = useState<FeedbackTab>("all");

  if (!isHydrated) {
    return null;
  }

  const group = groups.find((g) => g.id === id);
  if (!group) {
    notFound();
  }

  const groupActivities = getAllActivities(groups)
    .filter((activity) => activity.groupId === group.id)
    .slice(0, 8);

  const dosenFeedbackItems: CombinedFeedbackItem[] = group.laporan.flatMap((laporan) =>
    laporan.feedback
      .filter((f) => f.pemberiRole === "dosen")
      .map((feedback) => ({
        id: feedback.id,
        source: "dosen" as const,
        giverName: group.dosenName,
        roleLabel: "Dosen",
        laporanTitle: laporan.judulLaporan,
        content: feedback.isiFeedback,
        statusLabel: feedback.jenisFeedback === "catatan_dosen" ? "Catatan" : (feedback.jenisFeedback ?? "Catatan"),
        statusVariant: "green" as const,
        createdAt: feedback.createdAt ?? "",
      }))
  );

  const umkmFeedbackItems: CombinedFeedbackItem[] = group.laporan.flatMap((laporan) =>
    laporan.feedback
      .filter((f) => f.pemberiRole === "umkm")
      .map((feedback) => ({
        id: feedback.id,
        source: "umkm" as const,
        giverName: group.umkmName,
        roleLabel: "UMKM Mitra",
        laporanTitle: laporan.judulLaporan,
        content: feedback.isiFeedback,
        statusLabel: feedback.jenisFeedback === "sesuai" ? "Sesuai" : "Perlu Penyesuaian",
        statusVariant: feedback.jenisFeedback === "sesuai" ? ("green" as const) : ("orange" as const),
        createdAt: feedback.createdAt ?? "",
      }))
  );

  const combinedFeedbackItems = [...dosenFeedbackItems, ...umkmFeedbackItems].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const visibleFeedbackItems =
    feedbackTab === "dosen" ? dosenFeedbackItems : feedbackTab === "umkm" ? umkmFeedbackItems : combinedFeedbackItems;

  const feedbackEmptyMessage =
    feedbackTab === "dosen"
      ? "Belum ada feedback dari dosen."
      : feedbackTab === "umkm"
        ? "UMKM mitra belum memberikan validasi."
        : "Belum ada feedback atau validasi untuk kelompok ini.";

  return (
    <div>
      <PageHeader
        title={group.code}
        description={`${group.umkmName} · ${group.members.length} Anggota`}
        actions={
          <Link href="/admin/monitoring">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Monitoring
            </Button>
          </Link>
        }
      />

      <Card className="mb-6 min-w-0 rounded-2xl p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted">Kelas</p>
            <p className="mt-1 text-sm font-semibold text-navy">{group.className}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Program Studi</p>
            <p className="mt-1 text-sm font-semibold text-navy">{group.studyProgram}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Dosen Pembimbing</p>
            <p className="mt-1 text-sm font-semibold text-navy">{group.dosenName}</p>
          </div>
          <div>
            <p className="text-xs text-muted">UMKM Mitra</p>
            <p className="mt-1 text-sm font-semibold text-navy">{group.umkmName}</p>
          </div>
        </div>

        <div className="my-6 h-px bg-soft-gray-dark" />

        <p className="text-xs text-muted">Anggota Kelompok</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {group.members.map((member) => (
            <Badge key={member.id} variant="gray">
              {member.name} ({member.nim})
            </Badge>
          ))}
        </div>

        <div className="my-6 h-px bg-soft-gray-dark" />

        <div className="flex items-center gap-4">
          <ProgressBar value={group.progress} showLabel={false} className="flex-1" />
          <span className="shrink-0 text-lg font-bold text-navy">{group.progress}%</span>
        </div>

        <div className="my-6 h-px bg-soft-gray-dark" />

        <p className="text-xs text-muted">
          Total Feedback: <span className="font-semibold text-navy">{combinedFeedbackItems.length}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {dosenFeedbackItems.length} Dosen &middot; {umkmFeedbackItems.length} UMKM
        </p>
      </Card>

      <Card className="mb-6 min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Laporan</CardTitle>
        </CardHeader>
        {group.laporan.length === 0 ? (
          <p className="text-sm text-muted">Belum ada laporan untuk kelompok ini.</p>
        ) : (
          <div className="flex flex-col">
            {group.laporan.map((laporan) => {
              const latestUmkmFeedback = laporan.feedback.find((f) => f.pemberiRole === "umkm");
              return (
                <div
                  key={laporan.id}
                  className="flex flex-col gap-2 border-b border-soft-gray-dark py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy">{laporan.judulLaporan}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateTime(laporan.tanggalSubmit ?? laporan.createdAt ?? "")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={LAPORAN_STATUS_VARIANT[laporan.status ?? "draft"]}>
                      {LAPORAN_STATUS_LABEL[laporan.status ?? "draft"]}
                    </Badge>
                    {latestUmkmFeedback && (
                      <ValidasiBadge status={latestUmkmFeedback.jenisFeedback === "sesuai" ? "tuntas" : "belum_tuntas"} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="mb-6 min-w-0 rounded-2xl p-6">
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg">Feedback & Validasi</CardTitle>
            <p className="mt-0.5 text-xs text-muted">
              Feedback Dosen adalah penilaian akademik. Validasi UMKM adalah masukan praktis dari mitra usaha.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-soft-gray-dark bg-soft-gray p-1">
            {(
              [
                { value: "all", label: "Semua" },
                { value: "dosen", label: "Dosen" },
                { value: "umkm", label: "UMKM" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFeedbackTab(tab.value)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
                  feedbackTab === tab.value ? "bg-white text-navy shadow-sm" : "text-muted hover:text-navy"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        {visibleFeedbackItems.length === 0 ? (
          <p className="text-sm text-muted">{feedbackEmptyMessage}</p>
        ) : (
          <div className="flex flex-col">
            {visibleFeedbackItems.map((item) => (
              <div key={item.id} className="border-b border-soft-gray-dark py-4 last:border-b-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-navy">{item.giverName}</p>
                    <Badge variant={item.source === "dosen" ? "purple" : "pink"}>{item.roleLabel}</Badge>
                  </div>
                  <Badge variant={item.statusVariant}>{item.statusLabel}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {item.laporanTitle} &middot; {formatDateTime(item.createdAt)}
                </p>
                <p className="mt-1 text-sm text-navy">{item.content}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Riwayat Aktivitas Kelompok</CardTitle>
        </CardHeader>
        {groupActivities.length === 0 ? (
          <p className="text-sm text-muted">Belum ada aktivitas untuk kelompok ini.</p>
        ) : (
          <div className="flex flex-col">
            {groupActivities.map((activity) => (
              <div key={activity.id} className="border-b border-soft-gray-dark py-4 last:border-b-0">
                <p className="text-sm text-navy">{activity.description}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {ACTIVITY_TYPE_LABEL[activity.type]} &middot; {formatActivityDateTime(activity.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
