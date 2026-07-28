"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ClipboardList, MessageSquareText } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, CardHeader, CardTitle, Button, Timeline, ProgressBar } from "@/components/ui";
import type { TimelineItem } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import {
  MENTORING_MILESTONES,
  getGroupMentoringStatus,
  getMilestoneAggregate,
  getMilestoneAggregateStatus,
  getMilestoneAggregateSubtext,
} from "@/lib/dosenProgressReportsStorage";

const TRACK_STATUS_MAP: Record<string, TimelineItem["status"]> = {
  completed: "selesai",
  active: "proses",
  empty: "belum",
};

export default function DosenDashboardPage() {
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const [lecturerName, setLecturerName] = useState("");
  const [profileHydrated, setProfileHydrated] = useState(false);
  const isHydrated = groupsHydrated && reportsHydrated && profileHydrated;

  useEffect(() => {
    let isMounted = true;

    async function loadLecturerName() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw userError ?? new Error("No authenticated user");

        const { data, error } = await supabase
          .from("profiles")
          .select("nama_lengkap")
          .eq("id", userData.user.id)
          .maybeSingle();

        if (error) throw error;
        if (isMounted) setLecturerName(data?.nama_lengkap ?? "");
      } catch (error) {
        console.error("Failed to load dosen profile", error);
        if (isMounted) setLecturerName("");
      } finally {
        if (isMounted) setProfileHydrated(true);
      }
    }

    loadLecturerName();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isHydrated) {
    return null;
  }

  const totalGroups = groups.length;
  const activeProjects = MENTORING_MILESTONES.length;
  const pendingFeedback = groups.filter(
    (group) => getGroupMentoringStatus(group.id, MENTORING_MILESTONES, reports) === "waiting"
  ).length;

  const uniqueStudentIds = new Set(groups.flatMap((group) => group.members.map((member) => member.id)));
  const totalStudents = uniqueStudentIds.size;

  const studyProgramMap = new Map<string, Set<string>>();
  groups.forEach((group) => {
    group.members.forEach((member) => {
      const program = group.studyProgram || "Tidak diketahui";
      if (!studyProgramMap.has(program)) {
        studyProgramMap.set(program, new Set());
      }
      studyProgramMap.get(program)?.add(member.id);
    });
  });
  const studyPrograms = Array.from(studyProgramMap.entries()).map(([name, studentIds]) => ({
    name,
    total: studentIds.size,
  }));

  const trackItems: TimelineItem[] = MENTORING_MILESTONES.map((milestone) => {
    const aggregate = getMilestoneAggregate(milestone.id, groups, reports);
    const status = getMilestoneAggregateStatus(aggregate);
    return {
      id: milestone.id,
      title: milestone.title,
      description: getMilestoneAggregateSubtext(aggregate, status),
      status: TRACK_STATUS_MAP[status],
    };
  });

  return (
    <div>
      <PageHeader
        title="Dashboard Dosen"
        description={`Selamat datang, ${lecturerName}.`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
        <div className="min-w-0 flex flex-col gap-6">
          <div className="grid gap-5 md:grid-cols-3">
            <Link href="/dosen/project" className="block rounded-2xl">
              <StatCard
                label="Jumlah Kelompok"
                value={totalGroups}
                icon={<Users size={22} strokeWidth={2} />}
                iconClassName="bg-purple/10 text-purple"
                className="min-w-0 border border-transparent transition-all hover:border-purple/40 hover:shadow-md"
              />
            </Link>
            <Link href="/dosen/project" className="block rounded-2xl">
              <StatCard
                label="Project Aktif"
                value={activeProjects}
                icon={<ClipboardList size={22} strokeWidth={2} />}
                iconClassName="bg-orange/10 text-orange"
                className="min-w-0 border border-transparent transition-all hover:border-purple/40 hover:shadow-md"
              />
            </Link>
            <Link href="/dosen/mentoring-feedback" className="block rounded-2xl">
              <StatCard
                label="Menunggu Feedback"
                value={pendingFeedback}
                icon={<MessageSquareText size={22} strokeWidth={2} />}
                iconClassName="bg-pink/10 text-pink"
                className="min-w-0 border border-transparent transition-all hover:border-purple/40 hover:shadow-md"
              />
            </Link>
          </div>

          <Card className="min-w-0 rounded-2xl p-6">
            <CardHeader>
              <CardTitle className="text-lg">Track of project</CardTitle>
              <Link href="/dosen/project">
                <Button variant="outline" size="sm">
                  Detail
                </Button>
              </Link>
            </CardHeader>
            <Timeline items={trackItems} />
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="rounded-2xl p-6">
            <p className="text-sm text-muted">Jumlah Mahasiswa</p>
            <p className="mt-1 text-3xl font-bold text-navy">{totalStudents}</p>

            <div className="my-5 h-px bg-soft-gray-dark" />

            <p className="text-sm font-semibold text-navy">Program Studi</p>
            <div className="mt-3 flex flex-col gap-4">
              {studyPrograms.map((program) => (
                <div key={program.name} className="min-w-0">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-navy">{program.name}</span>
                    <span className="shrink-0 font-semibold text-navy">{program.total}</span>
                  </div>
                  <ProgressBar
                    value={totalStudents === 0 ? 0 : Math.round((program.total / totalStudents) * 100)}
                    showLabel={false}
                    className="mt-1.5"
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
