"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { CardHeader, CardTitle, Badge, Button, ProgressBar } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";
import { useDosenKelompokBimbingan } from "@/lib/useDosenKelompokBimbingan";
import { ADMIN_GROUP_STATUS_LABEL, ADMIN_GROUP_STATUS_VARIANT } from "@/lib/adminDashboardData";

type ProjectStatus = "draft" | "berjalan" | "selesai";

const PROJECT_STATUS_BADGE: Record<ProjectStatus, { label: string; variant: "green" | "orange" | "blue" }> = {
  selesai: { label: "Selesai", variant: "green" },
  berjalan: { label: "Berjalan", variant: "orange" },
  draft: { label: "Belum Dimulai", variant: "blue" },
};

interface DosenProjectRow {
  id: string;
  judulProject: string;
  status: ProjectStatus | null;
  createdAt: string | null;
  deadline: string | null;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function DosenProjectPage() {
  const [projects, setProjects] = useState<DosenProjectRow[]>([]);
  const [projectsHydrated, setProjectsHydrated] = useState(false);
  const { groups, isHydrated: groupsHydrated } = useDosenKelompokBimbingan();

  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      try {
        const profile = await getCurrentProfile();

        const { data: dosenRow, error: dosenError } = await supabase
          .from("dosen")
          .select("id")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (dosenError) throw dosenError;
        if (!dosenRow) throw new Error("Dosen record not found for current profile");

        const { data, error } = await supabase
          .from("project")
          .select("id, judul_project, status, created_at, deadline")
          .eq("created_by", dosenRow.id as string)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const rows: DosenProjectRow[] = (data ?? []).map((row) => ({
          id: row.id,
          judulProject: row.judul_project ?? "-",
          status: row.status,
          createdAt: row.created_at,
          deadline: row.deadline,
        }));

        if (isMounted) setProjects(rows);
      } catch (error) {
        console.error("Failed to load dosen projects", error);
        if (isMounted) setProjects([]);
      } finally {
        if (isMounted) setProjectsHydrated(true);
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

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
        {projectsHydrated && projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Belum ada project.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {projects.map((project) => {
              const badge = project.status ? PROJECT_STATUS_BADGE[project.status] : null;
              return (
                <Link
                  key={project.id}
                  href={`/dosen/project/${project.id}`}
                  className="block cursor-pointer rounded-2xl border border-soft-gray-dark bg-white p-5 transition-colors hover:border-purple/30 hover:bg-purple/5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy">{project.judulProject}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {project.createdAt && `Dibuat ${formatDate(project.createdAt)}`}
                        {project.createdAt && project.deadline && " · "}
                        {project.deadline && `Deadline ${formatDate(project.deadline)}`}
                      </p>
                    </div>
                    {badge && (
                      <Badge variant={badge.variant} className="shrink-0 self-start sm:self-center">
                        {badge.label}
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
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
        {groupsHydrated && groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Belum ada kelompok bimbingan.</p>
        ) : (
          <div className="flex flex-col divide-y divide-soft-gray-dark">
            {groups.slice(0, 2).map((group) => (
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
                      Tahap: <span className="font-medium text-navy">-</span>
                    </span>
                    <Badge variant={ADMIN_GROUP_STATUS_VARIANT[group.mentoringStatus]}>
                      {ADMIN_GROUP_STATUS_LABEL[group.mentoringStatus]}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <ProgressBar value={group.progress} showLabel={false} className="flex-1" />
                    <span className="w-10 shrink-0 text-right text-sm font-semibold text-navy">
                      {group.progress}%
                    </span>
                  </div>
                </div>

                <Link href={`/dosen/project/kelompok/${group.id}`} className="shrink-0">
                  <Button variant="outline" size="sm" className="w-full lg:w-auto">
                    Detail
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

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
