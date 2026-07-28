"use client";

import { useState } from "react";
import { Card, CardTitle, Badge, Button } from "@/components/ui";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { useDosenFeedback } from "@/lib/useDosenFeedback";
import { getStudentFacingStatusMessage, shouldShowRevisionCta } from "@/lib/dosenProgressReportsStorage";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Reads the same cedupreneur_progress_reports / cedupreneur_feedbacks stores
 * the Dosen Mentoring pages use, matched by milestoneId, and renders the
 * dosen's feedback for this milestone. Purely additive — doesn't touch any
 * existing content on the History Detail page.
 */
export function FeedbackDosenSection({ groupId, milestoneId }: { groupId: string; milestoneId: string }) {
  const { reports, isHydrated: reportsHydrated, updateReport } = useDosenProgressReports();
  const { feedbacks, isHydrated: feedbackHydrated } = useDosenFeedback();
  const [justSentRevision, setJustSentRevision] = useState(false);

  if (!reportsHydrated || !feedbackHydrated) return null;

  const report = reports.find((r) => r.groupId === groupId && r.milestoneId === milestoneId);
  if (!report) {
    return (
      <Card className="rounded-2xl p-6">
        <CardTitle className="text-lg">Feedback Dosen</CardTitle>
        <p className="mt-3 text-sm text-muted">Belum ada laporan yang dikirim untuk tahap ini.</p>
      </Card>
    );
  }

  const reportFeedbacks = feedbacks
    .filter((f) => f.reportId === report.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleKirimRevisi = () => {
    updateReport(report.id, {
      status: "submitted",
      submittedAt: new Date().toISOString(),
      revisionNumber: (report.revisionNumber ?? 1) + 1,
    });
    setJustSentRevision(true);
  };

  return (
    <Card className="rounded-2xl p-6">
      <CardTitle className="text-lg">Feedback Dosen</CardTitle>
      <p className="mt-2 text-sm text-muted">{getStudentFacingStatusMessage(report.status)}</p>
      {report.revisionNumber && report.revisionNumber > 1 && (
        <p className="mt-1 text-xs text-muted">Revisi ke-{report.revisionNumber}</p>
      )}

      {reportFeedbacks.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Belum ada feedback untuk laporan ini.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {reportFeedbacks.map((feedback) => (
            <div key={feedback.id} className="rounded-2xl border border-soft-gray-dark p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-navy">{feedback.giverName}</p>
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

      {shouldShowRevisionCta(report.status) && !justSentRevision && (
        <Button variant="secondary" className="mt-5" onClick={handleKirimRevisi}>
          Kirim Revisi
        </Button>
      )}
      {justSentRevision && (
        <p className="mt-5 rounded-xl bg-green-100 px-3.5 py-2 text-sm font-medium text-green-700">
          Revisi berhasil dikirim. Laporan kini menunggu feedback dosen.
        </p>
      )}
    </Card>
  );
}
