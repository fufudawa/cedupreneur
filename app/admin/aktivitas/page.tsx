"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Upload, MessageSquare, CheckCircle2, Users, Activity } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, Badge, Button, Input, Select } from "@/components/ui";
import { useAdminMonitoring } from "@/lib/useAdminMonitoring";
import {
  getAllActivities,
  formatActivityDateTime,
  isWithinDays,
  ACTIVITY_TYPE_LABEL,
  ACTIVITY_TYPE_BADGE_VARIANT,
  ACTIVITY_TYPE_ICON_CLASS,
  type ActivityType,
  type ActivityActorRole,
} from "@/lib/adminDashboardData";

const ACTIVITY_TYPE_ICON: Record<ActivityType, typeof Upload> = {
  upload_progress: Upload,
  feedback_dosen: MessageSquare,
  feedback_umkm: CheckCircle2,
  create_group: Users,
};

const TYPE_OPTIONS: { value: "all" | ActivityType; label: string }[] = [
  { value: "all", label: "Semua Aktivitas" },
  { value: "upload_progress", label: "Upload Laporan" },
  { value: "feedback_dosen", label: "Feedback Dosen" },
  { value: "feedback_umkm", label: "Feedback UMKM" },
  { value: "create_group", label: "Kelompok Dibuat" },
];

const ROLE_OPTIONS: { value: "all" | ActivityActorRole; label: string }[] = [
  { value: "all", label: "Semua Role" },
  { value: "dosen", label: "Dosen" },
  { value: "mahasiswa", label: "Mahasiswa" },
  { value: "umkm", label: "UMKM" },
];

const TIME_OPTIONS = [
  { value: "all", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "7d", label: "7 Hari Terakhir" },
  { value: "30d", label: "30 Hari Terakhir" },
];

const PAGE_SIZE = 10;

export default function AdminAktivitasPage() {
  const { groups, isHydrated } = useAdminMonitoring();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ActivityType>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | ActivityActorRole>("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const activities = useMemo(() => (isHydrated ? getAllActivities(groups) : []), [isHydrated, groups]);

  const totalAktivitas = activities.length;
  const totalUpload = activities.filter((a) => a.type === "upload_progress").length;
  const totalFeedbackDosen = activities.filter((a) => a.type === "feedback_dosen").length;
  const totalFeedbackUmkm = activities.filter((a) => a.type === "feedback_umkm").length;

  const filtered = activities.filter((activity) => {
    const keyword = search.toLowerCase();
    const matchSearch =
      keyword === "" ||
      activity.description.toLowerCase().includes(keyword) ||
      (activity.groupName ?? "").toLowerCase().includes(keyword) ||
      activity.actorName.toLowerCase().includes(keyword);
    const matchType = typeFilter === "all" || activity.type === typeFilter;
    const matchRole = roleFilter === "all" || activity.actorRole === roleFilter;

    const matchTime =
      timeFilter === "all" ||
      (timeFilter === "today" && isWithinDays(activity.createdAt, 1)) ||
      (timeFilter === "7d" && isWithinDays(activity.createdAt, 7)) ||
      (timeFilter === "30d" && isWithinDays(activity.createdAt, 30));

    return matchSearch && matchType && matchRole && matchTime;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Aktivitas Sistem"
        description="Pantau seluruh aktivitas pengguna dan perubahan penting dalam sistem."
        actions={
          <Link href="/admin/dashboard">
            <Button variant="outline">Kembali ke Dashboard</Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Aktivitas"
          value={totalAktivitas}
          icon={<Activity size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
        />
        <StatCard
          label="Upload Laporan"
          value={totalUpload}
          icon={<Upload size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
        />
        <StatCard
          label="Feedback Dosen"
          value={totalFeedbackDosen}
          icon={<MessageSquare size={22} strokeWidth={2} />}
          iconClassName="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Feedback UMKM"
          value={totalFeedbackUmkm}
          icon={<CheckCircle2 size={22} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
        />
      </div>

      <Card className="mb-6 rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.3fr)_170px_160px_170px]">
          <Input
            id="search-aktivitas"
            placeholder="Cari aktivitas, kelompok, atau pengguna..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            id="filter-jenis"
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as "all" | ActivityType);
              setPage(1);
            }}
          />
          <Select
            id="filter-role"
            options={ROLE_OPTIONS}
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as "all" | ActivityActorRole);
              setPage(1);
            }}
          />
          <Select
            id="filter-waktu"
            options={TIME_OPTIONS}
            value={timeFilter}
            onChange={(e) => {
              setTimeFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      <Card className="min-w-0 rounded-2xl p-6">
        {!isHydrated ? null : paginated.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Tidak ada aktivitas yang sesuai dengan filter.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-soft-gray-dark">
            {paginated.map((activity) => {
              const Icon = ACTIVITY_TYPE_ICON[activity.type];
              return (
                <div key={activity.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ACTIVITY_TYPE_ICON_CLASS[activity.type]}`}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">{activity.description}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {activity.actorRole.charAt(0).toUpperCase() + activity.actorRole.slice(1)}
                        {activity.groupName ? ` · ${activity.groupName}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{formatActivityDateTime(activity.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 pl-[52px] sm:pl-0">
                    <Badge variant={ACTIVITY_TYPE_BADGE_VARIANT[activity.type]}>
                      {ACTIVITY_TYPE_LABEL[activity.type]}
                    </Badge>
                    {activity.groupId && (
                      <Link href={`/admin/monitoring/${activity.groupId}`}>
                        <Button variant="outline" size="sm">
                          Lihat Detail
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-soft-gray-dark pt-4 text-sm">
            <span className="text-muted">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    pageNumber === currentPage
                      ? "bg-purple text-white"
                      : "text-navy hover:bg-soft-gray"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
