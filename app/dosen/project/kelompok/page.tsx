"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Layers, ClipboardCheck, TrendingUp } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, Badge, Button, Input, Select, ProgressBar, FilterToolbar } from "@/components/ui";
import { useDosenKelompokBimbingan, type KelompokMentoringStatus } from "@/lib/useDosenKelompokBimbingan";
import { ADMIN_GROUP_STATUS_LABEL, ADMIN_GROUP_STATUS_VARIANT } from "@/lib/adminDashboardData";

// Tidak ada tabel milestone/tahap di database — dropdown dipertahankan (layout
// tidak berubah) tapi hanya berisi satu opsi inert, karena "tahap" bukan
// konsep yang bisa difilter dari data nyata saat ini.
const STAGE_OPTIONS = [{ value: "all", label: "Semua Tahap" }];

const STATUS_OPTIONS: { value: "all" | KelompokMentoringStatus; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "waiting", label: "Menunggu Feedback" },
  { value: "incomplete", label: "Belum Tuntas" },
  { value: "completed", label: "Tuntas" },
  { value: "empty", label: "Belum Ada Laporan" },
];

export default function SeluruhKelompokPage() {
  const { groups, isHydrated } = useDosenKelompokBimbingan();

  const [search, setSearch] = useState("");
  const [studyProgramFilter, setStudyProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | KelompokMentoringStatus>("all");

  const studyProgramOptions = useMemo(
    () => [
      { value: "all", label: "Semua" },
      ...Array.from(new Set(groups.map((g) => g.studyProgram))).map((program) => ({
        value: program,
        label: program,
      })),
    ],
    [groups]
  );

  const totalKelompok = groups.length;
  const sedangBerjalan = groups.filter((g) => g.status === "aktif").length;
  const averageProgress =
    groups.length === 0 ? 0 : Math.round(groups.reduce((total, g) => total + g.progress, 0) / groups.length);

  const filtered = useMemo(
    () =>
      groups.filter((group) => {
        const keyword = search.toLowerCase();
        const matchSearch =
          keyword === "" ||
          group.code.toLowerCase().includes(keyword) ||
          group.className.toLowerCase().includes(keyword) ||
          group.studyProgram.toLowerCase().includes(keyword) ||
          group.umkmName.toLowerCase().includes(keyword);
        const matchStudyProgram = studyProgramFilter === "all" || group.studyProgram === studyProgramFilter;
        const matchStatus = statusFilter === "all" || group.mentoringStatus === statusFilter;
        return matchSearch && matchStudyProgram && matchStatus;
      }),
    [groups, search, studyProgramFilter, statusFilter]
  );

  return (
    <div>
      <PageHeader
        title="Seluruh Kelompok Bimbingan"
        description="Lihat dan pantau perkembangan seluruh kelompok yang Anda bimbing."
        actions={
          <Link href="/dosen/project">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Project
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Kelompok"
          value={totalKelompok}
          icon={<Layers size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
        />
        <StatCard
          label="Sedang Berjalan"
          value={sedangBerjalan}
          icon={<ClipboardCheck size={22} strokeWidth={2} />}
          iconClassName="bg-orange/10 text-orange"
        />
        <StatCard
          label="Rata-rata Progress"
          value={`${averageProgress}%`}
          icon={<TrendingUp size={22} strokeWidth={2} />}
          iconClassName="bg-green-100 text-green-700"
        />
      </div>

      <FilterToolbar className="mb-6">
        <Input
          id="search-kelompok"
          placeholder="Cari nama kelompok / kelas / program studi / UMKM..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-[300px]"
        />
        <Select
          id="filter-prodi"
          options={studyProgramOptions}
          value={studyProgramFilter}
          onChange={(e) => setStudyProgramFilter(e.target.value)}
          className="w-full sm:w-[190px]"
        />
        <Select
          id="filter-tahap"
          options={STAGE_OPTIONS}
          value="all"
          disabled
          className="w-full sm:w-[190px]"
        />
        <Select
          id="filter-status"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | KelompokMentoringStatus)}
          className="w-full sm:w-[180px]"
        />
      </FilterToolbar>

      <Card className="min-w-0 rounded-2xl p-5">
        {!isHydrated ? null : groups.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-navy">Belum ada kelompok bimbingan.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-navy">Kelompok tidak ditemukan</p>
            <p className="mt-1 text-sm text-muted">Coba ubah kata pencarian atau filter yang digunakan.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-soft-gray-dark">
            {filtered.map((group) => (
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
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {group.studyProgram} &middot; {group.className}
                    </p>
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
                    Lihat Detail
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
