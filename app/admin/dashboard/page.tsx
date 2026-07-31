"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserRound, GraduationCap, Store, Clock3, ChevronRight } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, ProgressBar } from "@/components/ui";
import { supabase } from "@/lib/supabaseClient";
import { formatRelativeTime } from "@/lib/adminDashboardData";

/** Raw shape of the `activity_log` + `profiles` (for nama_lengkap) join. */
interface ActivityLogJoinRow {
  id: string;
  aktivitas: string;
  created_at: string | null;
  profiles: { nama_lengkap: string | null } | null;
}

interface RecentActivityRow {
  id: string;
  message: string;
  createdAt: string;
}

function mapActivityLogRow(row: ActivityLogJoinRow): RecentActivityRow {
  const namaLengkap = row.profiles?.nama_lengkap ?? "Pengguna";
  return {
    id: row.id,
    message: `${namaLengkap} — ${row.aktivitas}`,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

type KelompokStatus = "aktif" | "selesai";

const KELOMPOK_STATUS_LABEL: Record<KelompokStatus, string> = {
  aktif: "Aktif",
  selesai: "Selesai",
};

const KELOMPOK_STATUS_VARIANT: Record<KelompokStatus, "green" | "gray"> = {
  aktif: "green",
  selesai: "gray",
};

/** Raw shape of the `kelompok -> project -> kelas/umkm` + latest `laporan_progress` join. */
interface KelompokProgressJoinRow {
  id: string;
  nama_kelompok: string | null;
  status: KelompokStatus | null;
  project: {
    kelas: { nama_kelas: string | null } | null;
    umkm: { nama_usaha: string | null } | null;
  } | null;
  laporan_progress: { persentase_progress: number | null; created_at: string | null }[] | null;
}

interface ProgressTableRow {
  id: string;
  kelompokName: string;
  kelasName: string;
  umkmName: string;
  progress: number;
  status: KelompokStatus | null;
}

function mapProgressJoinRow(row: KelompokProgressJoinRow): ProgressTableRow {
  const latestLaporan = row.laporan_progress?.[0];
  return {
    id: row.id,
    kelompokName: row.nama_kelompok ?? "-",
    kelasName: row.project?.kelas?.nama_kelas ?? "-",
    umkmName: row.project?.umkm?.nama_usaha ?? "-",
    progress: latestLaporan?.persentase_progress ?? 0,
    status: row.status,
  };
}

interface DashboardUserStats {
  totalUsers: number;
  totalDosen: number;
  totalMahasiswa: number;
  totalUmkm: number;
}

const EMPTY_STATS: DashboardUserStats = { totalUsers: 0, totalDosen: 0, totalMahasiswa: 0, totalUmkm: 0 };

interface SystemSummaryStats {
  kelasAktif: number;
  projectAktif: number;
  kelompokAktif: number;
  laporanMasuk: number;
}

const EMPTY_SYSTEM_SUMMARY: SystemSummaryStats = {
  kelasAktif: 0,
  projectAktif: 0,
  kelompokAktif: 0,
  laporanMasuk: 0,
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardUserStats>(EMPTY_STATS);
  const [statsHydrated, setStatsHydrated] = useState(false);
  const [systemSummary, setSystemSummary] = useState<SystemSummaryStats>(EMPTY_SYSTEM_SUMMARY);
  const [systemSummaryHydrated, setSystemSummaryHydrated] = useState(false);
  const [progressRows, setProgressRows] = useState<ProgressTableRow[]>([]);
  const [progressRowsHydrated, setProgressRowsHydrated] = useState(false);
  const [recentActivities, setRecentActivities] = useState<RecentActivityRow[]>([]);
  const [recentActivitiesHydrated, setRecentActivitiesHydrated] = useState(false);
  const isHydrated =
    statsHydrated && systemSummaryHydrated && progressRowsHydrated && recentActivitiesHydrated;

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardStats() {
      try {
        const [profilesResult, dosenResult, mahasiswaResult, umkmResult] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("dosen").select("*", { count: "exact", head: true }),
          supabase.from("mahasiswa").select("*", { count: "exact", head: true }),
          supabase.from("umkm").select("*", { count: "exact", head: true }),
        ]);

        const totalUsers = profilesResult.count ?? 0;
        const totalDosen = dosenResult.count ?? 0;
        const totalMahasiswa = mahasiswaResult.count ?? 0;
        const totalUmkm = umkmResult.count ?? 0;

        if (isMounted) setStats({ totalUsers, totalDosen, totalMahasiswa, totalUmkm });
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
        if (isMounted) setStats(EMPTY_STATS);
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

    async function loadSystemSummary() {
      try {
        const [kelasResult, projectResult, kelompokResult, laporanResult] = await Promise.all([
          supabase.from("kelas").select("*", { count: "exact", head: true }),
          supabase.from("project").select("*", { count: "exact", head: true }).eq("status", "berjalan"),
          supabase.from("kelompok").select("*", { count: "exact", head: true }).eq("status", "aktif"),
          supabase.from("laporan_progress").select("*", { count: "exact", head: true }),
        ]);

        const summary: SystemSummaryStats = {
          kelasAktif: kelasResult.count ?? 0,
          projectAktif: projectResult.count ?? 0,
          kelompokAktif: kelompokResult.count ?? 0,
          laporanMasuk: laporanResult.count ?? 0,
        };

        if (isMounted) setSystemSummary(summary);
      } catch (error) {
        console.error("Failed to load system summary", error);
        if (isMounted) setSystemSummary(EMPTY_SYSTEM_SUMMARY);
      } finally {
        if (isMounted) setSystemSummaryHydrated(true);
      }
    }

    loadSystemSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProgressTable() {
      try {
        const { data, error } = await supabase
          .from("kelompok")
          .select(
            `
              id,
              nama_kelompok,
              status,
              project (
                kelas ( nama_kelas ),
                umkm ( nama_usaha )
              ),
              laporan_progress (
                persentase_progress,
                created_at
              )
            `
          )
          .order("created_at", { ascending: false, referencedTable: "laporan_progress" })
          .limit(1, { foreignTable: "laporan_progress" })
          .limit(3);

        if (error) throw error;

        const progressRows = ((data ?? []) as unknown as KelompokProgressJoinRow[]).map(mapProgressJoinRow);

        if (isMounted) setProgressRows(progressRows);
      } catch (error) {
        console.error("Failed to load progress table", error);
        if (isMounted) setProgressRows([]);
      } finally {
        if (isMounted) setProgressRowsHydrated(true);
      }
    }

    loadProgressTable();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRecentActivities() {
      try {
        const { data, error } = await supabase
          .from("activity_log")
          .select(
            `
              id,
              aktivitas,
              created_at,
              profiles ( nama_lengkap )
            `
          )
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;

        const recentActivities = ((data ?? []) as unknown as ActivityLogJoinRow[]).map(mapActivityLogRow);

        if (isMounted) setRecentActivities(recentActivities);
      } catch (error) {
        console.error("Failed to load recent activities", error);
        if (isMounted) setRecentActivities([]);
      } finally {
        if (isMounted) setRecentActivitiesHydrated(true);
      }
    }

    loadRecentActivities();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader title="Dashboard Admin" description="Ringkasan aktivitas sistem CEdPreneur." />

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Pengguna"
          value={stats.totalUsers}
          icon={<Users size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
          accentClassName="bg-purple"
        />
        <StatCard
          label="Dosen"
          value={stats.totalDosen}
          icon={<UserRound size={22} strokeWidth={2} />}
          iconClassName="bg-orange/10 text-orange"
          accentClassName="bg-orange"
        />
        <StatCard
          label="Mahasiswa"
          value={stats.totalMahasiswa}
          icon={<GraduationCap size={22} strokeWidth={2} />}
          iconClassName="bg-pink/10 text-pink"
          accentClassName="bg-pink"
        />
        <StatCard
          label="UMKM Mitra"
          value={stats.totalUmkm}
          icon={<Store size={22} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
          accentClassName="bg-green-500"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          {recentActivities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Belum ada aktivitas.</p>
          ) : (
            <div className="flex flex-col divide-y divide-soft-gray-dark">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
                    <Clock3 size={16} strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-navy">{activity.message}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatRelativeTime(activity.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/admin/aktivitas"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-purple transition-colors hover:text-purple-dark"
          >
            Lihat semua aktivitas
            <ChevronRight size={16} strokeWidth={2} />
          </Link>
        </Card>

        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Ringkasan Sistem</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Kelas Aktif</span>
              <span className="font-semibold text-navy">{systemSummary.kelasAktif}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Project Aktif</span>
              <span className="font-semibold text-navy">{systemSummary.projectAktif}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Kelompok Aktif</span>
              <span className="font-semibold text-navy">{systemSummary.kelompokAktif}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Laporan Masuk</span>
              <span className="font-semibold text-navy">{systemSummary.laporanMasuk}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="min-w-0 rounded-2xl p-6">
        <CardHeader>
          <CardTitle className="text-lg">Progress Kelompok</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-purple/5">
              <tr>
                <th className="rounded-l-xl px-4 py-2.5 font-medium text-navy">Kelompok</th>
                <th className="px-4 py-2.5 font-medium text-navy">Kelas</th>
                <th className="px-4 py-2.5 font-medium text-navy">UMKM</th>
                <th className="px-4 py-2.5 font-medium text-navy">Tahap Saat Ini</th>
                <th className="px-4 py-2.5 font-medium text-navy">Progress</th>
                <th className="rounded-r-xl px-4 py-2.5 font-medium text-navy">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft-gray-dark">
              {progressRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-navy">{row.kelompokName}</td>
                  <td className="px-4 py-3 text-muted">{row.kelasName}</td>
                  <td className="px-4 py-3 text-muted">{row.umkmName}</td>
                  <td className="px-4 py-3 text-muted">-</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={row.progress} showLabel={false} className="w-24" />
                      <span className="w-9 shrink-0 text-xs font-semibold text-navy">{row.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.status ? (
                      <Badge variant={KELOMPOK_STATUS_VARIANT[row.status]}>{KELOMPOK_STATUS_LABEL[row.status]}</Badge>
                    ) : (
                      <Badge variant="gray">-</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <Link
            href="/admin/monitoring"
            className="inline-flex items-center gap-1 text-sm font-medium text-purple transition-colors hover:text-purple-dark"
          >
            Lihat semua progress kelompok
            <ChevronRight size={16} strokeWidth={2} />
          </Link>
        </div>
      </Card>
    </div>
  );
}
