"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, GraduationCap, Store } from "lucide-react";
import { PageHeader, StatCard, Modal } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, Button, Input, Select, Textarea, ActionMenu } from "@/components/ui";
import { BUSINESS_SECTOR_OPTIONS, type MataKuliah, type Kelas, type UmkmMaster } from "@/lib/adminMasterData";
import { useKelas, useMataKuliah, useUmkmMaster, useDosenOptions } from "@/lib/useAdminMasterData";

type ConfirmAction =
  | { entity: "mk"; id: string }
  | { entity: "kelas"; id: string };

const ENTITY_LABEL = { mk: "mata kuliah", kelas: "kelas" };

export default function DataMasterPage() {
  const { mataKuliah, isHydrated: mkHydrated, updateMataKuliah, removeMataKuliah } = useMataKuliah();
  const { kelasList, isHydrated: kelasHydrated, updateKelas, removeKelas } = useKelas();
  const { umkmMasterList, isHydrated: umkmHydrated, updateUmkmMaster } = useUmkmMaster();
  const { dosenOptions, isHydrated: dosenHydrated } = useDosenOptions();
  const isHydrated = mkHydrated && kelasHydrated && umkmHydrated && dosenHydrated;

  const [mkSearch, setMkSearch] = useState("");
  const [kelasSearch, setKelasSearch] = useState("");
  const [kelasDosenFilter, setKelasDosenFilter] = useState("all");
  const [umkmSearch, setUmkmSearch] = useState("");
  const [umkmSectorFilter, setUmkmSectorFilter] = useState("all");

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmError, setConfirmError] = useState("");
  const [editMk, setEditMk] = useState<MataKuliah | null>(null);
  const [editKelas, setEditKelas] = useState<Kelas | null>(null);
  const [editUmkm, setEditUmkm] = useState<UmkmMaster | null>(null);
  const [saveError, setSaveError] = useState("");

  const filteredMataKuliah = useMemo(() => {
    const keyword = mkSearch.toLowerCase();
    return mataKuliah.filter(
      (m) => keyword === "" || m.kode.toLowerCase().includes(keyword) || m.nama.toLowerCase().includes(keyword)
    );
  }, [mataKuliah, mkSearch]);

  const filteredKelas = useMemo(() => {
    const keyword = kelasSearch.toLowerCase();
    return kelasList.filter((k) => {
      const matchesSearch = keyword === "" || k.nama.toLowerCase().includes(keyword);
      const matchesDosen = kelasDosenFilter === "all" || k.dosenId === kelasDosenFilter;
      return matchesSearch && matchesDosen;
    });
  }, [kelasList, kelasSearch, kelasDosenFilter]);

  const filteredUmkm = useMemo(() => {
    const keyword = umkmSearch.toLowerCase();
    return umkmMasterList.filter((u) => {
      const matchesSearch = keyword === "" || u.namaUsaha.toLowerCase().includes(keyword);
      const matchesSector = umkmSectorFilter === "all" || u.sektorUsaha === umkmSectorFilter;
      return matchesSearch && matchesSector;
    });
  }, [umkmMasterList, umkmSearch, umkmSectorFilter]);

  if (!isHydrated) {
    return null;
  }

  async function handleConfirmDelete() {
    if (!confirmAction) return;
    setConfirmError("");
    try {
      if (confirmAction.entity === "mk") {
        await removeMataKuliah(confirmAction.id);
      } else {
        await removeKelas(confirmAction.id);
      }
      setConfirmAction(null);
    } catch (error) {
      console.error("Failed to delete", error);
      const label = ENTITY_LABEL[confirmAction.entity];
      setConfirmError(
        `${label.replace(/^./, (c) => c.toUpperCase())} ini sudah digunakan di tempat lain dan tidak dapat dihapus.`
      );
    }
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

          <div className="mb-4">
            <Input
              id="search-mk"
              placeholder="Cari kode/nama..."
              value={mkSearch}
              onChange={(e) => setMkSearch(e.target.value)}
            />
          </div>

          {filteredMataKuliah.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Belum ada data mata kuliah.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-purple/5">
                  <tr>
                    <th className="rounded-l-xl px-3 py-2.5 font-medium text-navy">Kode</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Nama Mata Kuliah</th>
                    <th className="px-3 py-2.5 font-medium text-navy">SKS</th>
                    <th className="rounded-r-xl px-3 py-2.5 font-medium text-navy">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-gray-dark">
                  {filteredMataKuliah.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-medium text-navy">{item.kode}</td>
                      <td className="px-3 py-3 text-muted">{item.nama}</td>
                      <td className="px-3 py-3 text-muted">{item.sks}</td>
                      <td className="w-[70px] px-3 py-3">
                        <ActionMenu
                          items={[
                            {
                              label: "Lihat/Edit",
                              onClick: () => {
                                setSaveError("");
                                setEditMk(item);
                              },
                            },
                            {
                              label: "Hapus",
                              variant: "danger",
                              onClick: () => {
                                setConfirmError("");
                                setConfirmAction({ entity: "mk", id: item.id });
                              },
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

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              id="search-kelas"
              placeholder="Cari kelas..."
              value={kelasSearch}
              onChange={(e) => setKelasSearch(e.target.value)}
            />
            <Select
              id="filter-kelas-dosen"
              options={[
                { value: "all", label: "Semua Dosen" },
                ...dosenOptions.map((d) => ({ value: d.id, label: d.name })),
              ]}
              value={kelasDosenFilter}
              onChange={(e) => setKelasDosenFilter(e.target.value)}
            />
          </div>

          {filteredKelas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Belum ada kelas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-purple/5">
                  <tr>
                    <th className="rounded-l-xl px-3 py-2.5 font-medium text-navy">Nama Kelas</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Mata Kuliah</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Dosen</th>
                    <th className="px-3 py-2.5 font-medium text-navy">Semester</th>
                    <th className="rounded-r-xl px-3 py-2.5 font-medium text-navy">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft-gray-dark">
                  {filteredKelas.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 font-medium text-navy">{item.nama}</td>
                      <td className="px-3 py-3 text-muted">{item.mataKuliahNama}</td>
                      <td className="px-3 py-3 text-muted">{item.dosenNama}</td>
                      <td className="px-3 py-3 text-muted">
                        {item.semester} {item.tahunAjaran}
                      </td>
                      <td className="px-3 py-3">
                        <ActionMenu
                          items={[
                            {
                              label: "Lihat/Edit",
                              onClick: () => {
                                setSaveError("");
                                setEditKelas(item);
                              },
                            },
                            {
                              label: "Hapus",
                              variant: "danger",
                              onClick: () => {
                                setConfirmError("");
                                setConfirmAction({ entity: "kelas", id: item.id });
                              },
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
        </Card>
      </div>

      <Card className="mt-6 min-w-0 rounded-2xl p-6">
        <CardHeader className="flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg">UMKM Mitra</CardTitle>
            <p className="mt-0.5 text-xs text-muted">{umkmMasterList.length} UMKM</p>
          </div>
          <Link href="/admin/pengguna/tambah">
            <Button variant="secondary" size="sm">
              + Tambah UMKM (Menu Pengguna)
            </Button>
          </Link>
        </CardHeader>
        <p className="-mt-2 mb-4 text-xs text-muted">
          UMKM selalu memiliki akun login, jadi dibuat/dihapus dari menu Pengguna. Di sini Anda hanya mengedit data usahanya.
        </p>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            id="search-umkm"
            placeholder="Cari nama usaha..."
            value={umkmSearch}
            onChange={(e) => setUmkmSearch(e.target.value)}
          />
          <Select
            id="filter-umkm-sektor"
            options={[{ value: "all", label: "Semua Sektor" }, ...BUSINESS_SECTOR_OPTIONS.map((s) => ({ value: s, label: s }))]}
            value={umkmSectorFilter}
            onChange={(e) => setUmkmSectorFilter(e.target.value)}
          />
        </div>

        {filteredUmkm.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Belum ada UMKM mitra.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-purple/5">
                <tr>
                  <th className="rounded-l-xl px-3 py-2.5 font-medium text-navy">Nama Usaha</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Sektor</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Kontak</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Alamat</th>
                  <th className="px-3 py-2.5 font-medium text-navy">Kelas Terhubung</th>
                  <th className="rounded-r-xl px-3 py-2.5 font-medium text-navy">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soft-gray-dark">
                {filteredUmkm.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-3 font-medium text-navy">{item.namaUsaha}</td>
                    <td className="px-3 py-3 text-muted">{item.sektorUsaha}</td>
                    <td className="px-3 py-3 text-muted">{item.kontak}</td>
                    <td className="max-w-[220px] truncate px-3 py-3 text-muted" title={item.alamat}>
                      {item.alamat}
                    </td>
                    <td className="px-3 py-3">
                      {item.connectedKelasNames.length === 0 ? (
                        <Badge variant="gray">Belum Terhubung</Badge>
                      ) : (
                        <span className="text-muted">{item.connectedKelasNames.join(", ")}</span>
                      )}
                    </td>
                    <td className="w-[70px] px-3 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSaveError("");
                          setEditUmkm(item);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
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
            onSubmit={async (e) => {
              e.preventDefault();
              setSaveError("");
              try {
                await updateMataKuliah(editMk);
                setEditMk(null);
              } catch (error) {
                console.error("Failed to update mata kuliah", error);
                setSaveError("Gagal menyimpan perubahan.");
              }
            }}
          >
            <Input
              label="Kode Mata Kuliah"
              id="edit-mk-kode"
              value={editMk.kode}
              onChange={(e) => setEditMk({ ...editMk, kode: e.target.value.toUpperCase() })}
            />
            <Input
              label="Nama Mata Kuliah"
              id="edit-mk-nama"
              value={editMk.nama}
              onChange={(e) => setEditMk({ ...editMk, nama: e.target.value })}
            />
            <Input
              label="SKS"
              id="edit-mk-sks"
              type="number"
              min={1}
              max={6}
              value={editMk.sks}
              onChange={(e) => setEditMk({ ...editMk, sks: Number(e.target.value) })}
            />
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
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
            onSubmit={async (e) => {
              e.preventDefault();
              setSaveError("");
              try {
                await updateKelas(editKelas);
                setEditKelas(null);
              } catch (error) {
                console.error("Failed to update kelas", error);
                setSaveError("Gagal menyimpan perubahan.");
              }
            }}
          >
            <Input
              label="Nama Kelas"
              id="edit-kelas-nama"
              value={editKelas.nama}
              onChange={(e) => setEditKelas({ ...editKelas, nama: e.target.value })}
            />
            <Select
              label="Mata Kuliah"
              id="edit-kelas-mk"
              options={mataKuliah.map((m) => ({ value: m.id, label: m.nama }))}
              value={editKelas.mataKuliahId}
              onChange={(e) => setEditKelas({ ...editKelas, mataKuliahId: e.target.value })}
            />
            <Select
              label="Dosen Pengampu"
              id="edit-kelas-dosen"
              options={dosenOptions.map((d) => ({ value: d.id, label: d.name }))}
              value={editKelas.dosenId}
              onChange={(e) => setEditKelas({ ...editKelas, dosenId: e.target.value })}
            />
            <Input
              label="Semester"
              id="edit-kelas-semester"
              value={editKelas.semester}
              onChange={(e) => setEditKelas({ ...editKelas, semester: e.target.value })}
            />
            <Input
              label="Tahun Ajaran"
              id="edit-kelas-tahun"
              value={editKelas.tahunAjaran}
              onChange={(e) => setEditKelas({ ...editKelas, tahunAjaran: e.target.value })}
            />
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
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
            onSubmit={async (e) => {
              e.preventDefault();
              setSaveError("");
              try {
                await updateUmkmMaster(editUmkm);
                setEditUmkm(null);
              } catch (error) {
                console.error("Failed to update umkm", error);
                setSaveError("Gagal menyimpan perubahan.");
              }
            }}
          >
            <Input
              label="Nama Usaha"
              id="edit-umkm-nama"
              value={editUmkm.namaUsaha}
              onChange={(e) => setEditUmkm({ ...editUmkm, namaUsaha: e.target.value })}
            />
            <Select
              label="Sektor Usaha"
              id="edit-umkm-sektor"
              options={BUSINESS_SECTOR_OPTIONS.map((s) => ({ value: s, label: s }))}
              value={editUmkm.sektorUsaha}
              onChange={(e) => setEditUmkm({ ...editUmkm, sektorUsaha: e.target.value })}
            />
            <Input
              label="Kontak"
              id="edit-umkm-kontak"
              value={editUmkm.kontak}
              onChange={(e) => setEditUmkm({ ...editUmkm, kontak: e.target.value })}
            />
            <Input
              label="Alamat"
              id="edit-umkm-alamat"
              value={editUmkm.alamat}
              onChange={(e) => setEditUmkm({ ...editUmkm, alamat: e.target.value })}
            />
            <Textarea
              label="Deskripsi Usaha"
              id="edit-umkm-deskripsi"
              maxLength={1000}
              value={editUmkm.deskripsiUsaha}
              onChange={(e) => setEditUmkm({ ...editUmkm, deskripsiUsaha: e.target.value })}
            />
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
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

      {/* Confirm delete modal */}
      <Modal open={!!confirmAction} onClose={() => setConfirmAction(null)} title={`Hapus ${confirmAction ? ENTITY_LABEL[confirmAction.entity] : ""}?`}>
        {confirmAction && (
          <>
            <p className="text-sm text-muted">Tindakan ini tidak dapat dibatalkan.</p>
            {confirmError && <p className="mt-2 text-xs text-red-500">{confirmError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Batal
              </Button>
              <Button variant="danger" onClick={handleConfirmDelete}>
                Hapus
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
