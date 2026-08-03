"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, ClipboardList, MessageSquareText } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, CardHeader, CardTitle, Button, Timeline, ProgressBar, Badge } from "@/components/ui";
import type { TimelineItem } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentProfile } from "@/lib/auth";
import { calculateTugasProgress } from "@/lib/useProjectTugas";

const REPORT_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  submitted: "Menunggu feedback",
  reviewed: "Selesai direview",
};

const REPORT_STATUS_TIMELINE: Record<string, TimelineItem["status"]> = {
  draft: "belum",
  submitted: "proses",
  reviewed: "selesai",
};

interface DosenDashboardStats {
  jumlahKelompok: number;
  /** Total project milik dosen ini, semua status — dipakai untuk gate Timeline "Track of project" (lihat PR terbaru). */
  totalProject: number;
  projectAktif: number;
  menungguFeedback: number;
  /** Rata-rata `persentase_progress` (laporan terbaru per kelompok). Belum ada slot UI untuk ini — lihat catatan di PR 8A. */
  trackProgress: number;
  jumlahMahasiswa: number;
  programStudi: number;
}

const EMPTY_DASHBOARD_STATS: DosenDashboardStats = {
  jumlahKelompok: 0,
  totalProject: 0,
  projectAktif: 0,
  menungguFeedback: 0,
  trackProgress: 0,
  jumlahMahasiswa: 0,
  programStudi: 0,
};

interface ProjectRow {
  id: string;
  status: string | null;
}

interface KelompokRow {
  id: string;
  nama_kelompok: string | null;
}

interface LaporanProgressRow {
  kelompok_id: string;
  judul_laporan: string | null;
  persentase_progress: number | null;
  status: string | null;
  created_at: string | null;
}

interface KelompokAnggotaJoinRow {
  mahasiswa_id: string;
  mahasiswa: { prodi: string | null } | null;
}

type ProjectStatus = "draft" | "berjalan" | "selesai";

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: "Draft",
  berjalan: "Berjalan",
  selesai: "Selesai",
};

const PROJECT_STATUS_VARIANT: Record<ProjectStatus, "gray" | "green" | "navy"> = {
  draft: "gray",
  berjalan: "green",
  selesai: "navy",
};

/**
 * Raw shape of the `kelompok -> project (!inner) -> umkm` + `kelompok_anggota` +
 * latest `laporan_progress` join — one query covers "Kelompok Bimbingan" and
 * "Track Project" at once (see PR 8B).
 */
interface SupervisedGroupJoinRow {
  id: string;
  nama_kelompok: string | null;
  status: string | null;
  project: {
    id: string;
    judul_project: string | null;
    status: ProjectStatus | null;
    created_by: string;
    umkm: { nama_usaha: string | null } | null;
    project_tugas: { is_selesai: boolean }[] | null;
  } | null;
  kelompok_anggota: { mahasiswa_id: string }[] | null;
  laporan_progress: { persentase_progress: number | null; created_at: string | null }[] | null;
}

interface SupervisedGroupSummary {
  id: string;
  kelompokName: string;
  projectName: string;
  umkmName: string;
  memberCount: number;
  latestProgress: number;
  projectStatus: ProjectStatus | null;
  projectStatusLabel: string;
  projectStatusVariant: "gray" | "green" | "navy";
}

function mapSupervisedGroupRow(row: SupervisedGroupJoinRow): SupervisedGroupSummary {
  const projectStatus = row.project?.status ?? null;

  return {
    id: row.id,
    kelompokName: row.nama_kelompok ?? "-",
    projectName: row.project?.judul_project ?? "-",
    umkmName: row.project?.umkm?.nama_usaha ?? "-",
    memberCount: row.kelompok_anggota?.length ?? 0,
    latestProgress: calculateTugasProgress(row.project?.project_tugas ?? []),
    projectStatus,
    projectStatusLabel: projectStatus ? PROJECT_STATUS_LABEL[projectStatus] : "-",
    projectStatusVariant: projectStatus ? PROJECT_STATUS_VARIANT[projectStatus] : "gray",
  };
}

