"use client";

import Link from "next/link";
import { Upload, History as HistoryIcon, FileText, ChevronRight, MessageSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, Badge, Button, Timeline } from "@/components/ui";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { useDosenFeedback } from "@/lib/useDosenFeedback";
import {
  MENTORING_MILESTONES,
  getMilestoneReport,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_BADGE_VARIANT,
} from "@/lib/dosenProgressReportsStorage";
import { getUmkmFeedbackForGroup } from "@/lib/adminDashboardData";
import { getCurrentDemoUser, getActiveMahasiswaGroup } from "@/lib/demoSession";

type TimelineStatus = "selesai" | "proses" | "belum";

function reportToTimelineStatus(status: string | undefined): TimelineStatus {
  if (status === "approved") return "selesai";
  if (status === "submitted" || status === "revision_required") return "proses";
  return "belum";
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function MyProjectPage() {
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const { feedbacks, isHydrated: feedbackHydrated } = useDosenFeedback();
  const isHydrated = groupsHydrated && reportsHydrated && feedbackHydrated;

  if (!isHydrated) {
    return null;
  }

  const activeUser = getCurrentDemoUser("mahasiswa");
  const activeGroup = activeUser ? getActiveMahasiswaGroup(activeUser, groups) : undefined;

  if (!activeGroup) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl p-12 text-center">
        <p className="text-sm font-semibold text-navy">Anda belum terhubung dengan kelompok manapun.</p>
        <p className="text-sm text-muted">Hubungi dosen atau admin untuk ditambahkan ke sebuah kelompok.</p>
      </Card>
    );
  }

  const trackOfProject = MENTORING_MILESTONES.map((milestone) => {
    const report = getMilestoneReport(activeGroup.id, milestone.id, reports);
    return {
      id: milestone.id,
      title: milestone.title,
      status: reportToTimelineStatus(report?.status),
    };
  });

  const groupReports = reports
    .filter((r) => r.groupId === activeGroup.id)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  const recentHistory = groupReports.slice(0, 3);

  const dosenFeedbackItems = feedbacks
    .filter((f) => f.groupId === activeGroup.id && f.giverRole === "dosen")
    .map((feedback) => ({
      id: feedback.id,
      source: "Dosen" as const,
      giverName: feedback.giverName,
      content: feedback.content,
      createdAt: feedback.createdAt,
      report: reports.find((r) => r.id === feedback.reportId),
    }));

  const umkmFeedbackItems = getUmkmFeedbackForGroup(activeGroup.id).map((feedback) => ({
    id: feedback.id,
    source: "Mitra UMKM" as const,
    giverName: activeGroup.umkmName,
    content: feedback.isiFeedback,
    createdAt: feedback.createdAt,
    report: reports.find((r) => r.milestoneTitle === feedback.laporanTitle && r.groupId === activeGroup.id),
  }));

  const feedbackFeed = [...dosenFeedbackItems, ...umkmFeedbackItems].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
      {/* Track of project */}
      <Card className="min-w-0 rounded-2xl p-6">
        <CardTitle className="text-lg">Track of project</CardTitle>
        <p className="mb-6 mt-1 text-sm text-muted">Timeline</p>
        <Timeline items={trackOfProject} />
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
                const { date, time } = formatDateTime(report.submittedAt);
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
                        <p className="text-sm font-semibold text-navy">{report.fileName}</p>
                        <p className="text-xs text-muted">Diunggah oleh {report.submittedBy}</p>
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
              <Badge variant="orange">{feedbackFeed.length} feedback baru</Badge>
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
                  <p className="text-sm font-semibold text-navy">{item.report?.milestoneTitle ?? "-"}</p>
                  {item.report && (
                    <Badge variant={REPORT_STATUS_BADGE_VARIANT[item.report.status]}>
                      {REPORT_STATUS_LABEL[item.report.status]}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-medium text-purple">
                  {item.source} &middot; {item.giverName}
                </p>
                <p className="mt-2 text-sm text-muted">{item.content}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.report && (
                    <Link href={`/mahasiswa/project/history/${item.report.milestoneId}`}>
                      <Button variant="outline" size="sm">
                        Lihat Detail
                      </Button>
                    </Link>
                  )}
                  {item.report?.status === "revision_required" && (
                    <Link href="/mahasiswa/project/upload">
                      <Button variant="secondary" size="sm">
                        Upload Revisi
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
