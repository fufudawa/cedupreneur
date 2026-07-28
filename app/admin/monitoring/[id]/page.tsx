"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, ValidasiBadge } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, Button, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { useDosenFeedback } from "@/lib/useDosenFeedback";
import {
  MENTORING_MILESTONES,
  getCurrentStage,
  calculateGroupProgress,
  getMilestoneReport,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_BADGE_VARIANT,
} from "@/lib/dosenProgressReportsStorage";
import {
  getAllActivities,
  formatActivityDateTime,
  ACTIVITY_TYPE_LABEL,
  getUmkmFeedbackForGroup,
} from "@/lib/adminDashboardData";
import { getLatestUmkmFeedbackByReport } from "@/lib/umkmFeedbackStorage";

type FeedbackTab = "all" | "dosen" | "umkm";

interface CombinedFeedbackItem {
  id: string;
  source: "dosen" | "umkm";
  giverName: string;
  roleLabel: string;
  tahap: string;
  content: string;
  statusLabel: string;
  statusVariant: "green" | "pink" | "orange";
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
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const { feedbacks, isHydrated: feedbackHydrated } = useDosenFeedback();
  const isHydrated = groupsHydrated && reportsHydrated && feedbackHydrated;

  const [feedbackTab, setFeedbackTab] = useState<FeedbackTab>("all");

  if (!isHydrated) {
    return null;
  }

  const group = groups.find((g) => g.id === id);
  if (!group) {
    notFound();
  }

  const currentStage = getCurrentStage(group.id, MENTORING_MILESTONES, reports);
  const progress = calculateGroupProgress(group.id, MENTORING_MILESTONES, reports);
  const groupReports = reports.filter((r) => r.groupId === group.id);
  const groupFeedbacks = feedbacks.filter((f) => f.groupId === group.id);
  const groupActivities = getAllActivities(groups, reports, feedbacks)
    .filter((activity) => activity.groupId === group.id)
    .slice(0, 8);

  const dosenFeedbackItems: CombinedFeedbackItem[] = [...groupFeedbacks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((feedback) => ({
      id: feedback.id,
      source: "dosen",
      giverName: feedback.giverName,
      roleLabel: "Dosen",
      tahap: reports.find((r) => r.id === feedback.reportId)?.milestoneTitle ?? "-",
      content: feedback.content,
      statusLabel: feedback.completionStatus === "complete" ? "Tuntas" : "Belum Tuntas",
      statusVariant: feedback.completionStatus === "complete" ? "green" : "pink",
      createdAt: feedback.createdAt,
    }));

  const umkmFeedbackItems: CombinedFeedbackItem[] = getUmkmFeedbackForGroup(group.id).map((feedback) => ({
    id: feedback.id,
    source: "umkm",
    giverName: feedback.pemberiNama,
    roleLabel: "UMKM Mitra",
    tahap: feedback.laporanTitle,
    content: feedback.isiFeedback,
    statusLabel: feedback.statusValidasi === "tuntas" ? "Sesuai" : "Perlu Penyesuaian",
    statusVariant: feedback.statusValidasi === "tuntas" ? "green" : "orange",
    createdAt: feedback.createdAt,
  }));

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
            <p className="mt-1 text-sm font-semibold text-navy">{group.lecturerName}</p>
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
          <ProgressBar value={progress} showLabel={false} className="flex-1" />
          <span className="shrink-0 text-lg font-bold text-navy">{progress}%</span>
        </div>
        <p className="mt-2 text-sm text-muted">
          Tahap saat ini: <span className="font-medium text-navy">{currentStage.title}</span>
        </p>

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
          <CardTitle className="text-lg">Timeline Project</CardTitle>
        </CardHeader>
        <div className="flex flex-col">
          {MENTORING_MILESTONES.map((milestone) => {
            const report = getMilestoneReport(group.id, milestone.id, reports);
            const status = report?.status ?? "not_submitted";
            return (
              <div
                key={milestone.id}
                className="flex flex-col gap-2 border-b border-soft-gray-dark py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy">{milestone.title}</p>
                  {report && <p className="mt-0.5 text-xs text-muted">{report.fileName}</p>}
                </div>
                <Badge variant={REPORT_STATUS_BADGE_VARIANT[status]}>{REPORT_STATUS_LABEL[status]}</Badge>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mb-6 min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Daftar Laporan</CardTitle>
        </CardHeader>
        {groupReports.length === 0 ? (
          <p className="text-sm text-muted">Belum ada laporan untuk kelompok ini.</p>
        ) : (
          <div className="flex flex-col">
            {groupReports.map((report) => {
              const latestUmkmFeedback = getLatestUmkmFeedbackByReport(report.id);
              return (
                <div
                  key={report.id}
                  className="flex flex-col gap-2 border-b border-soft-gray-dark py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy">{report.milestoneTitle}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {report.fileName} &middot; {formatDateTime(report.submittedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={REPORT_STATUS_BADGE_VARIANT[report.status]}>
                      {REPORT_STATUS_LABEL[report.status]}
                    </Badge>
                    {latestUmkmFeedback && <ValidasiBadge status={latestUmkmFeedback.statusValidasi} />}
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
                  {item.tahap} &middot; {formatDateTime(item.createdAt)}
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