export default function DosenDashboardPage() {
  const [lecturerName, setLecturerName] = useState("");
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [stats, setStats] = useState<DosenDashboardStats>(EMPTY_DASHBOARD_STATS);
  const [programBreakdown, setProgramBreakdown] = useState<{ name: string; total: number }[]>([]);
  const [recentReports, setRecentReports] = useState<TimelineItem[]>([]);
  const [statsHydrated, setStatsHydrated] = useState(false);
  const [supervisedGroups, setSupervisedGroups] = useState<SupervisedGroupSummary[]>([]);
  const [supervisedGroupsHydrated, setSupervisedGroupsHydrated] = useState(false);
  const isHydrated = profileHydrated && statsHydrated && supervisedGroupsHydrated;

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

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardStats() {
      try {
        // Identitas dosen yang login — lewat helper Supabase Auth yang sudah ada (lib/auth.ts).
        const profile = await getCurrentProfile();

        const { data: dosenRow, error: dosenError } = await supabase
          .from("dosen")
          .select("id")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (dosenError) throw dosenError;
        if (!dosenRow) throw new Error("Dosen record not found for current profile");

        const dosenId = dosenRow.id as string;

        // Project milik dosen ini (project.created_by -> dosen.id).
        const { data: projectData, error: projectError } = await supabase
          .from("project")
          .select("id, status")
          .eq("created_by", dosenId);
        if (projectError) throw projectError;

        const projectRows = (projectData ?? []) as ProjectRow[];
        const projectIds = projectRows.map((row) => row.id);
        const projectAktif = projectRows.filter((row) => row.status === "berjalan").length;

        // Kelompok pada project-project tersebut.
        const kelompokResult = projectIds.length
          ? await supabase.from("kelompok").select("id, nama_kelompok").in("project_id", projectIds)
          : { data: [] as KelompokRow[], error: null };
        if (kelompokResult.error) throw kelompokResult.error;

        const kelompokRows = (kelompokResult.data ?? []) as KelompokRow[];
        const kelompokIds = kelompokRows.map((row) => row.id);
        const jumlahKelompok = kelompokRows.length;
        const kelompokNameById = new Map(kelompokRows.map((row) => [row.id, row.nama_kelompok ?? "-"]));

        // Laporan progress & anggota kelompok — independen satu sama lain, jalankan paralel.
        const [laporanResult, anggotaResult] = await Promise.all([
          kelompokIds.length
            ? supabase
                .from("laporan_progress")
                .select("kelompok_id, judul_laporan, persentase_progress, status, created_at")
                .in("kelompok_id", kelompokIds)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] as LaporanProgressRow[], error: null }),
          kelompokIds.length
            ? supabase
                .from("kelompok_anggota")
                .select("mahasiswa_id, mahasiswa ( prodi )")
                .in("kelompok_id", kelompokIds)
            : Promise.resolve({ data: [] as KelompokAnggotaJoinRow[], error: null }),
        ]);

        if (laporanResult.error) throw laporanResult.error;
        if (anggotaResult.error) throw anggotaResult.error;

        const laporanRows = (laporanResult.data ?? []) as LaporanProgressRow[];
        const menungguFeedback = laporanRows.filter((row) => row.status === "submitted").length;

        // Laporan diurutkan created_at DESC di query, jadi kemunculan pertama per
        // kelompok_id sudah pasti laporan terbarunya.
        const latestProgressByKelompok = new Map<string, number>();
        for (const row of laporanRows) {
          if (!latestProgressByKelompok.has(row.kelompok_id)) {
            latestProgressByKelompok.set(row.kelompok_id, row.persentase_progress ?? 0);
          }
        }
        const progressValues = Array.from(latestProgressByKelompok.values());
        const trackProgress = progressValues.length
          ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
          : 0;

        const anggotaRows = (anggotaResult.data ?? []) as KelompokAnggotaJoinRow[];
        const jumlahMahasiswa = new Set(anggotaRows.map((row) => row.mahasiswa_id)).size;

        // Per-prodi breakdown (nama + jumlah mahasiswa unik) — dipakai untuk mengisi
        // daftar "Program Studi" di UI (bentuknya sudah ada, hanya sumber datanya diganti).
        const programMap = new Map<string, Set<string>>();
        for (const row of anggotaRows) {
          const prodi = row.mahasiswa?.prodi || "Tidak diketahui";
          if (!programMap.has(prodi)) programMap.set(prodi, new Set());
          programMap.get(prodi)?.add(row.mahasiswa_id);
        }
        const programBreakdown = Array.from(programMap.entries()).map(([name, ids]) => ({
          name,
          total: ids.size,
        }));
        const programStudi = programMap.size;

        const dashboardStats: DosenDashboardStats = {
          jumlahKelompok,
          totalProject: projectRows.length,
          projectAktif,
          menungguFeedback,
          trackProgress,
          jumlahMahasiswa,
          programStudi,
        };

        // "Track of project" — daftar laporan_progress ASLI terbaru lintas
        // seluruh kelompok bimbingan dosen ini (bukan lagi 5 milestone
        // hardcoded yang dicocokkan ke hook dummy).
        const recentReports: TimelineItem[] = laporanRows.slice(0, 5).map((row, index) => ({
          id: `${row.kelompok_id}-${row.created_at ?? index}`,
          title: row.judul_laporan ?? "Laporan Progress",
          description: `${kelompokNameById.get(row.kelompok_id) ?? "-"} • ${
            REPORT_STATUS_LABEL[row.status ?? ""] ?? "-"
          }`,
          status: REPORT_STATUS_TIMELINE[row.status ?? ""] ?? "belum",
        }));

        if (isMounted) {
          setStats(dashboardStats);
          setProgramBreakdown(programBreakdown);
          setRecentReports(recentReports);
        }
      } catch (error) {
        console.error("Failed to load lecturer dashboard stats", error);
        if (isMounted) {
          setStats(EMPTY_DASHBOARD_STATS);
          setProgramBreakdown([]);
          setRecentReports([]);
        }
      } finally {
        if (isMounted) setStatsHydrated(true);
      }
    }

    loadDashboardStats();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSupervisedGroups() {
      try {
        // Identitas dosen yang login — lewat helper Supabase Auth yang sudah ada (lib/auth.ts).
        const profile = await getCurrentProfile();

        const { data: dosenRow, error: dosenError } = await supabase
          .from("dosen")
          .select("id")
          .eq("profile_id", profile.id)
          .maybeSingle();
        if (dosenError) throw dosenError;
        if (!dosenRow) throw new Error("Dosen record not found for current profile");

        const dosenId = dosenRow.id as string;

        // Satu query untuk seluruh "Kelompok Bimbingan" + "Track Project":
        // kelompok -> project (!inner, di-filter ke dosen ini) -> umkm, plus
        // seluruh kelompok_anggota (untuk jumlah anggota) dan laporan_progress
        // terbaru saja (order + limit di sisi embedded resource).
        const { data, error } = await supabase
          .from("kelompok")
          .select(
            `
              id,
              nama_kelompok,
              status,
              project!inner (
                id,
                judul_project,
                status,
                created_by,
                umkm ( nama_usaha ),
                project_tugas ( is_selesai )
              ),
              kelompok_anggota ( mahasiswa_id ),
              laporan_progress ( persentase_progress, created_at )
            `
          )
          .eq("project.created_by", dosenId)
          .order("created_at", { ascending: false, referencedTable: "laporan_progress" })
          .limit(1, { foreignTable: "laporan_progress" });

        if (error) throw error;

        const supervisedGroups = ((data ?? []) as unknown as SupervisedGroupJoinRow[]).map(
          mapSupervisedGroupRow
        );

        if (isMounted) setSupervisedGroups(supervisedGroups);
      } catch (error) {
        console.error("Failed to load lecturer dashboard detail", error);
        if (isMounted) setSupervisedGroups([]);
      } finally {
        if (isMounted) setSupervisedGroupsHydrated(true);
      }
    }

    loadSupervisedGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isHydrated) {
    return null;
  }

  const hasReports = recentReports.length > 0;

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
                value={stats.jumlahKelompok}
                icon={<Users size={22} strokeWidth={2} />}
                iconClassName="bg-purple/10 text-purple"
                className="min-w-0 border border-transparent transition-all hover:border-purple/40 hover:shadow-md"
              />
            </Link>
            <Link href="/dosen/project" className="block rounded-2xl">
              <StatCard
                label="Project Aktif"
                value={stats.projectAktif}
                icon={<ClipboardList size={22} strokeWidth={2} />}
                iconClassName="bg-orange/10 text-orange"
                className="min-w-0 border border-transparent transition-all hover:border-purple/40 hover:shadow-md"
              />
            </Link>
            <Link href="/dosen/mentoring-feedback" className="block rounded-2xl">
              <StatCard
                label="Menunggu Feedback"
                value={stats.menungguFeedback}
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
            {hasReports ? (
              <Timeline items={recentReports} />
            ) : (
              <p className="py-6 text-center text-sm text-muted">Belum ada laporan progress yang dapat dipantau.</p>
            )}
          </Card>

          <Card className="min-w-0 rounded-2xl p-6">
            <CardHeader>
              <CardTitle className="text-lg">Kelompok Bimbingan</CardTitle>
              <Link href="/dosen/project/kelompok">
                <Button variant="outline" size="sm">
                  Lihat Semua
                </Button>
              </Link>
            </CardHeader>
            {supervisedGroups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Belum ada kelompok bimbingan.</p>
            ) : (
              <div className="flex flex-col divide-y divide-soft-gray-dark">
                {supervisedGroups.slice(0, 5).map((group) => (
                  <Link
                    key={group.id}
                    href={`/dosen/project/kelompok/${group.id}`}
                    className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{group.kelompokName}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {group.projectName} · {group.umkmName} · {group.memberCount} Anggota
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 sm:w-48">
                      <ProgressBar value={group.latestProgress} showLabel={false} className="flex-1" />
                      <span className="w-10 shrink-0 text-right text-sm font-semibold text-navy">
                        {group.latestProgress}%
                      </span>
                      <Badge variant={group.projectStatusVariant}>{group.projectStatusLabel}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0">
          <Card className="rounded-2xl p-6">
            <p className="text-sm text-muted">Jumlah Mahasiswa</p>
            <p className="mt-1 text-3xl font-bold text-navy">{stats.jumlahMahasiswa}</p>

            <div className="my-5 h-px bg-soft-gray-dark" />

            <p className="text-sm font-semibold text-navy">Program Studi</p>
            <div className="mt-3 flex flex-col gap-4">
              {programBreakdown.length === 0 ? (
                <p className="text-sm text-muted">Belum ada mahasiswa bimbingan.</p>
              ) : (
                programBreakdown.map((program) => (
                  <div key={program.name} className="min-w-0">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-navy">{program.name}</span>
                      <span className="shrink-0 font-semibold text-navy">{program.total}</span>
                    </div>
                    <ProgressBar
                      value={
                        stats.jumlahMahasiswa === 0 ? 0 : Math.round((program.total / stats.jumlahMahasiswa) * 100)
                      }
                      showLabel={false}
                      className="mt-1.5"
                    />
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
