"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Layers, GraduationCap, Store, Users } from "lucide-react";
import { PageHeader, StatCard, Modal } from "@/components/shared";
import { Card, Badge, Button, Input, Select, ActionMenu } from "@/components/ui";
import { useKelas, useMataKuliah, useUmkmMaster } from "@/lib/useAdminMasterData";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { useClassRelations, useClassStudentRelations } from "@/lib/useRelasiKelasData";
import { appendRelationActivity, getActiveStudentIdsForClass, type RelationStatus } from "@/lib/relasiKelasData";

const ADMIN_NAME = "Siti Aminah";
const PAGE_SIZE = 10;

export default function SeluruhRelasiKelasPage() {
  const router = useRouter();
  const { kelasList, isHydrated: kelasHydrated } = useKelas();
  const { mataKuliah, isHydrated: mkHydrated } = useMataKuliah();
  const { umkmMasterList, isHydrated: umkmHydrated } = useUmkmMaster();
  const { users, isHydrated: usersHydrated } = useAdminUsers();
  const { classRelations, isHydrated: relationsHydrated, updateClassRelation } = useClassRelations();
  const { classStudentRelations, isHydrated: studentRelationsHydrated } = useClassStudentRelations();
  const isHydrated = kelasHydrated && mkHydrated && umkmHydrated && usersHydrated && relationsHydrated && studentRelationsHydrated;

  const [search, setSearch] = useState("");
  const [mkFilter, setMkFilter] = useState("all");
  const [tahunFilter, setTahunFilter] = useState("all");
  const [dosenFilter, setDosenFilter] = useState("all");
  const [umkmFilter, setUmkmFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RelationStatus>("all");
  const [page, setPage] = useState(1);
  const [toggleTargetId, setToggleTargetId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      classRelations.map((relation) => {
        const kelas = kelasList.find((k) => k.id === relation.classId);
        const mk = kelas ? mataKuliah.find((m) => m.id === kelas.mataKuliahId) : undefined;
        const dosen = kelas ? users.find((u) => u.id === kelas.dosenId) : undefined;
        const umkm = umkmMasterList.find((u) => u.id === relation.umkmId);
        const studentCount = getActiveStudentIdsForClass(relation.classId, classStudentRelations).length;
        return { relation, kelas, mk, dosen, umkm, studentCount };
      }),
    [classRelations, kelasList, mataKuliah, users, umkmMasterList, classStudentRelations]
  );

  const tahunOptions = Array.from(new Set(kelasList.map((k) => k.tahunAjaran)));
  const dosenUsers = users.filter((u) => u.role === "dosen");

  const filtered = rows.filter(({ relation, kelas, mk, dosen, umkm }) => {
    const keyword = search.toLowerCase();
    const matchesSearch =
      keyword === "" ||
      (kelas?.nama.toLowerCase().includes(keyword) ?? false) ||
      (dosen?.name.toLowerCase().includes(keyword) ?? false) ||
      (mk?.nama.toLowerCase().includes(keyword) ?? false) ||
      (umkm?.namaUsaha.toLowerCase().includes(keyword) ?? false);
    const matchesMk = mkFilter === "all" || kelas?.mataKuliahId === mkFilter;
    const matchesTahun = tahunFilter === "all" || kelas?.tahunAjaran === tahunFilter;
    const matchesDosen = dosenFilter === "all" || kelas?.dosenId === dosenFilter;
    const matchesUmkm = umkmFilter === "all" || relation.umkmId === umkmFilter;
    const matchesStatus = statusFilter === "all" || relation.status === statusFilter;
    return matchesSearch && matchesMk && matchesTahun && matchesDosen && matchesUmkm && matchesStatus;
  });

  const totalRelasi = classRelations.length;
  const kelasAktif = classRelations.filter((r) => r.status === "aktif").length;
  const umkmTerhubung = new Set(classRelations.filter((r) => r.status === "aktif").map((r) => r.umkmId)).size;
  const totalMahasiswaTerhubung = new Set(
    classStudentRelations.filter((r) => r.status === "active").map((r) => r.studentId)
  ).size;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  function resetPage() {
    setPage(1);
  }

  function handleConfirmToggle() {
    const target = classRelations.find((r) => r.id === toggleTargetId);
    if (!target) return;
    const nextStatus: RelationStatus = target.status === "aktif" ? "tidak_aktif" : "aktif";
    updateClassRelation({ ...target, status: nextStatus, updatedAt: new Date().toISOString() });
    const kelasNama = kelasList.find((k) => k.id === target.classId)?.nama ?? target.classId;
    appendRelationActivity(
      ADMIN_NAME,
      nextStatus === "tidak_aktif" ? "Menonaktifkan relasi kelas" : "Mengaktifkan relasi kelas",
      `Admin ${nextStatus === "tidak_aktif" ? "menonaktifkan" : "mengaktifkan"} relasi kelas ${kelasNama}.`
    );
    setToggleTargetId(null);
  }

  if (!isHydrated) {
    return null;
  }

  const toggleTarget = classRelations.find((r) => r.id === toggleTargetId);

  return (
    <div>
      <PageHeader
        title="Seluruh Relasi Kelas"
        description="Lihat dan kelola seluruh relasi kelas, dosen, UMKM, dan mahasiswa."
        actions={
          <Link href="/admin/relasi-kelas">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Relasi Kelas
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Relasi" value={totalRelasi} icon={<Layers size={22} strokeWidth={2} />} iconClassName="bg-purple/10 text-purple" accentClassName="bg-purple" />
        <StatCard label="Kelas Aktif" value={kelasAktif} icon={<GraduationCap size={22} strokeWidth={2} />} iconClassName="bg-orange/10 text-orange" accentClassName="bg-orange" />
        <StatCard label="UMKM Terhubung" value={umkmTerhubung} icon={<Store size={22} strokeWidth={2} />} iconClassName="bg-pink/10 text-pink" accentClassName="bg-pink" />
        <StatCard label="Total Mahasiswa Terhubung" value={totalMahasiswaTerhubung} icon={<Users size={22} strokeWidth={2} />} iconClassName="bg-green-100 text-green-700" accentClassName="bg-green-500" />
      </div>

      <Card className="mb-6 rounded-2xl p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(260px,1.3fr)_150px_140px_150px_160px_140px]">
          <Input
            id="search-relasi"
            placeholder="Cari kelas, dosen, mata kuliah, atau UMKM..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
          <Select
            id="filter-mk"
            options={[{ value: "all", label: "Semua Mata Kuliah" }, ...mataKuliah.map((m) => ({ value: m.id, label: m.nama }))]}
            value={mkFilter}
            onChange={(e) => {
              setMkFilter(e.target.value);
              resetPage();
            }}
          />
          <Select
            id="filter-tahun"
            options={[{ value: "all", label: "Semua Tahun" }, ...tahunOptions.map((t) => ({ value: t, label: t }))]}
            value={tahunFilter}
            onChange={(e) => {
              setTahunFilter(e.target.value);
              resetPage();
            }}
          />
          <Select
            id="filter-dosen"
            options={[{ value: "all", label: "Semua Dosen" }, ...dosenUsers.map((d) => ({ value: d.id, label: d.name }))]}
            value={dosenFilter}
            onChange={(e) => {
              setDosenFilter(e.target.value);
              resetPage();
            }}
          />
          <Select
            id="filter-umkm"
            options={[{ value: "all", label: "Semua UMKM" }, ...umkmMasterList.map((u) => ({ value: u.id, label: u.namaUsaha }))]}
            value={umkmFilter}
            onChange={(e) => {
              setUmkmFilter(e.target.value);
              resetPage();
            }}
          />
          <Select
            id="filter-status"
            options={[
              { value: "all", label: "Semua Status" },
              { value: "aktif", label: "Aktif" },
              { value: "tidak_aktif", label: "Tidak Aktif" },
            ]}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | RelationStatus);
              resetPage();
            }}
          />
        </div>
      </Card>

      <Card className="min-w-0 rounded-2xl p-6">
        {paginated.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Tidak ada relasi yang cocok dengan filter.</p>
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
                  <th className="px-3 py-2.5 font-medium text-navy">Status</th>
                  <th className="rounded-r-xl px-3 py-2.5 font-medium text-navy">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-gray-dark">
                {paginated.map(({ relation, kelas, mk, dosen, umkm, studentCount }) => (
                  <tr key={relation.id}>
                    <td className="px-3 py-3 font-medium text-navy">{kelas?.nama ?? "-"}</td>
                    <td className="px-3 py-3 text-muted">{mk?.nama ?? "-"}</td>
                    <td className="px-3 py-3 text-muted">{dosen?.name ?? "-"}</td>
                    <td className="px-3 py-3 text-muted">{umkm?.namaUsaha ?? "-"}</td>
                    <td className="px-3 py-3 text-muted">{kelas?.semester ?? "-"}</td>
                    <td className="px-3 py-3 text-muted">{kelas?.tahunAjaran ?? "-"}</td>
                    <td className="px-3 py-3 text-muted">{studentCount} mahasiswa</td>
                    <td className="px-3 py-3">
                      <Badge variant={relation.status === "aktif" ? "green" : "gray"}>
                        {relation.status === "aktif" ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </td>
                    <td className="w-[70px] px-3 py-3">
                      <ActionMenu
                        items={[
                          { label: "Lihat Detail", onClick: () => router.push(`/admin/relasi-kelas/${relation.id}`) },
                          {
                            label: "Edit",
                            onClick: () => router.push(`/admin/relasi-kelas?kelasId=${relation.classId}`),
                          },
                          {
                            label: relation.status === "aktif" ? "Nonaktifkan" : "Aktifkan",
                            onClick: () => setToggleTargetId(relation.id),
                          },
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
              Menampilkan {rangeStart}–{rangeEnd} dari {filtered.length} relasi
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

      <Modal
        open={!!toggleTargetId}
        onClose={() => setToggleTargetId(null)}
        title={toggleTarget?.status === "aktif" ? "Nonaktifkan relasi kelas?" : "Aktifkan relasi kelas?"}
      >
        <p className="text-sm text-muted">
          {toggleTarget?.status === "aktif"
            ? "Data project dan kelompok lama tetap tersimpan, tetapi relasi ini tidak dapat digunakan untuk project baru."
            : "Relasi ini akan kembali tersedia untuk digunakan pada project baru."}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setToggleTargetId(null)}>
            Batal
          </Button>
          <Button variant={toggleTarget?.status === "aktif" ? "danger" : "secondary"} onClick={handleConfirmToggle}>
            {toggleTarget?.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
