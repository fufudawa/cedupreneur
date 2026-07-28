"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Eye, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, Textarea, Button, Badge } from "@/components/ui";
import { ValidasiBadge } from "@/components/shared";
import type { SupervisedGroup } from "@/lib/dosenGroupsStorage";
import type { ProgressReport, ProjectMilestone } from "@/lib/dosenProgressReportsStorage";
import { formatFeedbackTimestamp } from "@/lib/umkmFeedbackStorage";
import { useUmkmFeedback } from "@/lib/useUmkmFeedback";

const FEEDBACK_MAX_LENGTH = 1000;

interface MentoringDetailClientProps {
  group: SupervisedGroup;
  milestone: ProjectMilestone;
  report: ProgressReport;
  umkmId: string;
  umkmName: string;
}

export function MentoringDetailClient({ group, milestone, report, umkmId, umkmName }: MentoringDetailClientProps) {
  const { latest, history, submit } = useUmkmFeedback({
    reportId: report.id,
    groupId: group.id,
    milestoneId: milestone.id,
    pemberiId: umkmId,
    pemberiNama: umkmName,
  });

  const [form, setForm] = useState<{ isiFeedback: string; statusValidasi: "tuntas" | "belum_tuntas" | null }>({
    isiFeedback: "",
    statusValidasi: null,
  });
  const { isiFeedback, statusValidasi } = form;
  const [showPreview, setShowPreview] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const canSubmit = isiFeedback.trim() !== "" && statusValidasi !== null;

  const handleSubmit = () => {
    if (!canSubmit || statusValidasi === null) return;
    submit(isiFeedback.trim(), statusValidasi);
    setForm({ isiFeedback: "", statusValidasi: null });
    setJustSubmitted(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/umkm/mentoring/${group.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-purple hover:underline"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Kembali ke Mentoring
        </Link>
        <h1 className="mt-3 text-xl font-bold text-navy">{group.code}</h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <span>
            Kelompok pengunggah: <span className="font-medium text-navy">{report.submittedBy}</span>
          </span>
          <span>
            Tahap: <span className="font-medium text-navy">{milestone.title}</span>
          </span>
          <span>
            Tanggal submit:{" "}
            <span className="font-medium text-navy">
              {new Date(report.submittedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </span>
          <span>
            UMKM pendamping: <span className="font-medium text-navy">{group.umkmName}</span>
          </span>
        </div>
      </div>

      <Card className="rounded-2xl p-5">
        <CardHeader>
          <CardTitle>File Laporan</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
              <FileText size={22} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy">{report.fileName}</p>
              <p className="text-xs text-muted">{report.fileType}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
              <Eye size={16} strokeWidth={2} />
              Preview
            </Button>
            <Button variant="outline" size="sm" disabled title="Belum terhubung ke file asli (belum ada backend)">
              <Download size={16} strokeWidth={2} />
              Download
            </Button>
          </div>
        </div>
        {showPreview && (
          <div className="mt-4 rounded-xl border border-dashed border-soft-gray-dark bg-soft-gray p-4 text-sm text-muted">
            Pratinjau dummy — {report.fileName} belum terhubung ke file asli karena backend belum tersedia.
          </div>
        )}
      </Card>

      {report.comment && (
        <Card className="rounded-2xl p-5">
          <CardHeader>
            <CardTitle>Komentar Kelompok</CardTitle>
          </CardHeader>
          <p className="text-sm text-navy">{report.comment}</p>
        </Card>
      )}

      {latest && (
        <Card className="rounded-2xl p-5">
          <CardHeader>
            <CardTitle>Feedback Terbaru</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <ValidasiBadge status={latest.statusValidasi} />
            <span className="text-xs text-muted">
              {latest.pemberiNama} &middot; {formatFeedbackTimestamp(latest.createdAt)}
            </span>
          </div>
          <p className="mt-2 text-sm text-navy">{latest.isiFeedback}</p>
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
            setForm((f) => ({ ...f, isiFeedback: e.target.value.slice(0, FEEDBACK_MAX_LENGTH) }));
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
                  setForm((f) => ({ ...f, statusValidasi: "belum_tuntas" }));
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
                  setForm((f) => ({ ...f, statusValidasi: "tuntas" }));
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

        {justSubmitted && (
          <p className="mt-4 rounded-xl bg-green-100 px-3.5 py-2 text-sm font-medium text-green-700">
            Feedback berhasil dikirim
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Link href={`/umkm/mentoring/${group.id}`}>
            <Button variant="outline">Batal</Button>
          </Link>
          <Button variant="secondary" disabled={!canSubmit} onClick={handleSubmit}>
            {latest ? "Kirim Feedback Baru" : "Kirim Feedback"}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl p-5">
        <CardHeader>
          <CardTitle>Riwayat Feedback UMKM</CardTitle>
        </CardHeader>
        {history.length === 0 ? (
          <p className="text-sm text-muted">Belum ada feedback dari UMKM.</p>
        ) : (
          <div className="flex flex-col">
            {history.map((feedback) => (
              <div key={feedback.id} className="border-b border-soft-gray-dark py-4 first:pt-0 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-navy">{feedback.pemberiNama}</p>
                    {feedback.revisionNumber && <Badge variant="gray">Ke-{feedback.revisionNumber}</Badge>}
                  </div>
                  <ValidasiBadge status={feedback.statusValidasi} />
                </div>
                <p className="mt-1 text-xs text-muted">{formatFeedbackTimestamp(feedback.createdAt)}</p>
                <p className="mt-1 text-sm text-navy">{feedback.isiFeedback}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
