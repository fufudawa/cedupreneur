"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Input, Select, Button, Badge, FilterToolbar } from "@/components/ui";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import {
  MENTORING_MILESTONES,
  REPORT_STATUS_LABEL,
  REPORT_STATUS_BADGE_VARIANT,
  type ReportStatus,
} from "@/lib/dosenProgressReportsStorage";
import { getCurrentDemoUser, getActiveMahasiswaGroup } from "@/lib/demoSession";

const STATUS_OPTIONS: { value: "all" | ReportStatus; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "submitted", label: "Menunggu Feedback" },
  { value: "revision_required", label: "Belum Tuntas" },
  { value: "approved", label: "Tuntas" },
];

function formatDateTime(iso: string) {
  const date = new Date(iso);
  return {
    date: date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function ProjectHistoryPage() {
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const isHydrated = groupsHydrated && reportsHydrated;

  const [search, setSearch] = useState("");
  const [tahapFilter, setTahapFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");

  if (!isHydrated) {
    return null;
  }

  const activeUser = getCurrentDemoUser("mahasiswa");
  const activeGroup = activeUser ? getActiveMahasiswaGroup(activeUser, groups) : undefined;

  const tahapOptions = [
    { value: "all", label: "Semua Tahap" },
    ...MENTORING_MILESTONES.map((m) => ({ value: m.id, label: m.title })),
  ];

  const groupReports = activeGroup ? reports.filter((r) => r.groupId === activeGroup.id) : [];

  const filtered = groupReports
    .filter((report) => {
      const matchSearch = report.fileName.toLowerCase().includes(search.toLowerCase());
      const matchTahap = tahapFilter === "all" || report.milestoneId === tahapFilter;
      const matchStatus = statusFilter === "all" || report.status === statusFilter;
      return matchSearch && matchTahap && matchStatus;
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return (
    <div>
      <PageHeader
        title="Riwayat Upload Progress"
        description="Lihat seluruh file progress yang pernah dikirim oleh kelompok."
        actions={
          <Link href="/mahasiswa/project">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke My Project
            </Button>
          </Link>
        }
      />

      {!activeGroup ? (
        <Card className="rounded-2xl p-10 text-center text-sm text-muted">
          Anda belum terhubung dengan kelompok manapun.
        </Card>
      ) : (
        <>
          <FilterToolbar className="mb-6">
            <Input
              id="search-history"
              placeholder="Cari nama file..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-[300px]"
            />
            <Select
              id="filter-tahap"
              options={tahapOptions}
              value={tahapFilter}
              onChange={(e) => setTahapFilter(e.target.value)}
              className="w-full sm:w-[190px]"
            />
            <Select
              id="filter-status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | ReportStatus)}
              className="w-full sm:w-[170px]"
            />
          </FilterToolbar>

          <Card className="rounded-2xl p-5">
            <div className="divide-y divide-soft-gray-dark">
              {filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-muted">
                  Tidak ada file yang cocok dengan pencarian/filter.
                </p>
              )}
              {filtered.map((report) => {
                const { date, time } = formatDateTime(report.submittedAt);
                return (
                  <div
                    key={report.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple/10 text-purple">
                        <FileText size={18} strokeWidth={2} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-navy">{report.fileName}</p>
                        <p className="text-xs text-muted">
                          {report.milestoneTitle} &middot; Diunggah oleh {report.submittedBy}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {date}, {time} &middot; {report.fileType}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 pl-[52px] sm:pl-0">
                      <Badge variant={REPORT_STATUS_BADGE_VARIANT[report.status]}>
                        {REPORT_STATUS_LABEL[report.status]}
                      </Badge>
                      <Link href={`/mahasiswa/project/history/${report.milestoneId}`}>
                        <Button variant="outline" size="sm">
                          Lihat Detail
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
