"use client";

import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { CardHeader, CardTitle, Badge, Button, ProgressBar } from "@/components/ui";
import { useDosenProjectMilestones } from "@/lib/useDosenProjectMilestones";
import type { MilestoneStatus } from "@/lib/dosenProjectMilestoneStorage";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { MENTORING_MILESTONES, getCurrentStage, calculateGroupProgress } from "@/lib/dosenProgressReportsStorage";
import { getAdminGroupStatus, ADMIN_GROUP_STATUS_LABEL, ADMIN_GROUP_STATUS_VARIANT } from "@/lib/adminDashboardData";

const MILESTONE_BADGE: Record<MilestoneStatus, { label: string; variant: "green" | "orange" | "blue" }> = {
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

export default function DosenProjectPage() {
  const { milestones } = useDosenProjectMilestones();
  const { groups } = useDosenSupervisedGroups();
  const { reports } = useDosenProgressReports();

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0 rounded-2xl border border-soft-gray-dark bg-white p-6">
        <CardHeader>
          <CardTitle className="text-lg">Project Active</CardTitle>
          <Link href="/dosen/project/tambah">
            <Button variant="secondary" size="sm">
              Add Project +
            </Button>
          </Link>
        </CardHeader>
        <div className="mt-6 space-y-3">
          {milestones.map((milestone) => {
            const badge = MILESTONE_BADGE[milestone.status];
            return (
              <Link
                key={milestone.id}
                href={`/dosen/project/${milestone.id}`}
                className="block cursor-pointer rounded-2xl border border-soft-gray-dark bg-white p-5 transition-colors hover:border-purple/30 hover:bg-purple/5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{milestone.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Dibuat {formatDate(milestone.createdAt)} &middot; Deadline{" "}
                      {formatDate(milestone.deadline)}
                    </p>
                  </div>
                  <Badge variant={badge.variant} className="shrink-0 self-start sm:self-center">
                    {badge.label}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 rounded-2xl border border-soft-gray-dark bg-white p-6">
        <CardHeader>
          <CardTitle className="text-lg">Kelompok Bimbingan</CardTitle>
          <Link href="/dosen/project/tambah-kelompok">
            <Button variant="secondary" size="sm">
              Add Group +
            </Button>
          </Link>
        </CardHeader>
        <div className="flex flex-col divide-y divide-soft-gray-dark">
          {groups.slice(0, 2).map((group) => {
            const currentStage = getCurrentStage(group.id, MENTORING_MILESTONES, reports);
            const progress = calculateGroupProgress(group.id, MENTORING_MILESTONES, reports);
            const status = getAdminGroupStatus(group.id, MENTORING_MILESTONES, reports);
            return (
              <div
                key={group.id}
                className="grid grid-cols-1 items-center gap-4 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)_auto]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
                    <Users size={20} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{group.code}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{group.umkmName}</p>
                    <p className="mt-0.5 text-xs text-muted">{group.period}</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      Tahap: <span className="font-medium text-navy">{currentStage.title}</span>
                    </span>
                    <Badge variant={ADMIN_GROUP_STATUS_VARIANT[status]}>{ADMIN_GROUP_STATUS_LABEL[status]}</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <ProgressBar value={progress} showLabel={false} className="flex-1" />
                    <span className="w-10 shrink-0 text-right text-sm font-semibold text-navy">{progress}%</span>
                  </div>
                </div>

                <Link href={`/dosen/project/kelompok/${group.id}`} className="shrink-0">
                  <Button variant="outline" size="sm" className="w-full lg:w-auto">
                    Detail
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end border-t border-soft-gray-dark pt-4">
          <Link
            href="/dosen/project/kelompok"
            className="flex items-center gap-1 text-sm font-semibold text-purple hover:text-purple-dark"
          >
            Lihat seluruh kelompok
            <ChevronRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
