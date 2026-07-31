"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Layers, Store, Users } from "lucide-react";
import { PageHeader, StatCard } from "@/components/shared";
import { Card, Button, Input, Select, ActionMenu } from "@/components/ui";
import { useKelas, useUmkmMaster } from "@/lib/useAdminMasterData";
import { useKelasUmkm } from "@/lib/useKelasUmkm";
import { useAdminMonitoring } from "@/lib/useAdminMonitoring";

const PAGE_SIZE = 10;

export default function SeluruhRelasiKelasPage() {
  const router = useRouter();
  const { kelasList, isHydrated: kelasHydrated } = useKelas();
  const { umkmMasterList, isHydrated: umkmHydrated } = useUmkmMaster();
  const { links, isHydrated: linksHydrated } = useKelasUmkm();
  const { groups, isHydrated: groupsHydrated } = useAdminMonitoring();
  const isHydrated = kelasHydrated && umkmHydrated && linksHydrated && groupsHydrated;

  const [search, setSearch] = useState("");
  const [tahunFilter, setTahunFilter] = useState("all");
  const [dosenFilter, setDosenFilter] = useState("all");
  const [umkmFilter, setUmkmFilter] = useState("all");
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () =>
      kelasList.map((kelas) => {
        const linkedUmkmNames = links
          .filter((l) => l.kelasId === kelas.id)
          .map((l) => umkmMasterList.find((u) => u.id === l.umkmId)?.namaUsaha)
          .filter((n): n is string => !!n);
        const rosterCount = new Set(
          groups.filter((g) => g.className === kelas.nama).flatMap((g) => g.members.map((m) => m.id))
        ).size;
        return { kelas, linkedUmkmNames, rosterCount };
      }),
    [kelasList, links, umkmMasterList, groups]
  );

  const tahunOptions = Array.from(new Set(kelasList.map((k) => k.tahunAjaran)));
  const dosenOptions = Array.from(new Set(kelasList.map((k) => k.dosenNama)));

  const filtered = rows.filter(({ kelas, linkedUmkmNames }) => {
    const keyword = search.toLowerCase();
    const matchesSearch =
      keyword === "" ||
      kelas.nama.toLowerCase().includes(keyword) ||
      kelas.dosenNama.toLowerCase().includes(keyword) ||
      kelas.mataKuliahNama.toLowerCase().includes(keyword) ||
      linkedUmkmNames.some((n) => n.toLowerCase().includes(keyword));
    const matchesTahun = tahunFilter === "all" || kelas.tahunAjaran === tahunFilter;
    const matchesDosen = dosenFilter === "all" || kelas.dosenNama === dosenFilter;
    const matchesUmkm = umkmFilter === "all" || linkedUmkmNames.includes(umkmFilter);
    return matchesSearch && matchesTahun && matchesDosen && matchesUmkm;
  });

  const totalKelas = kelasList.length;
  const umkmTerhubung = new Set(links.map((l) => l.umkmId)).size;
  const totalMahasiswaTerhubung = new Set(groups.flatMap((g) => g.members.map((m) => m.id))).size;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Seluruh Relasi Kelas"
        description="Lihat seluruh kelas beserta dosen pengampu, UMKM mitra, dan mahasiswa yang terhubung."
        actions={
          <Link href="/admin/relasi-kelas">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Relasi Kelas
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Kelas" value={totalKelas} icon={<Layers size={22} strokeWidth={2} />} iconClassName="bg-purple/10 text-purple" accentClassName="bg-purple" />
        <StatCard label="UMKM Terhubung" value={umkmTerhubung} icon={<Store size={22} strokeWidth={2} />} iconClassName="bg-pink/10 text-pink" accentClassName="bg-pink" />
        <StatCard label="Total Mahasiswa Terhubung" value={totalMahasiswaTerhubung} icon={<Users size={22} strokeWidth={2} />} iconClassName="bg-green-100 text-green-700" accentClassName="bg-green-500" />
      </div>

      <Card className="mb-6 rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input
            id="search-relasi"
            placeholder="Cari kelas, dosen, mata kuliah, atau UMKM..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            id="filter-tahun"
            options={[{ value: "all", label: "Semua Tahun" }, ...tahunOptions.map((t) => ({ value: t, label: t }))]}
            value={tahunFilter}
            onChange={(e) => {
              setTahunFilter(e.target.value);
              setPage(1);
            }}
          />
          <Select
            id="filter-dosen"
            options={[{ value: "all", label: "Semua Dosen" }, ...dosenOptions.map((d) => ({ value: d, label: d }))]}
            value={dosenFilter}
            onChange={(e) => {
              setDosenFilter(e.target.value);
              setPage(1);
            }}
          />
          <Select
            id="filter-umkm"
            options={[{ value: "all", label: "Semua UMKM" }, ...umkmMasterList.map((u) => ({ value: u.namaUsaha, label: u.namaUsaha }))]}
            value={umkmFilter}
            onChange={(e) => {
              setUmkmFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      <Card className="min-w-0 rounded-2xl p-6">
        {paginated.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Tidak ada kelas yang cocok dengan filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-purple/5">
                <tr>
                  <th className="rounded-l-xl px-3 py-2.5 font-medium text-navy">Kelas</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Mata Kuliah</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Dosen</th>
                  <th className="px-3 py-2.5 font-medium text-navy">UMKM Mitra</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Semester</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Tahun Ajaran</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Mahasiswa</th>
                  <th className="rounded-r-xl px-3 py-2.5 font-medium text-navy">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-gray-dark">
                {paginated.map(({ kelas, linkedUmkmNames, rosterCount }) => (
                  <tr key={kelas.id}>
                    <td className="px-3 py-3 font-medium text-navy">{kelas.nama}</td>
                    <td className="px-3 py-3 text-muted">{kelas.mataKuliahNama}</td>
                    <td className="px-3 py-3 text-muted">{kelas.dosenNama}</td>
                    <td className="px-3 py-3 text-muted">{linkedUmkmNames.length > 0 ? linkedUmkmNames.join(", ") : "-"}</td>
                    <td className="px-3 py-3 text-muted">{kelas.semester}</td>
                    <td className="px-3 py-3 text-muted">{kelas.tahunAjaran}</td>
                    <td className="px-3 py-3 text-muted">{rosterCount} mahasiswa</td>
                    <td className="w-[70px] px-3 py-3">
                      <ActionMenu
                        items={[
                          { label: "Lihat Detail", onClick: () => router.push(`/admin/relasi-kelas/${kelas.id}`) },
                          { label: "Edit Relasi UMKM", onClick: () => router.push(`/admin/relasi-kelas?kelasId=${kelas.id}`) },
                        ]}
                      />
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
              Menampilkan {rangeStart}–{rangeEnd} dari {filtered.length} kelas
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
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
              <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
