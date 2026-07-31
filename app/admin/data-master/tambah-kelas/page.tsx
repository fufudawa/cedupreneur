"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Input, Select, Button } from "@/components/ui";
import { useKelas, useMataKuliah, useDosenOptions } from "@/lib/useAdminMasterData";

const SEMESTER_OPTIONS = [
  { value: "Ganjil", label: "Ganjil" },
  { value: "Genap", label: "Genap" },
];

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function errorClass(hasError: boolean) {
  return hasError ? "!border-red-400 focus:!border-red-400 focus:!ring-red-200" : undefined;
}

export default function TambahKelasPage() {
  const router = useRouter();
  const { kelasList, isHydrated: kelasHydrated, addKelas } = useKelas();
  const { mataKuliah, isHydrated: mkHydrated } = useMataKuliah();
  const { dosenOptions, isHydrated: dosenHydrated } = useDosenOptions();
  const isHydrated = kelasHydrated && mkHydrated && dosenHydrated;

  const [nama, setNama] = useState("");
  const [mataKuliahId, setMataKuliahId] = useState("");
  const [semester, setSemester] = useState("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState("2026/2027");
  const [dosenId, setDosenId] = useState("");

  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (nama.trim() === "") errors.nama = "Nama kelas wajib diisi.";
    else if (
      kelasList.some(
        (k) => k.nama.trim().toLowerCase() === nama.trim().toLowerCase() && k.tahunAjaran === tahunAjaran.trim()
      )
    )
      errors.nama = "Nama kelas sudah digunakan pada tahun ajaran ini.";

    if (mataKuliahId === "") errors.mataKuliahId = "Mata kuliah wajib dipilih.";
    if (tahunAjaran.trim() === "") errors.tahunAjaran = "Tahun ajaran wajib diisi.";
    if (dosenId === "") errors.dosenId = "Dosen pengampu wajib dipilih.";

    return errors;
  }

  const errors = attempted ? validate() : {};

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    setSubmitError("");
    if (isSubmitting) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await addKelas({ nama: nama.trim(), mataKuliahId, dosenId, semester, tahunAjaran: tahunAjaran.trim() });
      setSuccessMessage(`Kelas ${nama.trim()} berhasil ditambahkan.`);
      setTimeout(() => router.push("/admin/data-master"), 700);
    } catch (error) {
      console.error("Failed to add kelas", error);
      setSubmitError("Gagal menyimpan kelas. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  }

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Tambah Kelas"
        description="Buat kelas dan hubungkan dengan mata kuliah serta dosen pengampu."
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
                placeholder="TRM 5A"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={errorClass(!!errors.nama)}
              />
              <FieldError message={errors.nama} />
            </div>
            <div>
              <Select
                label="Mata Kuliah"
                id="mata-kuliah"
                options={[{ value: "", label: "Pilih mata kuliah" }, ...mataKuliah.map((m) => ({ value: m.id, label: m.nama }))]}
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
              onChange={(e) => setSemester(e.target.value)}
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
                options={[{ value: "", label: "Pilih dosen" }, ...dosenOptions.map((d) => ({ value: d.id, label: d.name }))]}
                value={dosenId}
                onChange={(e) => setDosenId(e.target.value)}
                className={errorClass(!!errors.dosenId)}
              />
              <FieldError message={errors.dosenId} />
            </div>
          </div>

          <p className="text-xs text-muted">
            Mahasiswa bergabung ke kelas ini secara otomatis begitu Dosen membuat kelompok bimbingan untuk kelas tersebut.
          </p>

          {submitError && <p className="text-sm font-medium text-red-500">{submitError}</p>}
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
    </div>
  );
}
