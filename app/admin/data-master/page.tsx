"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, Store } from "lucide-react";
import { PageHeader, StatCard, Modal, StudentPickerModal } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, Button, Input, Select, Textarea, ActionMenu } from "@/components/ui";
import {
  BUSINESS_SECTOR_OPTIONS,
  isKelasUsedByKelompok,
  isMataKuliahUsedByKelas,
  isUmkmUsedByKelompok,
  toStudentOption,
  type ActiveStatus,
  type Kelas,
  type MataKuliah,
  type Semester,
  type UmkmMaster,
} from "@/lib/adminMasterData";
import { useKelas, useMataKuliah, useUmkmMaster } from "@/lib/useAdminMasterData";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";

const SEMESTER_OPTIONS: { value: Semester; label: string }[] = [
  { value: "Ganjil", label: "Ganjil" },
  { value: "Genap", label: "Genap" },
];

type ConfirmAction =
  | { entity: "mk"; kind: "toggle"; id: string }
  | { entity: "mk"; kind: "delete"; id: string }
  | { entity: "mk"; kind: "blocked"; id: string }
  | { entity: "kelas"; kind: "toggle"; id: string }
  | { entity: "kelas"; kind: "delete"; id: string }
  | { entity: "kelas"; kind: "blocked"; id: string }
  | { entity: "umkm"; kind: "toggle"; id: string }
  | { entity: "umkm"; kind: "delete"; id: string }
  | { entity: "umkm"; kind: "blocked"; id: string };

const ENTITY_LABEL = { mk: "mata kuliah", kelas: "kelas", umkm: "UMKM" };
const BLOCKED_MESSAGE = {
  mk: "Mata kuliah ini sudah digunakan oleh kelas dan tidak dapat dihapus. Nonaktifkan data sebagai gantinya.",
  kelas: "Kelas ini sudah memiliki relasi kelompok bimbingan dan tidak dapat dihapus. Nonaktifkan data sebagai gantinya.",
  umkm: "UMKM ini sudah terhubung dengan kelompok/project dan tidak dapat dihapus. Nonaktifkan data sebagai gantinya.",
};

