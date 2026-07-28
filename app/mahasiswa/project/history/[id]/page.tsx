"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, ValidasiBadge } from "@/components/shared";
import { Card, CardTitle, Badge, Button } from "@/components/ui";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import {
  MENTORING_MILESTONES,
  getMilestoneReport,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_BADGE_VARIANT,
} from "@/lib/dosenProgressReportsStorage";
import { formatActivityDateTime as formatDateTime } from "@/lib/adminDashboardData";
import { getUmkmFeedbackByReport, formatFeedbackTimestamp } from "@/lib/umkmFeedbackStorage";
import { getCurrentDemoUser, getActiveMahasiswaGroup } from "@/lib/demoSession";
import { FeedbackDosenSection } from "./FeedbackDosenSection";

export default function ProjectHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const isHydrated = groupsHydrated && reportsHydrated;

  if (!isHydrated) {
    return null;
  }

  const milestone = MENTORING_MILESTONES.find((m) => m.id === id);
  if (!milestone) {
    notFound();
  }

  const activeUser = getCurrentDemoUser("mahasiswa");
  const activeGroup = activeUser ? getActiveMahasiswaGroup(activeUser, groups) : undefined;

  if (!activeGroup) {
    return (
      <div>
        <PageHeader
          title="Detail Progress"
          description={milestone.title}
          actions={
            <Link href="/mahasiswa/project/history">
              <Button variant="outline">
                <ArrowLeft size={16} strokeWidth={2} />
                Kembali ke Riwayat Upload
              </Button>
            </Link>
          }
        />
        <Card className="rounded-2xl p-10 text-center text-sm text-muted">
          Anda belum terhubung dengan kelompok manapun.
        </Card>
      </div>
    );
  }

  const report = getMilestoneReport(activeGroup.id, id, reports);
  const umkmFeedbackHistory = report ? getUmkmFeedbackByReport(report.id) : [];
  const latestUmkmFeedback = umkmFeedbackHistory[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Detail Progress"
        description={report?.fileName ?? milestone.title}
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
            <CardTitle className="text-lg">{report?.fileName ?? milestone.title}</CardTitle>
            <Badge variant={REPORT_STATUS_BADGE_VARIANT[report?.status ?? "not_submitted"]}>
              {REPORT_STATUS_LABEL[report?.status ?? "not_submitted"]}
            </Badge>
          </div>

          {report ? (
            <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Tahap Project</dt>
                <dd className="mt-1 font-medium text-navy">{report.milestoneTitle}</dd>
              </div>
              <div>
                <dt className="text-muted">Diunggah oleh</dt>
                <dd className="mt-1 font-medium text-navy">{report.submittedBy}</dd>
              </div>
              <div>
                <dt className="text-muted">Tanggal &amp; Waktu Upload</dt>
                <dd className="mt-1 font-medium text-navy">{formatDateTime(report.submittedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted">Tipe File</dt>
                <dd className="mt-1 font-medium text-navy">{report.fileType}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted">Belum ada laporan yang dikirim untuk tahap ini.</p>
          )}

          {report?.status === "revision_required" && (
            <Link href="/mahasiswa/project/upload" className="mt-6 inline-block">
              <Button variant="secondary">Upload Revisi</Button>
            </Link>
          )}
          {!report && (
            <Link href="/mahasiswa/project/upload" className="mt-6 inline-block">
              <Button variant="secondary">Upload Laporan</Button>
            </Link>
          )}
        </Card>

        {/* Komentar mahasiswa saat submit */}
        {report?.comment && (
          <Card className="rounded-2xl p-6">
            <CardTitle className="text-lg">Komentar Mahasiswa</CardTitle>
            <p className="mt-3 text-sm text-navy">{report.comment}</p>
          </Card>
        )}

        {/* Feedback dosen (dari cedupreneur_progress_reports / cedupreneur_feedbacks) */}
        <FeedbackDosenSection groupId={activeGroup.id} milestoneId={id} />

        {/* Feedback UMKM (dari lib/umkmFeedbackStorage.ts / cedupreneur_umkm_feedbacks_v2) */}
        <Card className="rounded-2xl p-6">
          <CardTitle className="text-lg">Feedback UMKM</CardTitle>
          {latestUmkmFeedback ? (
            <div className="mt-4 rounded-2xl border border-soft-gray-dark p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-navy">{latestUmkmFeedback.pemberiNama}</p>
                  <p className="text-xs text-muted">
                    Mitra UMKM &middot; {formatFeedbackTimestamp(latestUmkmFeedback.createdAt)}
                  </p>
                </div>
                <ValidasiBadge status={latestUmkmFeedback.statusValidasi} />
              </div>
              <p className="mt-2 text-sm text-navy">{latestUmkmFeedback.isiFeedback}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Belum ada feedback dari UMKM.</p>
          )}

          <p className="mt-6 text-sm font-semibold text-navy">Riwayat Feedback UMKM</p>
          {umkmFeedbackHistory.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Belum ada feedback dari UMKM.</p>
          ) : (
            <div className="mt-3 flex flex-col">
              {umkmFeedbackHistory.map((feedback) => (
                <div key={feedback.id} className="border-b border-soft-gray-dark py-3 first:pt-0 last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-navy">{feedback.pemberiNama}</p>
                    <ValidasiBadge status={feedback.statusValidasi} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{formatFeedbackTimestamp(feedback.createdAt)}</p>
                  <p className="mt-1 text-sm text-navy">{feedback.isiFeedback}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
