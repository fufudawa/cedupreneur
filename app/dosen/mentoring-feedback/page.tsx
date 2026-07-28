"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, FileText, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Badge, Button, Input, Select, ProgressBar, FilterToolbar } from "@/components/ui";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import {
  MENTORING_MILESTONES,
  getCurrentStage,
  calculateGroupProgress,
  getGroupMentoringStatus,
  GROUP_STATUS_LABEL,
  GROUP_STATUS_BADGE_VARIANT,
} from "@/lib/dosenProgressReportsStorage";
import type { GroupMentoringStatus } from "@/lib/dosenProgressReportsStorage";

const STAGE_OPTIONS = [
  { value: "all", label: "Semua Tahap" },
  ...MENTORING_MILESTONES.map((milestone) => ({ value: milestone.id, label: milestone.title })),
];

const STATUS_OPTIONS: { value: "all" | GroupMentoringStatus; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "waiting", label: "Menunggu Feedback" },
  { value: "incomplete", label: "Belum Tuntas" },
  { value: "completed", label: "Tuntas" },
];

export default function DosenMentoringFeedbackPage() {
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const isHydrated = groupsHydrated && reportsHydrated;

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | GroupMentoringStatus>("all");

  const rows = useMemo(
    () =>
      groups.map((group) => ({
        group,
        currentStage: getCurrentStage(group.id, MENTORING_MILESTONES, reports),
        progress: calculateGroupProgress(group.id, MENTORING_MILESTONES, reports),
        status: getGroupMentoringStatus(group.id, MENTORING_MILESTONES, reports),
        totalReports: reports.filter((r) => r.groupId === group.id).length,
      })),
    [groups, reports]
  );

  // Summary counts kelompok, not laporan — a group with 2 "submitted" reports still counts once.
  const totalWaiting = rows.filter((r) => r.status === "waiting").length;
  const totalIncomplete = rows.filter((r) => r.status === "incomplete").length;
  const totalCompleted = rows.filter((r) => r.status === "completed").length;

  const filtered = rows.filter(({ group, currentStage, status }) => {
    const keyword = search.toLowerCase();
    const matchSearch =
      keyword === "" ||
      group.name.toLowerCase().includes(keyword) ||
      group.code.toLowerCase().includes(keyword) ||
      group.className.toLowerCase().includes(keyword) ||
      group.umkmName.toLowerCase().includes(keyword);
    const matchStage = stageFilter === "all" || currentStage.id === stageFilter;
    const matchStatus = statusFilter === "all" || status === statusFilter;
    return matchSearch && matchStage && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Mentoring"
        description="Pantau progress dan berikan bimbingan kepada kelompok mahasiswa."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Kelompok Bimbingan"
          value={groups.length}
          icon={<Users size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
        />
        <StatCard
          label="Menunggu Feedback"
          value={totalWaiting}
          icon={<MessageSquare size={22} strokeWidth={2} />}
          iconClassName="bg-orange/10 text-orange"
        />
        <StatCard
          label="Belum Tuntas"
          value={totalIncomplete}
          icon={<AlertCircle size={22} strokeWidth={2} />}
          iconClassName="bg-pink/10 text-pink"
        />
        <StatCard
          label="Tuntas"
          value={totalCompleted}
          icon={<CheckCircle2 size={22} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
        />
      </div>

      <FilterToolbar className="mb-6">
        <Input
          id="search-mentoring"
          placeholder="Cari kelompok, kelas, atau UMKM..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-[300px]"
        />
        <Select
          id="filter-tahap"
          options={STAGE_OPTIONS}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="w-full sm:w-[200px]"
        />
        <Select
          id="filter-status"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | GroupMentoringStatus)}
          className="w-full sm:w-[190px]"
        />
      </FilterToolbar>

      <div className="min-w-0 rounded-2xl border border-soft-gray-dark bg-white p-6">
        {!isHydrated ? null : groups.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-navy">Belum ada kelompok bimbingan</p>
            <p className="mt-1 text-sm text-muted">
              Kelompok yang ditambahkan melalui menu Project akan muncul di sini.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-navy">Kelompok tidak ditemukan</p>
            <p className="mt-1 text-sm text-muted">Coba ubah kata pencarian atau filter yang digunakan.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-soft-gray-dark">
            {filtered.map(({ group, currentStage, progress, status, totalReports }) => (
              <div
                key={group.id}
                className="grid grid-cols-1 items-center gap-4 py-5 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_minmax(200px,240px)_minmax(160px,200px)]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
                    <Users size={20} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{group.code}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{group.umkmName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {group.studyProgram} &middot; {group.className}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{group.members.length} Anggota</p>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    Tahap: <span className="font-medium text-navy">{currentStage.title}</span>
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <ProgressBar value={progress} showLabel={false} className="flex-1" />
                    <span className="w-10 shrink-0 text-right text-sm font-semibold text-navy">{progress}%</span>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <FileText size={14} strokeWidth={2} />
                    {totalReports} Laporan
                  </div>
                  <Badge variant={GROUP_STATUS_BADGE_VARIANT[status]}>{GROUP_STATUS_LABEL[status]}</Badge>
                  <Link href={`/dosen/mentoring-feedback/${group.id}`} className="w-full lg:w-auto">
                    <Button variant="secondary" size="sm" className="w-full lg:w-auto">
                      Lihat Mentoring
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
