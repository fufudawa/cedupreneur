"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, StudentPickerModal } from "@/components/shared";
import { Card, Input, Select, Textarea, Button, Badge } from "@/components/ui";
import {
  createKelasId,
  isNamaKelasTaken,
  toStudentOption,
  type ActiveStatus,
  type Kelas,
  type Semester,
} from "@/lib/adminMasterData";
import { useKelas, useMataKuliah } from "@/lib/useAdminMasterData";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { STUDY_PROGRAMS } from "@/lib/dosenGroupsStorage";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function errorClass(hasError: boolean) {
  return hasError ? "!border-red-400 focus:!border-red-400 focus:!ring-red-200" : undefined;
}

const SEMESTER_OPTIONS: { value: Semester; label: string }[] = [
  { value: "Ganjil", label: "Ganjil" },
  { value: "Genap", label: "Genap" },
];

export default function TambahKelasPage() {
  const router = useRouter();
  const { kelasList, isHydrated: kelasHydrated, addKelas } = useKelas();
  const { mataKuliah, isHydrated: mkHydrated } = useMataKuliah();
  const { users, isHydrated: usersHydrated } = useAdminUsers();
  const isHydrated = kelasHydrated && mkHydrated && usersHydrated;

  const [nama, setNama] = useState("");
  const [programStudi, setProgramStudi] = useState<string>(STUDY_PROGRAMS[0]);
  const [mataKuliahId, setMataKuliahId] = useState("");
  const [semester, setSemester] = useState<Semester>("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState("2026/2027");
  const [dosenId, setDosenId] = useState("");
  const [status, setStatus] = useState<ActiveStatus>("aktif");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [catatan, setCatatan] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeMataKuliah = mataKuliah.filter((m) => m.status === "aktif");
  const activeDosen = users.filter((u) => u.role === "dosen" && u.isActive);
  const activeMahasiswa = users.filter((u) => u.role === "mahasiswa" && u.isActive);
  const selectedStudents = activeMahasiswa.filter((u) => studentIds.includes(u.id));
  const pickerCandidates = activeMahasiswa.filter((u) => !studentIds.includes(u.id)).map(toStudentOption);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (nama.trim() === "") errors.nama = "Nama kelas wajib diisi.";
    else if (isNamaKelasTaken(nama, tahunAjaran, kelasList)) errors.nama = "Nama kelas sudah digunakan pada tahun ajaran ini.";

    if (mataKuliahId === "") errors.mataKuliahId = "Mata kuliah wajib dipilih.";
    if (tahunAjaran.trim() === "") errors.tahunAjaran = "Tahun ajaran wajib diisi.";
    if (dosenId === "") errors.dosenId = "Dosen pengampu wajib dipilih.";
    if (status === "aktif" && studentIds.length === 0) errors.students = "Minimal 1 mahasiswa untuk kelas aktif.";
    if (catatan.length > 500) errors.catatan = "Catatan maksimal 500 karakter.";

    return errors;
  }

  const errors = attempted ? validate() : {};

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (isSubmitting) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);

    const newKelas: Kelas = {
      id: createKelasId(nama, kelasList),
      nama: nama.trim(),
      mataKuliahId,
      dosenId,
      semester,
      tahunAjaran: tahunAjaran.trim(),
      studentIds,
      programStudi,
      status,
      catatan: catatan.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    addKelas(newKelas);
    setSuccessMessage(`Kelas ${newKelas.nama} berhasil ditambahkan.`);
    setTimeout(() => router.push("/admin/data-master"), 700);
  }

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Tambah Kelas"
        description="Buat kelas dan hubungkan dengan mata kuliah, dosen, serta mahasiswa."
        actions={
          <Link href="/admin/data-master">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Data Master
            </Button>
          </Link>
        }
      />

      <Card className="max-w-[1000px] rounded-2xl p-7 lg:p-8">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <div>
              <Input
                label="Nama Kelas"
                id="nama"
                placeholder="RJ24D"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={errorClass(!!errors.nama)}
              />
              <FieldError message={errors.nama} />
            </div>
            <div>
              {/* Program studi doesn't have its own ERD table yet — frontend-only dropdown until one exists. */}
              <Select
                label="Program Studi"
                id="program-studi"
                options={STUDY_PROGRAMS.map((p) => ({ value: p, label: p }))}
                value={programStudi}
                onChange={(e) => setProgramStudi(e.target.value)}
              />
            </div>
            <div>
              <Select
                label="Mata Kuliah"
                id="mata-kuliah"
                options={[
                  { value: "", label: "Pilih mata kuliah" },
                  ...activeMataKuliah.map((m) => ({ value: m.id, label: m.nama })),
                ]}
                value={mataKuliahId}
                onChange={(e) => setMataKuliahId(e.target.value)}
                className={errorClass(!!errors.mataKuliahId)}
              />
              <FieldError message={errors.mataKuliahId} />
            </div>
            <Select
              label="Semester"
              id="semester"
              options={SEMESTER_OPTIONS}
              value={semester}
              onChange={(e) => setSemester(e.target.value as Semester)}
            />
            <div>
              <Input
                label="Tahun Ajaran"
                id="tahun-ajaran"
                placeholder="2026/2027"
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                className={errorClass(!!errors.tahunAjaran)}
              />
              <FieldError message={errors.tahunAjaran} />
            </div>
            <div>
              <Select
                label="Dosen Pengampu"
                id="dosen"
                options={[
                  { value: "", label: "Pilih dosen" },
                  ...activeDosen.map((d) => ({ value: d.id, label: d.name })),
                ]}
                value={dosenId}
                onChange={(e) => setDosenId(e.target.value)}
                className={errorClass(!!errors.dosenId)}
              />
              <FieldError message={errors.dosenId} />
            </div>
            <Select
              label="Status Kelas"
              id="status"
              options={[
                { value: "aktif", label: "Aktif" },
                { value: "tidak_aktif", label: "Tidak Aktif" },
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value as ActiveStatus)}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-navy">Daftar Mahasiswa Kelas</span>
              <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                + Tambah Mahasiswa
              </Button>
            </div>

            {selectedStudents.length === 0 ? (
              <p className="rounded-xl bg-soft-gray px-4 py-6 text-center text-sm text-muted">
                Belum ada mahasiswa dipilih.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-soft-gray-dark">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-purple/5">
                    <tr>
                      <th className="px-3 py-2 font-medium text-navy">NIM</th>
                      <th className="px-3 py-2 font-medium text-navy">Nama Mahasiswa</th>
                      <th className="px-3 py-2 font-medium text-navy">Angkatan</th>
                      <th className="px-3 py-2 font-medium text-navy">Status</th>
                      <th className="px-3 py-2 font-medium text-navy">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft-gray-dark">
                    {selectedStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="px-3 py-2 text-navy">{student.nim}</td>
                        <td className="px-3 py-2 text-navy">{student.name}</td>
                        <td className="px-3 py-2 text-muted">{student.angkatan ?? "-"}</td>
                        <td className="px-3 py-2">
                          <Badge variant="green">Aktif</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setStudentIds((prev) => prev.filter((id) => id !== student.id))}
                          >
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-muted">{selectedStudents.length} mahasiswa dipilih</p>
            <FieldError message={errors.students} />
          </div>

          <div>
            <Textarea
              label="Catatan"
              id="catatan"
              placeholder="Catatan tambahan mengenai kelas ini (opsional)"
              maxLength={500}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
            <FieldError message={errors.catatan} />
          </div>

          {successMessage && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {successMessage} Mengarahkan ke Data Master...
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Kelas"}
            </Button>
            <Link href="/admin/data-master">
              <Button type="button" variant="outline">
                Batal
              </Button>
            </Link>
          </div>
        </form>
      </Card>

      <StudentPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        students={pickerCandidates}
        takenStudentIds={new Set()}
        remainingSlots={9999}
        title="Tambah Mahasiswa Kelas"
        onConfirm={(selected) => {
          setStudentIds((prev) => [...prev, ...selected.map((s) => s.id)]);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
