"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Input, Select, Textarea, Button } from "@/components/ui";
import { createMataKuliahId, isKodeMataKuliahTaken, type ActiveStatus, type MataKuliah, type Semester } from "@/lib/adminMasterData";
import { useMataKuliah } from "@/lib/useAdminMasterData";

const SEMESTER_OPTIONS: { value: Semester; label: string }[] = [
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

export default function TambahMataKuliahPage() {
  const router = useRouter();
  const { mataKuliah, isHydrated, addMataKuliah } = useMataKuliah();

  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [sks, setSks] = useState("3");
  const [semester, setSemester] = useState<Semester>("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState("2026/2027");
  const [status, setStatus] = useState<ActiveStatus>("aktif");
  const [deskripsi, setDeskripsi] = useState("");

  const [attempted, setAttempted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (kode.trim() === "") errors.kode = "Kode mata kuliah wajib diisi.";
    else if (kode.trim().length > 20) errors.kode = "Kode maksimal 20 karakter.";
    else if (isKodeMataKuliahTaken(kode, mataKuliah)) errors.kode = "Kode mata kuliah sudah digunakan.";

    if (nama.trim() === "") errors.nama = "Nama mata kuliah wajib diisi.";

    const sksNumber = Number(sks);
    if (sks.trim() === "" || Number.isNaN(sksNumber)) errors.sks = "SKS wajib diisi dengan angka.";
    else if (sksNumber < 1 || sksNumber > 6) errors.sks = "SKS antara 1 sampai 6.";

    if (!/^\d{4}\/\d{4}$/.test(tahunAjaran.trim())) errors.tahunAjaran = "Format tahun ajaran contoh: 2026/2027.";

    if (deskripsi.length > 500) errors.deskripsi = "Deskripsi maksimal 500 karakter.";

    return errors;
  }

  const errors = attempted ? validate() : {};

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) return;

    const newItem: MataKuliah = {
      id: createMataKuliahId(mataKuliah),
      kode: kode.trim().toUpperCase(),
      nama: nama.trim(),
      sks: Number(sks),
      semester,
      tahunAjaran: tahunAjaran.trim(),
      status,
      deskripsi: deskripsi.trim() || undefined,
    };

    addMataKuliah(newItem);
    setSuccessMessage(`Mata kuliah ${newItem.nama} berhasil ditambahkan.`);
    setTimeout(() => router.push("/admin/data-master"), 700);
  }

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Tambah Mata Kuliah"
        description="Tambahkan mata kuliah yang akan digunakan dalam kelas dan project."
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
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <div>
              <Input
                label="Kode Mata Kuliah"
                id="kode"
                placeholder="PKWU301"
                value={kode}
                onChange={(e) => setKode(e.target.value.toUpperCase())}
                maxLength={20}
                className={errorClass(!!errors.kode)}
              />
              <FieldError message={errors.kode} />
            </div>
            <div>
              <Input
                label="Nama Mata Kuliah"
                id="nama"
                placeholder="Praktik Kewirausahaan"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={errorClass(!!errors.nama)}
              />
              <FieldError message={errors.nama} />
            </div>
            <div>
              <Input
                label="Jumlah SKS"
                id="sks"
                type="number"
                min={1}
                max={6}
                value={sks}
                onChange={(e) => setSks(e.target.value)}
                className={errorClass(!!errors.sks)}
              />
              <FieldError message={errors.sks} />
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
            <Select
              label="Status Mata Kuliah"
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
            <Textarea
              label="Deskripsi Mata Kuliah"
              id="deskripsi"
              placeholder="Deskripsi singkat mata kuliah (opsional)"
              maxLength={500}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
            />
            <FieldError message={errors.deskripsi} />
          </div>

          {successMessage && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {successMessage} Mengarahkan ke Data Master...
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="secondary">
              Simpan Mata Kuliah
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
