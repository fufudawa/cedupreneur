"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { MENTORING_MILESTONES, getMilestoneReport } from "@/lib/dosenProgressReportsStorage";
import { getCurrentDemoUser, getActiveUmkmGroups } from "@/lib/demoSession";
import { MentoringDetailClient } from "./MentoringDetailClient";

export default function UmkmMentoringMilestoneDetailPage({
  params,
}: {
  params: Promise<{ id: string; milestoneId: string }>;
}) {
  const { id, milestoneId } = use(params);
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const isHydrated = groupsHydrated && reportsHydrated;

  if (!isHydrated) {
    return null;
  }

  const group = groups.find((g) => g.id === id);
  const milestone = MENTORING_MILESTONES.find((m) => m.id === milestoneId);
  if (!group || !milestone) {
    notFound();
  }

  const activeUser = getCurrentDemoUser("umkm");
  const activeGroups = activeUser ? getActiveUmkmGroups(activeUser, groups) : [];
  const isOwner = activeGroups.some((g) => g.id === group.id);

  // A UMKM cannot open another UMKM's laporan just by changing the URL.
  if (!isOwner || !activeUser) {
    notFound();
  }

  const report = getMilestoneReport(group.id, milestoneId, reports);
  if (!report) {
    notFound();
  }

  return (
    <MentoringDetailClient
      group={group}
      milestone={milestone}
      report={report}
      umkmId={activeUser.id}
      umkmName={activeUser.businessName ?? activeUser.name}
    />
  );
}
