"use client";

import Link from "next/link";
import { Users, UserRound, GraduationCap, Store, Clock3, ChevronRight } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, ProgressBar } from "@/components/ui";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { useDosenFeedback } from "@/lib/useDosenFeedback";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { MENTORING_MILESTONES, getCurrentStage, calculateGroupProgress } from "@/lib/dosenProgressReportsStorage";
import {
  getRecentActivities,
  formatRelativeTime,
  getAdminGroupStatus,
  ADMIN_GROUP_STATUS_LABEL,
  ADMIN_GROUP_STATUS_VARIANT,
} from "@/lib/adminDashboardData";

export default function AdminDashboardPage() {
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const { feedbacks, isHydrated: feedbackHydrated } = useDosenFeedback();
  const { users: adminUsers, isHydrated: usersHydrated } = useAdminUsers();
  const isHydrated = groupsHydrated && reportsHydrated && feedbackHydrated && usersHydrated;

  if (!isHydrated) {
    return null;
  }

  // Same shared users store /admin/pengguna reads (lib/adminUsersData.ts) —
  // Dashboard must never disagree with the Pengguna list on who's a dosen/mahasiswa.
  const dosenAktif = adminUsers.filter((u) => u.role === "dosen" && u.isActive).length;
  const mahasiswaAktif = adminUsers.filter((u) => u.role === "mahasiswa" && u.isActive).length;

  // UMKM Mitra source of truth: the UMKM actually connected to a kelompok
  // (lib/dosenGroupsStorage.ts, same as /dosen/project* and /dosen/mentoring-feedback*),
  // not data/users.ts — that list only has 2 UMKM accounts seeded, while a 3rd
  // group (Batik Jaya) is only represented via its group.umkmId relation.
  const activeUmkmIds = new Set(groups.map((group) => group.umkmId).filter(Boolean));
  const totalUmkmMitra = activeUmkmIds.size;

  const totalPengguna = dosenAktif + mahasiswaAktif + totalUmkmMitra;

  const kelasAktif = new Set(groups.map((group) => group.className)).size;
  const projectAktif = MENTORING_MILESTONES.length;
  const kelompokAktif = groups.filter((group) => group.status === "progress").length;
  const laporanMasuk = reports.length;

  const activities = getRecentActivities(groups, reports, feedbacks, 5);

  return (
    <div>
      <PageHeader title="Dashboard Admin" description="Ringkasan aktivitas sistem CEdPreneur." />

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Pengguna"
          value={totalPengguna}
          icon={<Users size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
          accentClassName="bg-purple"
        />
        <StatCard
          label="Dosen"
          value={dosenAktif}
          icon={<UserRound size={22} strokeWidth={2} />}
          iconClassName="bg-orange/10 text-orange"
          accentClassName="bg-orange"
        />
        <StatCard
          label="Mahasiswa"
          value={mahasiswaAktif}
          icon={<GraduationCap size={22} strokeWidth={2} />}
          iconClassName="bg-pink/10 text-pink"
          accentClassName="bg-pink"
        />
        <StatCard
          label="UMKM Mitra"
          value={totalUmkmMitra}
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
          {activities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Belum ada aktivitas.</p>
          ) : (
            <div className="flex flex-col divide-y divide-soft-gray-dark">
              {activities.map((activity) => (
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
              <span className="font-semibold text-navy">{kelasAktif}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Project Aktif</span>
              <span className="font-semibold text-navy">{projectAktif}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Kelompok Aktif</span>
              <span className="font-semibold text-navy">{kelompokAktif}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Laporan Masuk</span>
              <span className="font-semibold text-navy">{laporanMasuk}</span>
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
              {groups.slice(0, 3).map((group) => {
                const currentStage = getCurrentStage(group.id, MENTORING_MILESTONES, reports);
                const progress = calculateGroupProgress(group.id, MENTORING_MILESTONES, reports);
                const status = getAdminGroupStatus(group.id, MENTORING_MILESTONES, reports);
                return (
                  <tr key={group.id}>
                    <td className="px-4 py-3 font-medium text-navy">{group.code}</td>
                    <td className="px-4 py-3 text-muted">{group.className}</td>
                    <td className="px-4 py-3 text-muted">{group.umkmName}</td>
                    <td className="px-4 py-3 text-muted">{currentStage.title}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={progress} showLabel={false} className="w-24" />
                        <span className="w-9 shrink-0 text-xs font-semibold text-navy">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ADMIN_GROUP_STATUS_VARIANT[status]}>{ADMIN_GROUP_STATUS_LABEL[status]}</Badge>
                    </td>
                  </tr>
                );
              })}
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
