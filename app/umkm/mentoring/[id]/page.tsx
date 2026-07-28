"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, MessageSquare, CheckCircle2, Users, Layers } from "lucide-react";
import { PageHeader, StatCard, ValidasiBadge } from "@/components/shared";
import { Card, Badge, Button, Input, Select, FilterToolbar } from "@/components/ui";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { MENTORING_MILESTONES, getMilestoneReport } from "@/lib/dosenProgressReportsStorage";
import { formatActivityDateTime as formatDateTime } from "@/lib/adminDashboardData";
import { getLatestUmkmFeedbackByReport, type LaporanValidasiStatus } from "@/lib/umkmFeedbackStorage";
import { getCurrentDemoUser, getActiveUmkmGroups } from "@/lib/demoSession";

type LaporanStatusFeedback = "sudah_diberi_feedback" | "menunggu_feedback" | "belum_dikirim";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "belum_tuntas", label: "Perlu Penyesuaian" },
  { value: "tuntas", label: "Sesuai" },
];

const FEEDBACK_FILTER_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "menunggu_feedback", label: "Menunggu feedback" },
  { value: "sudah_diberi_feedback", label: "Sudah diberi feedback" },
  { value: "belum_dikirim", label: "Belum dikirim" },
];

const FEEDBACK_BADGE_LABEL: Record<LaporanStatusFeedback, string> = {
  sudah_diberi_feedback: "Sudah diberi feedback",
  menunggu_feedback: "Menunggu feedback",
  belum_dikirim: "Belum dikirim",
};

const FEEDBACK_BADGE_VARIANT: Record<LaporanStatusFeedback, "purple" | "orange" | "gray"> = {
  sudah_diberi_feedback: "purple",
  menunggu_feedback: "orange",
  belum_dikirim: "gray",
};

export default function UmkmMentoringGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const isHydrated = groupsHydrated && reportsHydrated;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [feedbackFilter, setFeedbackFilter] = useState("all");

  if (!isHydrated) {
    return null;
  }

  const group = groups.find((g) => g.id === id);
  if (!group) {
    notFound();
  }

  const activeUser = getCurrentDemoUser("umkm");
  const activeGroups = activeUser ? getActiveUmkmGroups(activeUser, groups) : [];
  const isOwner = activeGroups.some((g) => g.id === group.id);

  // A UMKM cannot open another UMKM's kelompok just by changing the URL.
  if (!isOwner) {
    notFound();
  }

  const rows = MENTORING_MILESTONES.map((milestone) => {
    const report = getMilestoneReport(group.id, milestone.id, reports);
    const feedback = report ? getLatestUmkmFeedbackByReport(report.id) : null;
    const statusValidasi: LaporanValidasiStatus = feedback?.statusValidasi ?? "belum_tuntas";
    const statusFeedback: LaporanStatusFeedback = !report
      ? "belum_dikirim"
      : feedback
        ? "sudah_diberi_feedback"
        : "menunggu_feedback";
    return { milestone, report, statusValidasi, statusFeedback };
  });

  const totalLaporan = rows.filter((r) => r.report !== null).length;
  const menungguFeedback = rows.filter((r) => r.statusFeedback === "menunggu_feedback").length;
  const sudahDivalidasi = rows.filter((r) => r.statusFeedback === "sudah_diberi_feedback").length;

  const filtered = rows.filter(({ milestone, report, statusValidasi, statusFeedback }) => {
    const keyword = search.toLowerCase();
    const matchSearch =
      keyword === "" ||
      milestone.title.toLowerCase().includes(keyword) ||
      (report?.fileName ?? "").toLowerCase().includes(keyword);
    const matchStatus = statusFilter === "all" || statusValidasi === statusFilter;
    const matchFeedback = feedbackFilter === "all" || statusFeedback === feedbackFilter;
    return matchSearch && matchStatus && matchFeedback;
  });

  return (
    <div>
      <PageHeader
        title="Mentoring"
        description="Lihat progress dan berikan validasi untuk laporan kelompok mahasiswa."
        actions={
          <Link href="/umkm/mentoring">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Daftar Kelompok
            </Button>
          </Link>
        }
      />

      <Card className="mb-6 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-navy">{group.code}</h2>
        <p className="mt-1 text-sm text-muted">
          Laporan progress kelompok yang terhubung dengan {group.umkmName}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="gray">
            <Users size={12} strokeWidth={2} className="mr-1" />
            {group.members.length} Anggota
          </Badge>
          <Badge variant="gray">
            <Layers size={12} strokeWidth={2} className="mr-1" />
            {MENTORING_MILESTONES.length} Tahap Project
          </Badge>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Laporan"
          value={totalLaporan}
          icon={<FileText size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
        />
        <StatCard
          label="Menunggu Feedback"
          value={menungguFeedback}
          icon={<MessageSquare size={22} strokeWidth={2} />}
          iconClassName="bg-orange/10 text-orange"
          valueClassName="mt-1 text-2xl font-bold text-orange"
        />
        <StatCard
          label="Sudah Divalidasi"
          value={sudahDivalidasi}
          icon={<CheckCircle2 size={22} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
          valueClassName="mt-1 text-2xl font-bold text-green-700"
        />
      </div>

      <FilterToolbar className="mb-6">
        <Input
          id="search-mentoring"
          placeholder="Cari tahap / nama file..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-[300px]"
        />
        <Select
          id="filter-status"
          options={STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-[150px]"
        />
        <Select
          id="filter-feedback"
          options={FEEDBACK_FILTER_OPTIONS}
          value={feedbackFilter}
          onChange={(e) => setFeedbackFilter(e.target.value)}
          className="w-full sm:w-[200px]"
        />
      </FilterToolbar>

      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <Card className="rounded-2xl p-8 text-center text-sm text-muted">
            Tidak ada laporan yang cocok dengan pencarian/filter.
          </Card>
        ) : (
          filtered.map(({ milestone, report, statusValidasi, statusFeedback }) => {
            const isDisabled = statusFeedback === "belum_dikirim";
            return (
              <Card key={milestone.id} className="min-w-0 rounded-2xl p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-navy">{milestone.title}</h3>
                      <ValidasiBadge status={statusValidasi} />
                      <Badge variant={FEEDBACK_BADGE_VARIANT[statusFeedback]}>
                        {FEEDBACK_BADGE_LABEL[statusFeedback]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-navy">
                      Diunggah oleh <span className="font-medium">{report?.submittedBy ?? group.name}</span>
                    </p>
                    <p className="mt-1 truncate text-sm text-muted">
                      {report?.fileName ?? "Belum ada file"} &middot;{" "}
                      {report ? formatDateTime(report.submittedAt) : "-"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1 lg:items-end">
                    {isDisabled ? (
                      <Button variant="secondary" className="w-full lg:w-auto" disabled>
                        Lihat & Beri Feedback
                      </Button>
                    ) : (
                      <Link href={`/umkm/mentoring/${group.id}/${milestone.id}`} className="shrink-0">
                        <Button variant="secondary" className="w-full lg:w-auto">
                          {statusFeedback === "sudah_diberi_feedback"
                            ? "Lihat / Perbarui Feedback"
                            : "Lihat & Beri Feedback"}
                        </Button>
                      </Link>
                    )}
                    {isDisabled && <span className="text-xs text-muted">Belum ada laporan</span>}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
