"use client";

import { useState } from "react";
import Link from "next/link";
import { UserRound, MessageSquare, CheckCircle2, FileText, Users } from "lucide-react";
import { StatCard } from "@/components/shared";
import { Card, CardTitle, Timeline, Select } from "@/components/ui";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { MENTORING_MILESTONES, getMilestoneReport, calculateGroupProgress, getCurrentStage } from "@/lib/dosenProgressReportsStorage";
import { getLatestUmkmFeedbackByReport } from "@/lib/umkmFeedbackStorage";
import { getCurrentDemoUser, getActiveUmkmGroups } from "@/lib/demoSession";

type TimelineStatus = "selesai" | "proses" | "belum";

function reportToTimelineStatus(status: string | undefined): TimelineStatus {
  if (status === "approved") return "selesai";
  if (status === "submitted" || status === "revision_required") return "proses";
  return "belum";
}

export default function UmkmDashboardPage() {
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const isHydrated = groupsHydrated && reportsHydrated;

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  if (!isHydrated) {
    return null;
  }

  const activeUser = getCurrentDemoUser("umkm");
  const activeGroups = activeUser ? getActiveUmkmGroups(activeUser, groups) : [];

  if (activeGroups.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl p-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple/10 text-purple">
          <Users size={24} strokeWidth={2} />
        </span>
        <p className="text-sm font-semibold text-navy">Belum ada kelompok yang terhubung dengan UMKM Anda.</p>
      </Card>
    );
  }

  // Falls back to the first active group whenever the stored selection no longer
  // matches an active group (never a hardcoded kelompok id).
  const selectedGroup = activeGroups.find((group) => group.id === selectedGroupId) ?? activeGroups[0];

  const allActiveReports = reports.filter((r) => activeGroups.some((group) => group.id === r.groupId));
  const totalLaporan = allActiveReports.length;
  const sudahDivalidasi = allActiveReports.filter((r) => getLatestUmkmFeedbackByReport(r.id) !== null).length;
  const menungguValidasi = totalLaporan - sudahDivalidasi;

  const pendampingLabel =
    activeGroups.length === 1
      ? `${activeGroups[0].studyProgram} | ${activeGroups[0].name}`
      : `${activeGroups.length} Kelompok Dampingan`;

  const selectedProgress = calculateGroupProgress(selectedGroup.id, MENTORING_MILESTONES, reports);
  const selectedStage = getCurrentStage(selectedGroup.id, MENTORING_MILESTONES, reports);
  const trackOfProject = MENTORING_MILESTONES.map((milestone) => {
    const report = getMilestoneReport(selectedGroup.id, milestone.id, reports);
    return {
      id: milestone.id,
      title: milestone.title,
      status: reportToTimelineStatus(report?.status),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pendamping"
          value={pendampingLabel}
          icon={<UserRound size={26} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
          iconSizeClassName="h-14 w-14"
          labelClassName="text-base font-semibold text-navy"
          valueClassName="mt-2 text-2xl font-bold text-purple"
          className="min-h-[140px] rounded-2xl p-6"
        />

        <Link href="/umkm/mentoring" className="block rounded-2xl transition-shadow hover:shadow-md">
          <StatCard
            label="Menunggu Validasi"
            value={menungguValidasi}
            icon={<MessageSquare size={26} strokeWidth={2} />}
            iconClassName="bg-orange/10 text-orange"
            iconSizeClassName="h-14 w-14"
            labelClassName="text-base font-semibold text-navy"
            valueClassName="mt-2 text-4xl font-bold text-orange"
            className="min-h-[140px] rounded-2xl p-6"
          />
        </Link>

        <StatCard
          label="Sudah Divalidasi"
          value={sudahDivalidasi}
          icon={<CheckCircle2 size={26} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
          iconSizeClassName="h-14 w-14"
          labelClassName="text-base font-semibold text-navy"
          valueClassName="mt-2 text-4xl font-bold text-green-700"
          className="min-h-[140px] rounded-2xl p-6"
        />

        <StatCard
          label="Total Laporan"
          value={totalLaporan}
          icon={<FileText size={26} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
          iconSizeClassName="h-14 w-14"
          labelClassName="text-base font-semibold text-navy"
          valueClassName="mt-2 text-4xl font-bold text-purple"
          className="min-h-[140px] rounded-2xl p-6"
        />
      </div>

      <Card className="min-w-0 rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Track of project</CardTitle>
            <p className="mt-1 text-xs text-muted">
              {selectedGroup.code} &middot; Tahap saat ini: {selectedStage.title} &middot; {selectedProgress}%
            </p>
          </div>

          {activeGroups.length > 1 && (
            <Select
              id="select-kelompok"
              label="Pilih Kelompok"
              value={selectedGroup.id}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              options={activeGroups.map((group) => ({ value: group.id, label: group.code }))}
              className="w-full sm:w-[260px]"
            />
          )}
        </div>
        <div className="mt-4">
          <Timeline items={trackOfProject} />
        </div>
      </Card>
    </div>
  );
}
