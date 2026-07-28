"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Download, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Badge, Button, Textarea, ProgressBar } from "@/components/ui";
import {
  MENTORING_MILESTONES,
  getMilestoneReport,
  getCurrentStage,
  calculateGroupProgress,
  getDeadlineState,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_BADGE_VARIANT,
  type ProgressReport,
} from "@/lib/dosenProgressReportsStorage";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { useDosenFeedback } from "@/lib/useDosenFeedback";
import { createFeedbackId, type CompletionStatus, type FeedbackEntry } from "@/lib/dosenFeedbackStorage";

/**
 * Resolves which completion-status radio should be checked for a given
 * report, prioritizing its latest feedback entry (if any) over the report's
 * own status field — the two should always agree by construction, but this
 * keeps the radio correct even if they ever diverge.
 */
function resolveCompletionStatus(
  report: ProgressReport | null,
  latestFeedback?: FeedbackEntry
): CompletionStatus | "" {
  if (!report) return "";
  if (report.status === "revision_required" || latestFeedback?.completionStatus === "incomplete") {
    return "incomplete";
  }
  if (report.status === "approved" || latestFeedback?.completionStatus === "complete") {
    return "complete";
  }
  return "";
}

const FEEDBACK_MAX_LENGTH = 1000;
const FEEDBACK_MIN_LENGTH = 5;
const LECTURER_ID = "dosen-ridwan";
const LECTURER_NAME = "Ridwan";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function DosenMentoringDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated, updateReport } = useDosenProgressReports();
  const { feedbacks, isHydrated: feedbackHydrated, addFeedback } = useDosenFeedback();
  const isHydrated = groupsHydrated && reportsHydrated && feedbackHydrated;

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [completionStatus, setCompletionStatus] = useState<CompletionStatus | "">("");
  const [touched, setTouched] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const group = groups.find((g) => g.id === id);
  const groupId = group?.id ?? "";
  const currentStage = getCurrentStage(groupId, MENTORING_MILESTONES, reports);
  const activeMilestoneId = selectedMilestoneId ?? currentStage.id;
  const activeReport = getMilestoneReport(groupId, activeMilestoneId, reports);
  const latestFeedback = feedbacks
    .filter((f) => f.reportId === activeReport?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberately re-synchronizing the form (radio + textarea) whenever the active report/its latest decision changes (switching milestones/groups, or a feedback submission changing the report's own status); not a one-time hydration effect.
    setCompletionStatus(resolveCompletionStatus(activeReport, latestFeedback));
    setContent("");
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed only on the active report's identity/status (+ its latest feedback decision), not on every reports/feedbacks array change, so this only re-syncs when the dosen switches milestones/groups or the active report's own outcome changes.
  }, [activeReport?.id, activeReport?.status, latestFeedback?.id]);

  if (!isHydrated) {
    return null;
  }
  if (!group) {
    notFound();
  }

  const groupReports = reports.filter((r) => r.groupId === group.id);
  const progress = calculateGroupProgress(group.id, MENTORING_MILESTONES, reports);

  const waitingCount = groupReports.filter((r) => r.status === "submitted").length;
  const revisionCount = groupReports.filter((r) => r.status === "revision_required").length;
  const approvedCount = groupReports.filter((r) => r.status === "approved").length;
  const allApproved = groupReports.length === MENTORING_MILESTONES.length && approvedCount === groupReports.length;

  // Guarded fallback: activeMilestoneId always comes from a real MENTORING_MILESTONES id in practice
  // (currentStage.id or a click from the list below), but this avoids a throw if that ever drifts.
  const activeMilestone = MENTORING_MILESTONES.find((m) => m.id === activeMilestoneId) ?? MENTORING_MILESTONES[0];

  const reportFeedbacks = activeReport
    ? feedbacks
        .filter((f) => f.reportId === activeReport.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  const errors = {
    content: content.trim().length < FEEDBACK_MIN_LENGTH ? "Feedback wajib diisi." : null,
    completionStatus: completionStatus === "" ? "Pilih status penyelesaian tugas." : null,
  };
  const isValid = Object.values(errors).every((message) => message === null);

  const handleSelectMilestone = (milestoneId: string) => {
    setSelectedMilestoneId(milestoneId);
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid || !activeReport || completionStatus === "") return;

    addFeedback({
      id: createFeedbackId(activeReport.id),
      reportId: activeReport.id,
      groupId: group.id,
      giverId: LECTURER_ID,
      giverName: LECTURER_NAME,
      giverRole: "dosen",
      content: content.trim(),
      completionStatus,
      createdAt: new Date().toISOString(),
    });
    updateReport(activeReport.id, { status: completionStatus === "incomplete" ? "revision_required" : "approved" });

    setContent("");
    setTouched(false);
    setToast("Feedback berhasil dikirim.");
    setTimeout(() => setToast(null), 2500);
  };

  const isApproved = activeReport?.status === "approved";
  const isRevision = activeReport?.status === "revision_required";
  const submitLabel = isApproved ? "Tambah Feedback" : isRevision ? "Perbarui Feedback" : "Kirim Feedback";

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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="text-xs text-muted">Progress</p>
            <p className="mt-1 text-lg font-bold text-navy">{progress}%</p>
          </div>
          <div>
            <p className="text-xs text-muted">Tahap Saat Ini</p>
            <p className="mt-1 text-sm font-semibold text-navy">{currentStage.title}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Total Laporan</p>
            <p className="mt-1 text-lg font-bold text-navy">{groupReports.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Menunggu Feedback</p>
            <p className="mt-1 text-lg font-bold text-orange">{waitingCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Belum Tuntas</p>
            <p className="mt-1 text-lg font-bold text-pink">{revisionCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Tuntas</p>
            <p className="mt-1 text-lg font-bold text-green-700">{approvedCount}</p>
          </div>
        </div>
        <ProgressBar value={progress} showLabel={false} className="mt-4" />
        {allApproved && (
          <p className="mt-3 text-sm font-medium text-green-700">
            Seluruh laporan kelompok telah dinyatakan tuntas.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-2xl border border-soft-gray-dark bg-white p-4">
          <h3 className="px-2 text-sm font-semibold text-navy">Tahapan Project</h3>
          <div className="mt-3 flex flex-col gap-2">
            {MENTORING_MILESTONES.map((milestone) => {
              const report = getMilestoneReport(group.id, milestone.id, reports);
              const status = report?.status ?? "not_submitted";
              const isSelected = milestone.id === activeMilestoneId;
              return (
                <button
                  key={milestone.id}
                  type="button"
                  onClick={() => handleSelectMilestone(milestone.id)}
                  className={`min-w-0 rounded-xl border p-3 text-left transition-colors ${
                    isSelected ? "border-purple bg-purple/5" : "border-soft-gray-dark bg-white hover:bg-soft-gray"
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-navy">{milestone.title}</p>
                  {report ? (
                    <p className="mt-0.5 truncate text-xs text-muted">{report.fileName}</p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted">Deadline {formatDate(milestone.deadline)}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {report ? formatDateTime(report.submittedAt) : ""}
                    </span>
                    <Badge variant={REPORT_STATUS_BADGE_VARIANT[status]}>{REPORT_STATUS_LABEL[status]}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex flex-col gap-6">
          {activeReport ? (
            <>
              <Card className="min-w-0 rounded-2xl p-6">
                <p className="text-lg font-bold text-navy">{activeMilestone.title}</p>
                <p className="mt-0.5 text-sm text-muted">{activeReport.fileName}</p>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-soft-gray-dark bg-soft-gray p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
                      <FileText size={20} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy">{activeReport.fileName}</p>
                      <p className="text-xs text-muted">{activeReport.fileType}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <Button variant="outline" size="sm" disabled>
                      <Download size={14} strokeWidth={2} />
                      Buka File
                    </Button>
                    <span className="text-xs text-muted">File contoh belum tersedia untuk diunduh.</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                  <span>
                    Diunggah oleh: <span className="font-medium text-navy">{activeReport.submittedBy}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={14} strokeWidth={2} />
                    {formatDateTime(activeReport.submittedAt)}
                  </span>
                  {activeReport.revisionNumber && activeReport.revisionNumber > 1 && (
                    <span>Revisi ke-{activeReport.revisionNumber}</span>
                  )}
                </div>

                {activeReport.comment && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted">Komentar Kelompok</p>
                    <p className="mt-1 text-sm text-navy">{activeReport.comment}</p>
                  </div>
                )}
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

                  <div>
                    <p className="text-sm font-medium text-navy">
                      Apakah tugas tersebut sudah tuntas sesuai kriteria penilaian?
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
                      <label className="flex items-center gap-2 text-sm text-navy">
                        <input
                          type="radio"
                          name="completionStatus"
                          checked={completionStatus === "incomplete"}
                          onChange={() => setCompletionStatus("incomplete")}
                          className="h-4 w-4 accent-purple"
                        />
                        Belum Tuntas
                      </label>
                      <label className="flex items-center gap-2 text-sm text-navy">
                        <input
                          type="radio"
                          name="completionStatus"
                          checked={completionStatus === "complete"}
                          onChange={() => setCompletionStatus("complete")}
                          className="h-4 w-4 accent-purple"
                        />
                        Tuntas
                      </label>
                    </div>
                    {touched && errors.completionStatus && (
                      <p className="mt-1.5 text-xs text-pink">{errors.completionStatus}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="secondary">
                      {submitLabel}
                    </Button>
                  </div>
                </form>
              </Card>

              <Card className="min-w-0 rounded-2xl p-6">
                <p className="text-base font-semibold text-navy">Riwayat Feedback</p>
                {reportFeedbacks.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Belum ada feedback untuk laporan ini.</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {reportFeedbacks.map((feedback) => (
                      <div key={feedback.id} className="rounded-xl border border-soft-gray-dark p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-navy">{feedback.giverName}</p>
                            <p className="text-xs text-muted">Dosen &middot; {formatDateTime(feedback.createdAt)}</p>
                          </div>
                          <Badge variant={feedback.completionStatus === "complete" ? "green" : "pink"}>
                            {feedback.completionStatus === "complete" ? "Tuntas" : "Belum Tuntas"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-navy">{feedback.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <Card className="min-w-0 rounded-2xl p-6">
              <p className="text-lg font-bold text-navy">{activeMilestone.title}</p>
              {activeMilestone.description && (
                <p className="mt-2 text-sm text-navy">{activeMilestone.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                <span>Dibuat: {formatDate(activeMilestone.createdAt)}</span>
                <span>
                  Deadline: {formatDate(activeMilestone.deadline)}{" "}
                  {getDeadlineState(activeMilestone.deadline) === "overdue" && (
                    <span className="font-medium text-pink">(Lewat deadline)</span>
                  )}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted">Belum ada laporan yang dikirim untuk tahap ini.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