export default function DataMasterPage() {
  const { mataKuliah, isHydrated: mkHydrated, updateMataKuliah, removeMataKuliah } = useMataKuliah();
  const { kelasList, isHydrated: kelasHydrated, updateKelas, removeKelas } = useKelas();
  const { umkmMasterList, isHydrated: umkmHydrated, updateUmkmMaster, removeUmkmMaster } = useUmkmMaster();
  const { users, isHydrated: usersHydrated } = useAdminUsers();
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const isHydrated = mkHydrated && kelasHydrated && umkmHydrated && usersHydrated && groupsHydrated;

  const [mkSearch, setMkSearch] = useState("");
  const [mkStatusFilter, setMkStatusFilter] = useState<"all" | ActiveStatus>("all");

  const [kelasSearch, setKelasSearch] = useState("");
  const [kelasSemesterFilter, setKelasSemesterFilter] = useState<"all" | Semester>("all");
  const [kelasDosenFilter, setKelasDosenFilter] = useState("all");

  const [umkmSearch, setUmkmSearch] = useState("");
  const [umkmSectorFilter, setUmkmSectorFilter] = useState("all");
  const [umkmStatusFilter, setUmkmStatusFilter] = useState<"all" | "connected" | "disconnected">("all");

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [editMk, setEditMk] = useState<MataKuliah | null>(null);
  const [editKelas, setEditKelas] = useState<Kelas | null>(null);
  const [editUmkm, setEditUmkm] = useState<UmkmMaster | null>(null);
  const [manageStudentsKelasId, setManageStudentsKelasId] = useState<string | null>(null);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);

  const dosenUsers = users.filter((u) => u.role === "dosen" && u.isActive);
  const mahasiswaUsers = users.filter((u) => u.role === "mahasiswa" && u.isActive);
  const groupClassNames = groups.map((g) => g.className);
  const groupUmkmNames = groups.map((g) => g.umkmName);

  const filteredMataKuliah = useMemo(() => {
    const keyword = mkSearch.toLowerCase();
    return mataKuliah.filter((m) => {
      const matchesSearch =
        keyword === "" || m.kode.toLowerCase().includes(keyword) || m.nama.toLowerCase().includes(keyword);
      const matchesStatus = mkStatusFilter === "all" || m.status === mkStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [mataKuliah, mkSearch, mkStatusFilter]);

  const filteredKelas = useMemo(() => {
    const keyword = kelasSearch.toLowerCase();
    return kelasList.filter((k) => {
      const matchesSearch = keyword === "" || k.nama.toLowerCase().includes(keyword);
      const matchesSemester = kelasSemesterFilter === "all" || k.semester === kelasSemesterFilter;
      const matchesDosen = kelasDosenFilter === "all" || k.dosenId === kelasDosenFilter;
      return matchesSearch && matchesSemester && matchesDosen;
    });
  }, [kelasList, kelasSearch, kelasSemesterFilter, kelasDosenFilter]);

  const filteredUmkm = useMemo(() => {
    const keyword = umkmSearch.toLowerCase();
    return umkmMasterList.filter((u) => {
      const matchesSearch =
        keyword === "" ||
        u.namaUsaha.toLowerCase().includes(keyword) ||
        u.namaPemilik.toLowerCase().includes(keyword);
      const matchesSector = umkmSectorFilter === "all" || u.sektorUsaha === umkmSectorFilter;
      const connected = isUmkmUsedByKelompok(u.namaUsaha, groupUmkmNames);
      const matchesStatus =
        umkmStatusFilter === "all" ||
        (umkmStatusFilter === "connected" && connected) ||
        (umkmStatusFilter === "disconnected" && !connected);
      return matchesSearch && matchesSector && matchesStatus;
    });
  }, [umkmMasterList, umkmSearch, umkmSectorFilter, umkmStatusFilter, groupUmkmNames]);

  if (!isHydrated) {
    return null;
  }

  function handleToggleMk(item: MataKuliah) {
    updateMataKuliah({ ...item, status: item.status === "aktif" ? "tidak_aktif" : "aktif" });
    setConfirmAction(null);
  }

  function handleDeleteMk(id: string) {
    removeMataKuliah(id);
    setConfirmAction(null);
  }

  function handleToggleKelas(item: Kelas) {
    updateKelas({ ...item, status: item.status === "aktif" ? "tidak_aktif" : "aktif" });
    setConfirmAction(null);
  }

  function handleDeleteKelas(id: string) {
    removeKelas(id);
    setConfirmAction(null);
  }

  function handleToggleUmkm(item: UmkmMaster) {
    updateUmkmMaster({ ...item, status: item.status === "aktif" ? "tidak_aktif" : "aktif" });
    setConfirmAction(null);
  }

  function handleDeleteUmkm(id: string) {
    removeUmkmMaster(id);
    setConfirmAction(null);
  }

  const manageStudentsKelas = kelasList.find((k) => k.id === manageStudentsKelasId) ?? null;
  const kelasStudents = manageStudentsKelas
    ? mahasiswaUsers.filter((u) => manageStudentsKelas.studentIds.includes(u.id))
    : [];
  const pickerCandidates = manageStudentsKelas
    ? mahasiswaUsers.filter((u) => !manageStudentsKelas.studentIds.includes(u.id)).map(toStudentOption)
    : [];

  function handleRemoveStudent(studentId: string) {
    if (!manageStudentsKelas) return;
    updateKelas({ ...manageStudentsKelas, studentIds: manageStudentsKelas.studentIds.filter((id) => id !== studentId) });
  }

  return (
    <div>
      <PageHeader
        title="Data Master"
        description="Kelola mata kuliah, kelas, dan UMKM mitra yang digunakan dalam sistem."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Mata Kuliah"
          value={mataKuliah.length}
          icon={<BookOpen size={22} strokeWidth={2} />}
          iconClassName="bg-purple/10 text-purple"
          accentClassName="bg-purple"
        />
        <StatCard
          label="Total Kelas"
          value={kelasList.length}
          icon={<GraduationCap size={22} strokeWidth={2} />}
          iconClassName="bg-orange/10 text-orange"
          accentClassName="bg-orange"
        />
        <StatCard
          label="Total UMKM Mitra"
          value={umkmMasterList.length}
          icon={<Store size={22} strokeWidth={2} />}
          iconClassName="bg-pink/10 text-pink"
          accentClassName="bg-pink"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader className="flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Mata Kuliah</CardTitle>
              <p className="mt-0.5 text-xs text-muted">{mataKuliah.length} data</p>
            </div>
            <Link href="/admin/data-master/tambah-mata-kuliah">
              <Button variant="secondary" size="sm">
                + Tambah Mata Kuliah
              </Button>
            </Link>
          </CardHeader>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,1fr)_160px]">
            <Input
              id="search-mk"
              placeholder="Cari kode/nama..."
              value={mkSearch}
              onChange={(e) => setMkSearch(e.target.value)}
            />
            <Select
              id="filter-mk-status"
              options={[
                { value: "all", label: "Semua Status" },
                { value: "aktif", label: "Aktif" },
                { value: "tidak_aktif", label: "Tidak Aktif" },
              ]}
              value={mkStatusFilter}
              onChange={(e) => setMkStatusFilter(e.target.value as "all" | ActiveStatus)}
            />
          </div>

          {filteredMataKuliah.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Belum ada data mata kuliah.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-purple/5">
                  <tr>
                    <th className="rounded-l-xl px-3 py-2.5 font-medium text-navy">Kode</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Nama Mata Kuliah</th>
                    <th className="px-3 py-2.5 font-medium text-navy">SKS</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Status</th>
                    <th className="rounded-r-xl px-3 py-2.5 font-medium text-navy">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-gray-dark">
                  {filteredMataKuliah.map((item) => {
                    const used = isMataKuliahUsedByKelas(item.id, kelasList);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-3 font-medium text-navy">{item.kode}</td>
                        <td className="px-3 py-3 text-muted">{item.nama}</td>
                        <td className="px-3 py-3 text-muted">{item.sks}</td>
                        <td className="px-3 py-3">
                          <Badge variant={item.status === "aktif" ? "green" : "gray"}>
                            {item.status === "aktif" ? "Aktif" : "Tidak Aktif"}
                          </Badge>
                        </td>
                        <td className="w-[70px] px-3 py-3">
                          <ActionMenu
                            items={[
                              { label: "Lihat/Edit", onClick: () => setEditMk(item) },
                              {
                                label: item.status === "aktif" ? "Nonaktifkan" : "Aktifkan",
                                onClick: () => setConfirmAction({ entity: "mk", kind: "toggle", id: item.id }),
                              },
                              {
                                label: "Hapus",
                                variant: "danger",
                                onClick: () =>
                                  setConfirmAction({ entity: "mk", kind: used ? "blocked" : "delete", id: item.id }),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader className="flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Kelas</CardTitle>
              <p className="mt-0.5 text-xs text-muted">{kelasList.length} kelas</p>
            </div>
            <Link href="/admin/data-master/tambah-kelas">
              <Button variant="secondary" size="sm">
                + Tambah Kelas
              </Button>
            </Link>
          </CardHeader>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,1fr)_150px_170px]">
            <Input
              id="search-kelas"
              placeholder="Cari kelas..."
              value={kelasSearch}
              onChange={(e) => setKelasSearch(e.target.value)}
            />
            <Select
              id="filter-kelas-semester"
              options={[{ value: "all", label: "Semua Semester" }, ...SEMESTER_OPTIONS]}
              value={kelasSemesterFilter}
              onChange={(e) => setKelasSemesterFilter(e.target.value as "all" | Semester)}
            />
            <Select
              id="filter-kelas-dosen"
              options={[
                { value: "all", label: "Semua Dosen" },
                ...dosenUsers.map((d) => ({ value: d.id, label: d.name })),
              ]}
              value={kelasDosenFilter}
              onChange={(e) => setKelasDosenFilter(e.target.value)}
            />
          </div>

          {filteredKelas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Belum ada kelas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-purple/5">
                  <tr>
                    <th className="rounded-l-xl px-3 py-2.5 font-medium text-navy">Nama Kelas</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Prodi</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Mata Kuliah</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Dosen</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Mahasiswa</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Status</th>
                    <th className="rounded-r-xl px-3 py-2.5 font-medium text-navy">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-gray-dark">
                  {filteredKelas.map((item) => {
                    const mk = mataKuliah.find((m) => m.id === item.mataKuliahId);
                    const dosen = users.find((u) => u.id === item.dosenId);
                    const used = isKelasUsedByKelompok(item.nama, groupClassNames);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-3 font-medium text-navy">{item.nama}</td>
                        <td className="px-3 py-3 text-muted">{item.programStudi}</td>
                        <td className="px-3 py-3 text-muted">{mk?.nama ?? "-"}</td>
                        <td className="px-3 py-3 text-muted">{dosen?.name ?? "-"}</td>
                        <td className="px-3 py-3 text-muted">{item.studentIds.length} mahasiswa</td>
                        <td className="px-3 py-3">
                          <Badge variant={item.status === "aktif" ? "green" : "gray"}>
                            {item.status === "aktif" ? "Aktif" : "Tidak Aktif"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => setManageStudentsKelasId(item.id)}>
                              Kelola Mahasiswa
                            </Button>
                            <ActionMenu
                              items={[
                                { label: "Lihat/Edit", onClick: () => setEditKelas(item) },
                                {
                                  label: item.status === "aktif" ? "Nonaktifkan" : "Aktifkan",
                                  onClick: () => setConfirmAction({ entity: "kelas", kind: "toggle", id: item.id }),
                                },
                                {
                                  label: "Hapus",
                                  variant: "danger",
                                  onClick: () =>
                                    setConfirmAction({
                                      entity: "kelas",
                                      kind: used ? "blocked" : "delete",
                                      id: item.id,
                                    }),
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6 min-w-0 rounded-2xl p-6">
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg">UMKM Mitra</CardTitle>
            <p className="mt-0.5 text-xs text-muted">{umkmMasterList.length} UMKM</p>
          </div>
          <Link href="/admin/data-master/tambah-umkm">
            <Button variant="secondary" size="sm">
              + Tambah UMKM Mitra
            </Button>
          </Link>
        </CardHeader>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(280px,1fr)_170px_170px]">
          <Input
            id="search-umkm"
            placeholder="Cari nama usaha/pemilik..."
            value={umkmSearch}
            onChange={(e) => setUmkmSearch(e.target.value)}
          />
          <Select
            id="filter-umkm-sektor"
            options={[
              { value: "all", label: "Semua Sektor" },
              ...BUSINESS_SECTOR_OPTIONS.map((s) => ({ value: s, label: s })),
            ]}
            value={umkmSectorFilter}
            onChange={(e) => setUmkmSectorFilter(e.target.value)}
          />
          <Select
            id="filter-umkm-status"
            options={[
              { value: "all", label: "Semua Relasi" },
              { value: "connected", label: "Terhubung" },
              { value: "disconnected", label: "Belum Terhubung" },
            ]}
            value={umkmStatusFilter}
            onChange={(e) => setUmkmStatusFilter(e.target.value as "all" | "connected" | "disconnected")}
          />
        </div>

        {filteredUmkm.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Belum ada UMKM mitra.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-purple/5">
                <tr>
                  <th className="rounded-l-xl px-3 py-2.5 font-medium text-navy">Nama Usaha</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Pemilik</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Sektor</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Kontak</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Email</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Alamat</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Status Relasi</th>
                  <th className="rounded-r-xl px-3 py-2.5 font-medium text-navy">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-gray-dark">
                {filteredUmkm.map((item) => {
                  const connected = isUmkmUsedByKelompok(item.namaUsaha, groupUmkmNames);
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-medium text-navy">{item.namaUsaha}</td>
                      <td className="px-3 py-3 text-muted">{item.namaPemilik}</td>
                      <td className="px-3 py-3 text-muted">{item.sektorUsaha}</td>
                      <td className="px-3 py-3 text-muted">{item.kontak ?? "-"}</td>
                      <td className="px-3 py-3 text-muted">{item.email ?? "-"}</td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-muted" title={item.alamat}>
                        {item.alamat}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={connected ? "green" : "gray"}>{connected ? "Terhubung" : "Belum Terhubung"}</Badge>
                      </td>
                      <td className="w-[70px] px-3 py-3">
                        <ActionMenu
                          items={[
                            { label: "Lihat/Edit", onClick: () => setEditUmkm(item) },
                            {
                              label: item.status === "aktif" ? "Nonaktifkan" : "Aktifkan",
                              onClick: () => setConfirmAction({ entity: "umkm", kind: "toggle", id: item.id }),
                            },
                            {
                              label: "Hapus",
                              variant: "danger",
                              onClick: () =>
                                setConfirmAction({
                                  entity: "umkm",
                                  kind: connected ? "blocked" : "delete",
                                  id: item.id,
                                }),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Mata Kuliah edit modal */}
      <Modal open={!!editMk} onClose={() => setEditMk(null)} title="Edit Mata Kuliah">
        {editMk && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateMataKuliah(editMk);
              setEditMk(null);
            }}
          >
            <Input label="Kode Mata Kuliah" id="edit-mk-kode" value={editMk.kode} onChange={(e) => setEditMk({ ...editMk, kode: e.target.value.toUpperCase() })} />
            <Input label="Nama Mata Kuliah" id="edit-mk-nama" value={editMk.nama} onChange={(e) => setEditMk({ ...editMk, nama: e.target.value })} />
            <Input
              label="SKS"
              id="edit-mk-sks"
              type="number"
              min={1}
              max={6}
              value={editMk.sks}
              onChange={(e) => setEditMk({ ...editMk, sks: Number(e.target.value) })}
            />
            <Select
              label="Semester"
              id="edit-mk-semester"
              options={SEMESTER_OPTIONS}
              value={editMk.semester}
              onChange={(e) => setEditMk({ ...editMk, semester: e.target.value as Semester })}
            />
            <Input
              label="Tahun Ajaran"
              id="edit-mk-tahun"
              value={editMk.tahunAjaran}
              onChange={(e) => setEditMk({ ...editMk, tahunAjaran: e.target.value })}
            />
            <Select
              label="Status"
              id="edit-mk-status"
              options={[
                { value: "aktif", label: "Aktif" },
                { value: "tidak_aktif", label: "Tidak Aktif" },
              ]}
              value={editMk.status}
              onChange={(e) => setEditMk({ ...editMk, status: e.target.value as ActiveStatus })}
            />
            <Textarea
              label="Deskripsi"
              id="edit-mk-deskripsi"
              maxLength={500}
              value={editMk.deskripsi ?? ""}
              onChange={(e) => setEditMk({ ...editMk, deskripsi: e.target.value })}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditMk(null)}>
                Batal
              </Button>
              <Button type="submit" variant="secondary">
                Simpan
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Kelas edit modal */}
      <Modal open={!!editKelas} onClose={() => setEditKelas(null)} title="Edit Kelas">
        {editKelas && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateKelas(editKelas);
              setEditKelas(null);
            }}
          >
            <Input label="Nama Kelas" id="edit-kelas-nama" value={editKelas.nama} onChange={(e) => setEditKelas({ ...editKelas, nama: e.target.value })} />
            <Select
              label="Mata Kuliah"
              id="edit-kelas-mk"
              options={mataKuliah.filter((m) => m.status === "aktif" || m.id === editKelas.mataKuliahId).map((m) => ({ value: m.id, label: m.nama }))}
              value={editKelas.mataKuliahId}
              onChange={(e) => setEditKelas({ ...editKelas, mataKuliahId: e.target.value })}
            />
            <Select
              label="Dosen Pengampu"
              id="edit-kelas-dosen"
              options={dosenUsers.map((d) => ({ value: d.id, label: d.name }))}
              value={editKelas.dosenId}
              onChange={(e) => setEditKelas({ ...editKelas, dosenId: e.target.value })}
            />
            <Select
              label="Semester"
              id="edit-kelas-semester"
              options={SEMESTER_OPTIONS}
              value={editKelas.semester}
              onChange={(e) => setEditKelas({ ...editKelas, semester: e.target.value as Semester })}
            />
            <Input
              label="Tahun Ajaran"
              id="edit-kelas-tahun"
              value={editKelas.tahunAjaran}
              onChange={(e) => setEditKelas({ ...editKelas, tahunAjaran: e.target.value })}
            />
            <Select
              label="Status"
              id="edit-kelas-status"
              options={[
                { value: "aktif", label: "Aktif" },
                { value: "tidak_aktif", label: "Tidak Aktif" },
              ]}
              value={editKelas.status}
              onChange={(e) => setEditKelas({ ...editKelas, status: e.target.value as ActiveStatus })}
            />
            <Textarea
              label="Catatan"
              id="edit-kelas-catatan"
              maxLength={500}
              value={editKelas.catatan ?? ""}
              onChange={(e) => setEditKelas({ ...editKelas, catatan: e.target.value })}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditKelas(null)}>
                Batal
              </Button>
              <Button type="submit" variant="secondary">
                Simpan
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* UMKM edit modal */}
      <Modal open={!!editUmkm} onClose={() => setEditUmkm(null)} title="Edit UMKM Mitra">
        {editUmkm && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateUmkmMaster(editUmkm);
              setEditUmkm(null);
            }}
          >
            <Input label="Nama Usaha" id="edit-umkm-nama" value={editUmkm.namaUsaha} onChange={(e) => setEditUmkm({ ...editUmkm, namaUsaha: e.target.value })} />
            <Input label="Nama Pemilik" id="edit-umkm-pemilik" value={editUmkm.namaPemilik} onChange={(e) => setEditUmkm({ ...editUmkm, namaPemilik: e.target.value })} />
            <Select
              label="Sektor Usaha"
              id="edit-umkm-sektor"
              options={BUSINESS_SECTOR_OPTIONS.map((s) => ({ value: s, label: s }))}
              value={editUmkm.sektorUsaha}
              onChange={(e) => setEditUmkm({ ...editUmkm, sektorUsaha: e.target.value })}
            />
            <Input label="Kontak" id="edit-umkm-kontak" value={editUmkm.kontak ?? ""} onChange={(e) => setEditUmkm({ ...editUmkm, kontak: e.target.value })} />
            <Input label="Email" id="edit-umkm-email" type="email" value={editUmkm.email ?? ""} onChange={(e) => setEditUmkm({ ...editUmkm, email: e.target.value })} />
            <Input label="Media Sosial" id="edit-umkm-sosmed" value={editUmkm.mediaSosial ?? ""} onChange={(e) => setEditUmkm({ ...editUmkm, mediaSosial: e.target.value })} />
            <Input label="Alamat" id="edit-umkm-alamat" value={editUmkm.alamat} onChange={(e) => setEditUmkm({ ...editUmkm, alamat: e.target.value })} />
            <Textarea
              label="Deskripsi Usaha"
              id="edit-umkm-deskripsi"
              maxLength={1000}
              value={editUmkm.deskripsiUsaha ?? ""}
              onChange={(e) => setEditUmkm({ ...editUmkm, deskripsiUsaha: e.target.value })}
            />
            <Select
              label="Status"
              id="edit-umkm-status"
              options={[
                { value: "aktif", label: "Aktif" },
                { value: "tidak_aktif", label: "Tidak Aktif" },
              ]}
              value={editUmkm.status}
              onChange={(e) => setEditUmkm({ ...editUmkm, status: e.target.value as ActiveStatus })}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditUmkm(null)}>
                Batal
              </Button>
              <Button type="submit" variant="secondary">
                Simpan
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Kelola Mahasiswa modal */}
      <Modal
        open={!!manageStudentsKelas}
        onClose={() => setManageStudentsKelasId(null)}
        title={`Kelola Mahasiswa — ${manageStudentsKelas?.nama ?? ""}`}
        maxWidthClassName="max-w-xl"
      >
        {manageStudentsKelas && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{kelasStudents.length} mahasiswa dipilih</p>
              <Button type="button" variant="secondary" size="sm" onClick={() => setStudentPickerOpen(true)}>
                + Tambah Mahasiswa
              </Button>
            </div>
            {kelasStudents.length === 0 ? (
              <p className="rounded-xl bg-soft-gray px-4 py-6 text-center text-sm text-muted">
                Belum ada mahasiswa pada kelas ini.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-soft-gray-dark">
                <table className="w-full text-left text-sm">
                  <thead className="bg-purple/5">
                    <tr>
                      <th className="px-3 py-2 font-medium text-navy">NIM</th>
                      <th className="px-3 py-2 font-medium text-navy">Nama</th>
                      <th className="px-3 py-2 font-medium text-navy">Angkatan</th>
                      <th className="px-3 py-2 font-medium text-navy">Status</th>
                      <th className="px-3 py-2 font-medium text-navy">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft-gray-dark">
                    {kelasStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-3 py-2 text-navy">{student.nim}</td>
                        <td className="px-3 py-2 text-navy">{student.name}</td>
                        <td className="px-3 py-2 text-muted">{student.angkatan ?? "-"}</td>
                        <td className="px-3 py-2">
                          <Badge variant="green">Aktif</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveStudent(student.id)}>
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => setManageStudentsKelasId(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <StudentPickerModal
        open={studentPickerOpen}
        onClose={() => setStudentPickerOpen(false)}
        students={pickerCandidates}
        takenStudentIds={new Set()}
        remainingSlots={9999}
        title="Tambah Mahasiswa ke Kelas"
        onConfirm={(selected) => {
          if (!manageStudentsKelas) return;
          updateKelas({
            ...manageStudentsKelas,
            studentIds: [...manageStudentsKelas.studentIds, ...selected.map((s) => s.id)],
          });
          setStudentPickerOpen(false);
        }}
      />

      {/* Confirm modal */}
      <Modal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.kind === "blocked"
            ? `${ENTITY_LABEL[confirmAction.entity].replace(/^./, (c) => c.toUpperCase())} tidak dapat dihapus`
            : confirmAction?.kind === "delete"
              ? `Hapus ${confirmAction ? ENTITY_LABEL[confirmAction.entity] : ""}?`
              : "Ubah status data?"
        }
      >
        {confirmAction && (
          <>
            <p className="text-sm text-muted">
              {confirmAction.kind === "blocked"
                ? BLOCKED_MESSAGE[confirmAction.entity]
                : confirmAction.kind === "delete"
                  ? "Tindakan ini tidak dapat dibatalkan."
                  : "Data yang dinonaktifkan tidak akan muncul pada pilihan pembuatan relasi baru, tetapi tetap tampil pada data yang sudah ada."}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              {confirmAction.kind === "blocked" ? (
                <Button variant="secondary" onClick={() => setConfirmAction(null)}>
                  Mengerti
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setConfirmAction(null)}>
                    Batal
                  </Button>
                  <Button
                    variant={confirmAction.kind === "delete" ? "danger" : "secondary"}
                    onClick={() => {
                      const action = confirmAction;
                      if (action.entity === "mk") {
                        const item = mataKuliah.find((m) => m.id === action.id);
                        if (!item) return;
                        if (action.kind === "toggle") handleToggleMk(item);
                        else handleDeleteMk(item.id);
                      } else if (action.entity === "kelas") {
                        const item = kelasList.find((k) => k.id === action.id);
                        if (!item) return;
                        if (action.kind === "toggle") handleToggleKelas(item);
                        else handleDeleteKelas(item.id);
                      } else {
                        const item = umkmMasterList.find((u) => u.id === action.id);
                        if (!item) return;
                        if (action.kind === "toggle") handleToggleUmkm(item);
                        else handleDeleteUmkm(item.id);
                      }
                    }}
                  >
                    {confirmAction.kind === "delete" ? "Hapus" : "Konfirmasi"}
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
