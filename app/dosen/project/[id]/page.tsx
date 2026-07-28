"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Badge, Button } from "@/components/ui";
import { useDosenProjectMilestones } from "@/lib/useDosenProjectMilestones";
import type { MilestoneStatus } from "@/lib/dosenProjectMilestoneStorage";

const STATUS_BADGE: Record<MilestoneStatus, { label: string; variant: "green" | "orange" | "blue" }> = {
  done: { label: "Selesai", variant: "green" },
  progress: { label: "Berjalan", variant: "orange" },
  todo: { label: "Belum Dimulai", variant: "blue" },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DetailProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { milestones, isHydrated } = useDosenProjectMilestones();

  if (!isHydrated) {
    return null;
  }

  const milestone = milestones.find((m) => m.id === id);
  if (!milestone) {
    notFound();
  }

  const badge = STATUS_BADGE[milestone.status];

  return (
    <div>
      <PageHeader
        title="Detail Project"
        actions={
          <Link href="/dosen/project">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Project
            </Button>
          </Link>
        }
      />

      <Card className="min-w-0 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-navy">{milestone.title}</h2>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-navy">{milestone.description}</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">Tanggal Dibuat</p>
            <p className="mt-1 text-sm font-medium text-navy">{formatDate(milestone.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Deadline</p>
            <p className="mt-1 text-sm font-medium text-navy">{formatDate(milestone.deadline)}</p>
          </div>
        </div>

        <div className="my-6 h-px bg-soft-gray-dark" />

        <p className="text-sm font-semibold text-navy">File Materi</p>
        {milestone.materialFile ? (
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-soft-gray-dark bg-soft-gray p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
                <FileText size={20} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-navy">{milestone.materialFile.name}</p>
                <p className="text-xs text-muted">{formatFileSize(milestone.materialFile.size)}</p>
              </div>
            </div>
            {milestone.materialFile.dataUrl ? (
              <a href={milestone.materialFile.dataUrl} download={milestone.materialFile.name}>
                <Button variant="outline" size="sm">
                  <Download size={14} strokeWidth={2} />
                  Unduh File
                </Button>
              </a>
            ) : (
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <Button variant="outline" size="sm" disabled>
                  <Download size={14} strokeWidth={2} />
                  Unduh File
                </Button>
                <span className="text-xs text-muted">File contoh — belum tersedia untuk diunduh.</span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Tidak ada file materi.</p>
        )}
      </Card>
    </div>
  );
}
