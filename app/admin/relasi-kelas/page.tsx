"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader, Modal } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, Button, Input, Select, Textarea } from "@/components/ui";
import { useKelas, useMataKuliah, useUmkmMaster } from "@/lib/useAdminMasterData";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { useClassRelations, useClassStudentRelations } from "@/lib/useRelasiKelasData";
import {
  appendRelationActivity,
  findConflictingClassName,
  getActiveStudentIdsForClass,
  hasActiveRelation,
  createClassRelationId,
  type ClassRelation,
  type ClassStudentRelation,
  type RelationStatus,
} from "@/lib/relasiKelasData";

const ADMIN_NAME = "Siti Aminah";

export default function RelasiKelasPage() {
  return (
    <Suspense fallback={null}>
      <RelasiKelasContent />
    </Suspense>
  );
}

function RelasiKelasContent() {
  const { kelasList, isHydrated: kelasHydrated, updateKelas } = useKelas();
  const { mataKuliah, isHydrated: mkHydrated } = useMataKuliah();
  const { umkmMasterList, isHydrated: umkmHydrated } = useUmkmMaster();
  const { users, isHydrated: usersHydrated } = useAdminUsers();
  const { classRelations, isHydrated: relationsHydrated, addClassRelation, updateClassRelation } = useClassRelations();
  const {
    classStudentRelations,
    isHydrated: studentRelationsHydrated,
    setClassStudents,
  } = useClassStudentRelations();
  const isHydrated =
    kelasHydrated && mkHydrated && umkmHydrated && usersHydrated && relationsHydrated && studentRelationsHydrated;

  const [selectedKelasId, setSelectedKelasId] = useState("");
  const [umkmId, setUmkmId] = useState("");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [catatan, setCatatan] = useState("");
  const [status, setStatus] = useState<RelationStatus>("aktif");

  const [search, setSearch] = useState("");
  const [prodiFilter, setProdiFilter] = useState("all");
  const [angkatanFilter, setAngkatanFilter] = useState("all");

  const [pendingDosenId, setPendingDosenId] = useState<string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeKelasOptions = kelasList.filter((k) => k.status === "aktif");
  const activeUmkm = umkmMasterList.filter((u) => u.status === "aktif");
  const dosenUsers = users.filter((u) => u.role === "dosen" && u.isActive);
  const mahasiswaUsers = users.filter((u) => u.role === "mahasiswa" && u.isActive);

  const selectedKelas = kelasList.find((k) => k.id === selectedKelasId) ?? null;
  const selectedMataKuliah = selectedKelas ? mataKuliah.find((m) => m.id === selectedKelas.mataKuliahId) : null;
  const existingRelation = selectedKelas ? classRelations.find((r) => r.classId === selectedKelas.id) : undefined;
  const currentDosen = selectedKelas ? users.find((u) => u.id === selectedKelas.dosenId) : null;

  function resetForm() {
    setSelectedKelasId("");
    setUmkmId("");
    setStudentIds([]);
    setCatatan("");
    setStatus("aktif");
    setErrors({});
    setSearch("");
    setProdiFilter("all");
    setAngkatanFilter("all");
  }

  function handleSelectKelas(kelasId: string) {
    setSelectedKelasId(kelasId);
    setErrors({});
    const relation = classRelations.find((r) => r.classId === kelasId);
    if (relation) {
      setUmkmId(relation.umkmId);
      setCatatan(relation.catatan ?? "");
      setStatus(relation.status);
      setStudentIds(getActiveStudentIdsForClass(kelasId, classStudentRelations));
    } else {
      setUmkmId("");
      setCatatan("");
      setStatus("aktif");
      setStudentIds([]);
    }
  }

  const searchParams = useSearchParams();
  const kelasIdParam = searchParams.get("kelasId");

  useEffect(() => {
    if (isHydrated && kelasIdParam && kelasIdParam !== selectedKelasId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deep-linking from Semua Relasi / Detail Relasi's "Edit" action into this page's form, needs to run once the shared stores are hydrated.
      handleSelectKelas(kelasIdParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, kelasIdParam]);

  function handleConfirmDosenChange() {
    if (!selectedKelas || !pendingDosenId) return;
    updateKelas({ ...selectedKelas, dosenId: pendingDosenId });
    appendRelationActivity(
      ADMIN_NAME,
      "Mengubah dosen pengampu kelas",
      `Admin mengubah dosen pengampu kelas ${selectedKelas.nama}.`
    );
    setPendingDosenId(null);
  }

  const prodiOptions = Array.from(new Set(mahasiswaUsers.map((u) => u.prodi).filter(Boolean))) as string[];
  const angkatanOptions = Array.from(new Set(mahasiswaUsers.map((u) => u.angkatan).filter(Boolean))) as number[];

  const studentSearchKeyword = search.toLowerCase();
  const filteredStudents = mahasiswaUsers.filter((u) => {
    const matchesSearch =
      studentSearchKeyword === "" ||
      u.name.toLowerCase().includes(studentSearchKeyword) ||
      (u.nim ?? "").toLowerCase().includes(studentSearchKeyword);
    const matchesProdi = prodiFilter === "all" || u.prodi === prodiFilter;
    const matchesAngkatan = angkatanFilter === "all" || String(u.angkatan) === angkatanFilter;
    return matchesSearch && matchesProdi && matchesAngkatan;
  });

  function studentStatus(studentId: string) {
    if (studentIds.includes(studentId)) return { label: "Sudah di Kelas Ini", conflict: null as string | null };
    if (!selectedKelas) return { label: "Belum Ditambahkan", conflict: null };
    const conflict = findConflictingClassName(studentId, selectedKelas, kelasList, classStudentRelations);
    if (conflict) return { label: "Terdaftar di Kelas Lain", conflict };
    return { label: "Belum Ditambahkan", conflict: null };
  }

  const selectableFiltered = filteredStudents.filter((u) => !studentStatus(u.id).conflict || studentIds.includes(u.id));
  const allFilteredSelected =
    selectableFiltered.length > 0 && selectableFiltered.every((u) => studentIds.includes(u.id));

  function toggleStudent(studentId: string) {
    setStudentIds((prev) => (prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]));
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      const removeIds = new Set(selectableFiltered.map((u) => u.id));
      setStudentIds((prev) => prev.filter((id) => !removeIds.has(id)));
    } else {
      const addIds = selectableFiltered.map((u) => u.id);
      setStudentIds((prev) => Array.from(new Set([...prev, ...addIds])));
    }
  }

  function validate(): Record<string, string> {
    const validationErrors: Record<string, string> = {};
    if (!selectedKelas) validationErrors.kelas = "Kelas wajib dipilih.";
    if (selectedKelas && !selectedKelas.dosenId) validationErrors.dosen = "Dosen pengampu wajib ada.";
    if (umkmId === "") validationErrors.umkm = "UMKM mitra wajib dipilih.";
    if (studentIds.length === 0) validationErrors.students = "Minimal satu mahasiswa wajib dipilih.";
    return validationErrors;
  }

  function openSaveConfirm() {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSaveConfirmOpen(true);
  }

  function handleConfirmSave() {
    if (!selectedKelas) return;
    const now = new Date().toISOString();

    let relation: ClassRelation;
    if (existingRelation) {
      relation = { ...existingRelation, umkmId, catatan: catatan.trim() || undefined, status, updatedAt: now };
      updateClassRelation(relation);
    } else {
      relation = {
        id: createClassRelationId(selectedKelas.id, classRelations),
        classId: selectedKelas.id,
        umkmId,
        assignedBy: ADMIN_NAME,
        catatan: catatan.trim() || undefined,
        status,
        createdAt: now,
        updatedAt: now,
      };
      addClassRelation(relation);
    }

    const relationEntries: ClassStudentRelation[] = studentIds.map((studentId) => {
      const existingEntry = classStudentRelations.find(
        (r) => r.classId === selectedKelas.id && r.studentId === studentId
      );
      return existingEntry
        ? { ...existingEntry, status: "active" }
        : { id: `${selectedKelas.id}-${studentId}`, classId: selectedKelas.id, studentId, status: "active", joinedAt: now };
    });
    setClassStudents(selectedKelas.id, relationEntries);

    const umkmName = activeUmkm.find((u) => u.id === umkmId)?.namaUsaha ?? umkmMasterList.find((u) => u.id === umkmId)?.namaUsaha ?? "-";
    appendRelationActivity(
      ADMIN_NAME,
      existingRelation ? "Memperbarui relasi kelas" : "Membuat relasi kelas",
      `Admin ${existingRelation ? "memperbarui" : "membuat"} relasi kelas ${selectedKelas.nama} dengan ${umkmName}.`
    );
    appendRelationActivity(
      ADMIN_NAME,
      "Menetapkan mahasiswa kelas",
      `Admin menetapkan ${studentIds.length} mahasiswa pada kelas ${selectedKelas.nama}.`
    );

    setSaveConfirmOpen(false);
    setSuccessMessage(`Relasi kelas ${selectedKelas.nama} berhasil disimpan.`);
  }

  if (!isHydrated) {
    return null;
  }

  const recentRelations = [...classRelations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Relasi Kelas"
        description="Hubungkan kelas dengan dosen pengampu, UMKM mitra, dan mahasiswa."
        actions={
          <Link href="/admin/relasi-kelas/semua">
            <Button variant="outline">Lihat Semua Relasi</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Atur Relasi Kelas</CardTitle>
          </CardHeader>

          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="pilih-kelas" className="text-sm font-medium text-navy">
                  Pilih Kelas
                </label>
                {selectedKelas && hasActiveRelation(selectedKelas.id, classRelations) && (
                  <Badge variant="green">Sudah Terhubung</Badge>
                )}
              </div>
              <div className="mt-1.5 w-full max-w-[560px]">
                <Select
                  id="pilih-kelas"
                  options={[
                    { value: "", label: "Pilih kelas..." },
                    ...activeKelasOptions.map((k) => {
                      const mk = mataKuliah.find((m) => m.id === k.mataKuliahId);
                      return {
                        value: k.id,
                        label: `${k.nama} — ${mk?.nama ?? "-"} — ${k.semester} ${k.tahunAjaran}`,
                      };
                    }),
                  ]}
                  value={selectedKelasId}
                  onChange={(e) => handleSelectKelas(e.target.value)}
                  className={errors.kelas ? "!border-red-400" : undefined}
                />
              </div>
              {errors.kelas && <p className="mt-1 text-xs text-red-500">{errors.kelas}</p>}
            </div>

            {!selectedKelas ? (
              <p className="rounded-xl bg-soft-gray px-4 py-6 text-center text-sm text-muted">
                Pilih kelas terlebih dahulu untuk mengatur relasi.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-soft-gray-dark p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">Mata Kuliah</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{selectedMataKuliah?.nama ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Semester</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{selectedKelas.semester}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Tahun Ajaran</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{selectedKelas.tahunAjaran}</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="dosen" className="text-sm font-medium text-navy">
                    Dosen Pengampu
                  </label>
                  <div className="mt-1.5">
                    <Select
                      id="dosen"
                      options={dosenUsers.map((d) => ({ value: d.id, label: `${d.name}${d.nip ? ` — NIP ${d.nip}` : ""}` }))}
                      value={selectedKelas.dosenId}
                      onChange={(e) => setPendingDosenId(e.target.value)}
                    />
                  </div>
                  {currentDosen && (
                    <p className="mt-1 text-xs text-muted">
                      {currentDosen.jabatan ?? "Dosen Pembimbing"}
                      {currentDosen.nip ? ` · NIP ${currentDosen.nip}` : ""}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="umkm" className="text-sm font-medium text-navy">
                    UMKM Mitra
                  </label>
                  <div className="mt-1.5">
                    <Select
                      id="umkm"
                      options={[
                        { value: "", label: "Pilih UMKM mitra..." },
                        ...activeUmkm.map((u) => ({ value: u.id, label: `${u.namaUsaha} — ${u.sektorUsaha}` })),
                      ]}
                      value={umkmId}
                      onChange={(e) => setUmkmId(e.target.value)}
                      className={errors.umkm ? "!border-red-400" : undefined}
                    />
                  </div>
                  {errors.umkm && <p className="mt-1 text-xs text-red-500">{errors.umkm}</p>}
                </div>

                <div>
                  <p className="text-sm font-medium text-navy">Mahasiswa dalam Kelas</p>
                  <div className="mt-1.5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(180px,1fr)_150px_130px]">
                    <Input
                      id="search-mahasiswa"
                      placeholder="Cari nama/NIM..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <Select
                      id="filter-prodi"
                      options={[{ value: "all", label: "Semua Prodi" }, ...prodiOptions.map((p) => ({ value: p, label: p }))]}
                      value={prodiFilter}
                      onChange={(e) => setProdiFilter(e.target.value)}
                    />
                    <Select
                      id="filter-angkatan"
                      options={[
                        { value: "all", label: "Semua Angkatan" },
                        ...angkatanOptions.map((a) => ({ value: String(a), label: String(a) })),
                      ]}
                      value={angkatanFilter}
                      onChange={(e) => setAngkatanFilter(e.target.value)}
                    />
                  </div>

                  <div className="mt-3 overflow-x-auto rounded-xl border border-soft-gray-dark">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="bg-purple/5">
                        <tr>
                          <th className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={allFilteredSelected}
                              onChange={toggleSelectAllFiltered}
                              className="h-4 w-4 rounded border-soft-gray-dark text-purple focus:ring-purple/30"
                              aria-label="Pilih semua mahasiswa hasil filter"
                            />
                          </th>
                          <th className="px-3 py-2 font-medium text-navy">NIM</th>
                          <th className="px-3 py-2 font-medium text-navy">Nama Mahasiswa</th>
                          <th className="px-3 py-2 font-medium text-navy">Program Studi</th>
                          <th className="px-3 py-2 font-medium text-navy">Angkatan</th>
                          <th className="px-3 py-2 font-medium text-navy">Status Relasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-soft-gray-dark">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted">
                              Mahasiswa tidak ditemukan.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((student) => {
                            const { label, conflict } = studentStatus(student.id);
                            const disabled = !!conflict;
                            return (
                              <tr key={student.id} className={disabled ? "opacity-60" : undefined}>
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={studentIds.includes(student.id)}
                                    disabled={disabled}
                                    onChange={() => toggleStudent(student.id)}
                                    title={conflict ? `Mahasiswa sudah terdaftar pada kelas ${conflict}.` : undefined}
                                    className="h-4 w-4 rounded border-soft-gray-dark text-purple focus:ring-purple/30 disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="px-3 py-2 text-navy">{student.nim}</td>
                                <td className="px-3 py-2 text-navy">{student.name}</td>
                                <td className="px-3 py-2 text-muted">{student.prodi ?? "-"}</td>
                                <td className="px-3 py-2 text-muted">{student.angkatan ?? "-"}</td>
                                <td className="px-3 py-2">
                                  <Badge variant={label === "Sudah di Kelas Ini" ? "green" : label === "Terdaftar di Kelas Lain" ? "gray" : "orange"}>
                                    {label}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-muted">{studentIds.length} mahasiswa dipilih</p>
                  {errors.students && <p className="mt-1 text-xs text-red-500">{errors.students}</p>}
                </div>

                <div>
                  <Textarea
                    label="Catatan Relasi"
                    id="catatan"
                    placeholder="Catatan tambahan mengenai relasi ini (opsional)"
                    maxLength={500}
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </div>

                {existingRelation && (
                  <Select
                    label="Status Relasi"
                    id="status-relasi"
                    options={[
                      { value: "aktif", label: "Aktif" },
                      { value: "tidak_aktif", label: "Tidak Aktif" },
                    ]}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RelationStatus)}
                  />
                )}

                {successMessage && (
                  <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{successMessage}</p>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="secondary" onClick={openSaveConfirm}>
                    {existingRelation ? "Perbarui Relasi" : "Simpan Relasi"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Batal
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="h-fit min-w-0 rounded-2xl p-5">
          <CardHeader>
            <CardTitle className="text-base">Relasi Tersimpan Terbaru</CardTitle>
          </CardHeader>
          {recentRelations.length === 0 ? (
            <p className="text-sm text-muted">Belum ada relasi tersimpan.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentRelations.map((relation) => {
                const kelas = kelasList.find((k) => k.id === relation.classId);
                const mk = kelas ? mataKuliah.find((m) => m.id === kelas.mataKuliahId) : null;
                const dosen = kelas ? users.find((u) => u.id === kelas.dosenId) : null;
                const umkm = umkmMasterList.find((u) => u.id === relation.umkmId);
                const studentCount = getActiveStudentIdsForClass(relation.classId, classStudentRelations).length;
                return (
                  <div key={relation.id} className="rounded-xl border border-soft-gray-dark p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy">Kelas {kelas?.nama ?? "-"}</p>
                        <p className="text-xs text-muted">{mk?.nama ?? "-"}</p>
                      </div>
                      <Badge variant={relation.status === "aktif" ? "green" : "gray"}>
                        {relation.status === "aktif" ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-col gap-1 text-xs text-muted">
                      <span>Dosen: {dosen?.name ?? "-"}</span>
                      <span>UMKM: {umkm?.namaUsaha ?? "-"}</span>
                      <span>Mahasiswa: {studentCount} mahasiswa</span>
                      <span>
                        {kelas?.semester} {kelas?.tahunAjaran}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <Link href={`/admin/relasi-kelas/${relation.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Lihat Detail
                        </Button>
                      </Link>
                      <Button variant="outline" size="sm" onClick={() => kelas && handleSelectKelas(kelas.id)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!pendingDosenId} onClose={() => setPendingDosenId(null)} title="Ganti dosen pengampu?">
        <p className="text-sm text-muted">
          Perubahan dosen pengampu dapat memengaruhi project dan kelompok yang sudah terhubung.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setPendingDosenId(null)}>
            Batal
          </Button>
          <Button variant="secondary" onClick={handleConfirmDosenChange}>
            Ganti Dosen
          </Button>
        </div>
      </Modal>

      <Modal open={saveConfirmOpen} onClose={() => setSaveConfirmOpen(false)} title="Simpan relasi kelas?">
        <p className="text-sm text-muted">Relasi ini akan digunakan pada project, kelompok, dan monitoring sistem.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setSaveConfirmOpen(false)}>
            Batal
          </Button>
          <Button variant="secondary" onClick={handleConfirmSave}>
            Simpan Relasi
          </Button>
        </div>
      </Modal>
    </div>
  );
}
