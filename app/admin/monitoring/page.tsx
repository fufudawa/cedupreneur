"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Layers, FileText, MessageSquare, Users } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, Badge, Button, Input, Select, ProgressBar } from "@/components/ui";
import { useAdminMonitoring } from "@/lib/useAdminMonitoring";
import {
  getAdminGroupStatus,
  ADMIN_GROUP_STATUS_LABEL,
  ADMIN_GROUP_STATUS_VARIANT,
  type AdminGroupStatus,
} from "@/lib/adminDashboardData";

const STATUS_OPTIONS: { value: "all" | AdminGroupStatus; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "waiting", label: "Menunggu Feedback" },
  { value: "incomplete", label: "Belum Tuntas" },
  { value: "completed", label: "Tuntas" },
  { value: "empty", label: "Belum Ada Laporan" },
];

const PAGE_SIZE = 10;

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AdminMonitoringPage() {
  const { groups, isHydrated } = useAdminMonitoring();

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminGroupStatus>("all");
  const [umkmFilter, setUmkmFilter] = useState("all");
  const [page, setPage] = useState(1);

  const classOptions = useMemo(
    () => [
      { value: "all", label: "Semua Kelas" },
      ...Array.from(new Set(groups.map((group) => group.className))).map((className) => ({
        value: className,
        label: className,
      })),
    ],
    [groups]
  );

  const umkmOptions = useMemo(
    () => [
      { value: "all", label: "Semua UMKM" },
      ...Array.from(new Set(groups.map((group) => group.umkmName))).map((name) => ({ value: name, label: name })),
    ],
    [groups]
  );

  const projectAktif = new Set(groups.map((g) => g.projectId)).size;
  const laporanMasuk = groups.reduce((sum, g) => sum + g.laporan.filter((l) => l.status !== "draft").length, 0);
  const menungguFeedback = groups.reduce(
    (sum, g) => sum + g.laporan.filter((l) => l.status === "submitted").length,
    0
  );
  const kelompokAktif = groups.filter((group) => group.status === "aktif").length;

  const rows = useMemo(
    () =>
      groups.map((group) => ({
        group,
        status: getAdminGroupStatus(group),
        latestLaporan: group.laporan.find((l) => l.status !== "draft"),
      })),
    [groups]
  );

  const filtered = rows.filter(({ group, status }) => {
    const keyword = search.toLowerCase();
    const matchSearch =
      keyword === "" ||
      group.code.toLowerCase().includes(keyword) ||
      group.className.toLowerCase().includes(keyword) ||
      group.umkmName.toLowerCase().includes(keyword);
    const matchClass = classFilter === "all" || group.className === classFilter;
    const matchStatus = statusFilter === "all" || status === statusFilter;
    const matchUmkm = umkmFilter === "all" || group.umkmName === umkmFilter;
    return matchSearch && matchClass && matchStatus && matchUmkm;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  function resetPage() {
    setPage(1);
  }

  return (
    <div>
      <PageHeader
        title="Monitoring"
        description="Pantau perkembangan project, laporan, dan status seluruh kelompok."
        actions={
          <Link href="/admin/dashboard">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Dashboard
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Project Aktif"
          value={projectAktif}
          icon={<Layers size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
          accentClassName="bg-purple"
        />
        <StatCard
          label="Laporan Masuk"
          value={laporanMasuk}
          icon={<FileText size={22} strokeWidth={2} />}
          iconClassName="bg-orange/10 text-orange"
          accentClassName="bg-orange"
        />
        <StatCard
          label="Menunggu Feedback"
          value={menungguFeedback}
          icon={<MessageSquare size={22} strokeWidth={2} />}
          iconClassName="bg-pink/10 text-pink"
          accentClassName="bg-pink"
        />
        <StatCard
          label="Kelompok Aktif"
          value={kelompokAktif}
          icon={<Users size={22} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
          accentClassName="bg-green-500"
        />
      </div>

      <Card className="min-w-0 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-navy">Monitoring Progress</h2>

        <div className="mt-4 mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(260px,1.4fr)_170px_170px_170px]">
          <Input
            id="search-monitoring"
            placeholder="Cari kelompok, kelas, atau UMKM..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
          <Select
            id="filter-kelas-monitoring"
            options={classOptions}
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              resetPage();
            }}
          />
          <Select
            id="filter-status-monitoring"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | AdminGroupStatus);
              resetPage();
            }}
          />
          <Select
            id="filter-umkm-monitoring"
            options={umkmOptions}
            value={umkmFilter}
            onChange={(e) => {
              setUmkmFilter(e.target.value);
              resetPage();
            }}
          />
        </div>

        {!isHydrated ? null : paginated.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Tidak ada kelompok yang cocok dengan pencarian/filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-purple/5">
                <tr>
                  <th className="rounded-l-xl px-4 py-2.5 font-medium text-navy">Kelompok</th>
                  <th className="px-4 py-2.5 font-medium text-navy">Kelas</th>
                  <th className="px-4 py-2.5 font-medium text-navy">UMKM</th>
                  <th className="px-4 py-2.5 font-medium text-navy">Progress</th>
                  <th className="px-4 py-2.5 font-medium text-navy">Status</th>
                  <th className="px-4 py-2.5 font-medium text-navy">Laporan Terakhir</th>
                  <th className="rounded-r-xl px-4 py-2.5 font-medium text-navy">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-gray-dark">
                {paginated.map(({ group, status, latestLaporan }) => (
                  <tr key={group.id}>
                    <td className="px-4 py-3 font-medium text-navy">{group.code}</td>
                    <td className="px-4 py-3 text-muted">{group.className}</td>
                    <td className="px-4 py-3 text-muted">{group.umkmName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={group.progress} showLabel={false} className="w-24" />
                        <span className="w-9 shrink-0 text-xs font-semibold text-navy">{group.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ADMIN_GROUP_STATUS_VARIANT[status]}>{ADMIN_GROUP_STATUS_LABEL[status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {latestLaporan ? (
                        <>
                          <p className="text-navy">{latestLaporan.judulLaporan}</p>
                          <p className="text-xs">{formatShortDate(latestLaporan.tanggalSubmit ?? latestLaporan.createdAt ?? "")}</p>
                        </>
                      ) : (
                        "Belum ada laporan"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/monitoring/${group.id}`}>
                        <Button variant="outline" size="sm">
                          Detail
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-soft-gray-dark pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted">
              Menampilkan {rangeStart}–{rangeEnd} dari {filtered.length} kelompok
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    pageNumber === currentPage ? "bg-purple text-white" : "text-navy hover:bg-soft-gray"
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
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
