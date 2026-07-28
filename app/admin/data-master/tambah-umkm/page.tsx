"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Input, Select, Textarea, Button } from "@/components/ui";
import {
  BUSINESS_SECTOR_OPTIONS,
  buildUmkmAccountFromMaster,
  createUmkmMasterId,
  isNamaUsahaTaken,
  type ActiveStatus,
  type UmkmMaster,
} from "@/lib/adminMasterData";
import { useUmkmMaster } from "@/lib/useAdminMasterData";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { createUserId, isEmailTaken } from "@/lib/adminUsersData";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+()\s-]{8,20}$/;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function errorClass(hasError: boolean) {
  return hasError ? "!border-red-400 focus:!border-red-400 focus:!ring-red-200" : undefined;
}

export default function TambahUmkmPage() {
  const router = useRouter();
  const { umkmMasterList, isHydrated: umkmHydrated, addUmkmMaster } = useUmkmMaster();
  const { users, isHydrated: usersHydrated, addUser } = useAdminUsers();
  const isHydrated = umkmHydrated && usersHydrated;

  const [namaUsaha, setNamaUsaha] = useState("");
  const [namaPemilik, setNamaPemilik] = useState("");
  const [sektorUsaha, setSektorUsaha] = useState(BUSINESS_SECTOR_OPTIONS[0]);
  const [kontak, setKontak] = useState("");
  const [email, setEmail] = useState("");
  const [mediaSosial, setMediaSosial] = useState("");
  const [alamat, setAlamat] = useState("");
  const [deskripsiUsaha, setDeskripsiUsaha] = useState("");
  const [catatanKebutuhan, setCatatanKebutuhan] = useState("");
  const [status, setStatus] = useState<ActiveStatus>("aktif");
  const [createLoginAccount, setCreateLoginAccount] = useState(false);

  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (namaUsaha.trim() === "") errors.namaUsaha = "Nama usaha wajib diisi.";
    else if (isNamaUsahaTaken(namaUsaha, umkmMasterList)) errors.namaUsaha = "Nama usaha sudah digunakan.";

    if (namaPemilik.trim() === "") errors.namaPemilik = "Nama pemilik/perwakilan wajib diisi.";

    if (kontak.trim() !== "" && !PHONE_REGEX.test(kontak.trim())) errors.kontak = "Format nomor kontak tidak valid.";

    if (createLoginAccount || email.trim() !== "") {
      if (email.trim() === "") {
        errors.email = "Email wajib diisi untuk membuat akun login.";
      } else if (!EMAIL_REGEX.test(email.trim())) {
        errors.email = "Format email tidak valid.";
      } else if (isEmailTaken(email, users)) {
        errors.email = "Email sudah digunakan.";
      }
    }

    if (alamat.trim() === "") errors.alamat = "Alamat wajib diisi.";
    if (deskripsiUsaha.length > 1000) errors.deskripsiUsaha = "Deskripsi maksimal 1000 karakter.";
    if (catatanKebutuhan.length > 1000) errors.catatanKebutuhan = "Catatan maksimal 1000 karakter.";

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

    const newMaster: UmkmMaster = {
      id: createUmkmMasterId(namaUsaha, umkmMasterList),
      namaUsaha: namaUsaha.trim(),
      namaPemilik: namaPemilik.trim(),
      sektorUsaha,
      alamat: alamat.trim(),
      deskripsiUsaha: deskripsiUsaha.trim() || undefined,
      kontak: kontak.trim() || undefined,
      email: email.trim() || undefined,
      mediaSosial: mediaSosial.trim() || undefined,
      catatanKebutuhan: catatanKebutuhan.trim() || undefined,
      status,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    if (createLoginAccount) {
      const userId = createUserId("umkm", users);
      newMaster.linkedUserId = userId;
      addUser({ ...buildUmkmAccountFromMaster(newMaster, userId, "Siti Aminah") });
    }

    addUmkmMaster(newMaster);
    setSuccessMessage(`UMKM ${newMaster.namaUsaha} berhasil ditambahkan.`);
    setTimeout(() => router.push("/admin/data-master"), 700);
  }

  if (!isHydrated) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Tambah UMKM Mitra"
        description="Tambahkan profil awal UMKM yang akan menjadi mitra pembelajaran."
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
                label="Nama Usaha"
                id="nama-usaha"
                placeholder="Warung Teras Hijau"
                value={namaUsaha}
                onChange={(e) => setNamaUsaha(e.target.value)}
                className={errorClass(!!errors.namaUsaha)}
              />
              <FieldError message={errors.namaUsaha} />
            </div>
            <div>
              <Input
                label="Nama Pemilik/Perwakilan"
                id="nama-pemilik"
                placeholder="Nama pemilik atau perwakilan usaha"
                value={namaPemilik}
                onChange={(e) => setNamaPemilik(e.target.value)}
                className={errorClass(!!errors.namaPemilik)}
              />
              <FieldError message={errors.namaPemilik} />
            </div>
            <Select
              label="Kategori/Sektor Usaha"
              id="sektor"
              options={BUSINESS_SECTOR_OPTIONS.map((s) => ({ value: s, label: s }))}
              value={sektorUsaha}
              onChange={(e) => setSektorUsaha(e.target.value)}
            />
            <div>
              <Input
                label="Kontak/WhatsApp"
                id="kontak"
                placeholder="08xxxxxxxxxx"
                value={kontak}
                onChange={(e) => setKontak(e.target.value)}
                className={errorClass(!!errors.kontak)}
              />
              <FieldError message={errors.kontak} />
            </div>
            <div>
              <Input
                label="Email UMKM"
                id="email"
                type="email"
                placeholder="nama@usaha.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={errorClass(!!errors.email)}
              />
              <FieldError message={errors.email} />
            </div>
            <Input
              label="Media Sosial"
              id="media-sosial"
              placeholder="@namausaha"
              value={mediaSosial}
              onChange={(e) => setMediaSosial(e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                label="Alamat UMKM"
                id="alamat"
                placeholder="Alamat lengkap usaha"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                className={errorClass(!!errors.alamat)}
              />
              <FieldError message={errors.alamat} />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Deskripsi Usaha"
                id="deskripsi"
                placeholder="Ceritakan singkat usaha ini"
                maxLength={1000}
                value={deskripsiUsaha}
                onChange={(e) => setDeskripsiUsaha(e.target.value)}
              />
              <FieldError message={errors.deskripsiUsaha} />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Catatan Awal Kebutuhan Mitra"
                id="catatan-kebutuhan"
                placeholder="Kebutuhan atau catatan awal dari UMKM ini (opsional)"
                maxLength={1000}
                value={catatanKebutuhan}
                onChange={(e) => setCatatanKebutuhan(e.target.value)}
              />
              <FieldError message={errors.catatanKebutuhan} />
            </div>
            <Select
              label="Status Mitra"
              id="status"
              options={[
                { value: "aktif", label: "Aktif" },
                { value: "tidak_aktif", label: "Tidak Aktif" },
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value as ActiveStatus)}
            />
          </div>

          <div className="rounded-xl border border-soft-gray-dark bg-soft-gray p-4">
            <label className="flex items-start gap-3 text-sm text-navy">
              <input
                type="checkbox"
                checked={createLoginAccount}
                onChange={(e) => setCreateLoginAccount(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-soft-gray-dark text-purple focus:ring-purple/30"
              />
              <span>
                <span className="font-medium">Buat akun login UMKM setelah data disimpan</span>
                {createLoginAccount && (
                  <p className="mt-1 text-xs text-muted">
                    Akun akan dibuat oleh Admin menggunakan email di atas. UMKM tidak melakukan registrasi mandiri —
                    ini adalah simulasi frontend, akun autentikasi sungguhan tidak dibuat.
                  </p>
                )}
              </span>
            </label>
          </div>

          {successMessage && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              {successMessage} Mengarahkan ke Data Master...
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan UMKM"}
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
