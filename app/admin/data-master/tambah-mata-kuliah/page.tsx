"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Input, Button } from "@/components/ui";
import { useMataKuliah } from "@/lib/useAdminMasterData";

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

  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (kode.trim() === "") errors.kode = "Kode mata kuliah wajib diisi.";
    else if (kode.trim().length > 20) errors.kode = "Kode maksimal 20 karakter.";
    else if (mataKuliah.some((m) => m.kode.toUpperCase() === kode.trim().toUpperCase()))
      errors.kode = "Kode mata kuliah sudah digunakan.";

    if (nama.trim() === "") errors.nama = "Nama mata kuliah wajib diisi.";

    const sksNumber = Number(sks);
    if (sks.trim() === "" || Number.isNaN(sksNumber)) errors.sks = "SKS wajib diisi dengan angka.";
    else if (sksNumber < 1 || sksNumber > 6) errors.sks = "SKS antara 1 sampai 6.";

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
      await addMataKuliah({ kode: kode.trim().toUpperCase(), nama: nama.trim(), sks: Number(sks) });
      setSuccessMessage(`Mata kuliah ${nama.trim()} berhasil ditambahkan.`);
      setTimeout(() => router.push("/admin/data-master"), 700);
    } catch (error) {
      console.error("Failed to add mata kuliah", error);
      setSubmitError("Gagal menyimpan mata kuliah. Silakan coba lagi.");
      setIsSubmitting(false);
    }
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
          </div>

          {submitError && <p className="text-sm font-medium text-red-500">{submitError}</p>}
          {successMessage && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {successMessage} Mengarahkan ke Data Master...
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Mata Kuliah"}
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
