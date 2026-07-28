"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Users, UserRound, GraduationCap, Store, Check } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Card, Input, Select, Button } from "@/components/ui";
import {
  isEmailTaken,
  isNipTaken,
  isNimTaken,
  type UserRole,
} from "@/lib/adminUsersData";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { STUDY_PROGRAMS, CLASSES_BY_STUDY_PROGRAM } from "@/lib/dosenGroupsStorage";
import type { GroupMemberRole } from "@/lib/dosenGroupsStorage";
import { supabase } from "@/lib/supabaseClient";

/** Body sent to the `create-user` Edge Function — one shape per role, no extra fields. */
type CreateUserPayload =
  | { role: "admin"; nama: string; email: string; password: string }
  | { role: "dosen"; nama: string; nip: string; fakultas: string; password: string }
  | { role: "mahasiswa"; nama: string; nim: string; prodi: string; angkatan: number; password: string }
  | {
      role: "umkm";
      nama: string;
      email: string;
      nama_usaha: string;
      sektor_usaha: string;
      alamat: string;
      deskripsi_usaha: string;
      password: string;
    };

type CreateUserResponse =
  | { success: true; profileId: string; role: UserRole }
  | { success: false; message: string };

/** Extracts a human-readable message from a supabase.functions.invoke() error. */
async function extractInvokeErrorMessage(error: unknown): Promise<string> {
  if (error instanceof Error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = (await context.clone().json()) as { message?: unknown };
        if (typeof body.message === "string" && body.message.trim() !== "") {
          return body.message;
        }
      } catch {
        // Response body wasn't JSON — fall back to the generic error message below.
      }
    }
    return error.message;
  }
  return "Gagal membuat pengguna. Silakan coba lagi.";
}

const ROLE_CARDS: { value: UserRole; label: string; description: string; icon: typeof Users }[] = [
  { value: "admin", label: "Admin", description: "Mengelola pengguna dan sistem.", icon: Users },
  { value: "dosen", label: "Dosen", description: "Mengelola project dan mentoring kelompok.", icon: UserRound },
  { value: "mahasiswa", label: "Mahasiswa", description: "Mengikuti project dan aktivitas kelompok.", icon: GraduationCap },
  { value: "umkm", label: "UMKM Mitra", description: "Melihat progress dan memberi feedback.", icon: Store },
];

const ROLE_LABEL_LOCAL: Record<UserRole, string> = {
  admin: "Admin",
  dosen: "Dosen",
  mahasiswa: "Mahasiswa",
  umkm: "UMKM Mitra",
};

const BUSINESS_SECTOR_OPTIONS = [
  { value: "Food and Beverage", label: "Food and Beverage" },
  { value: "Fashion", label: "Fashion" },
  { value: "Jasa", label: "Jasa" },
  { value: "Kerajinan", label: "Kerajinan" },
  { value: "Teknologi", label: "Teknologi" },
  { value: "Lainnya", label: "Lainnya" },
];

const MATA_KULIAH_OPTIONS = ["Praktik Kewirausahaan"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function errorClass(hasError: boolean) {
  return hasError ? "!border-red-400 focus:!border-red-400 focus:!ring-red-200" : undefined;
}

export default function TambahPenggunaPage() {
  const router = useRouter();
  const { users, isHydrated: usersHydrated, refetch } = useAdminUsers();
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const isHydrated = usersHydrated && groupsHydrated;

  const [role, setRole] = useState<UserRole | null>(null);

  // common
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusAkun, setStatusAkun] = useState<"active" | "inactive">("active");

  // dosen
  const [nip, setNip] = useState("");
  const [jabatan, setJabatan] = useState("Dosen Pembimbing");
  const [prodiDosen, setProdiDosen] = useState<string>(STUDY_PROGRAMS[0]);
  const [mataKuliah, setMataKuliah] = useState<string[]>([]);

  // mahasiswa
  const [nim, setNim] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [prodiMhs, setProdiMhs] = useState("");
  const [kelas, setKelas] = useState("");
  const [kelompokId, setKelompokId] = useState("");
  const [memberRole, setMemberRole] = useState<GroupMemberRole>("anggota");

  // umkm
  const [businessName, setBusinessName] = useState("");
  const [businessSector, setBusinessSector] = useState(BUSINESS_SECTOR_OPTIONS[0].value);
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [phone, setPhone] = useState("");

  const [attempted, setAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const kelasOptions = useMemo(
    () => (prodiMhs ? (CLASSES_BY_STUDY_PROGRAM[prodiMhs] ?? []) : []),
    [prodiMhs]
  );

  const kelompokOptions = useMemo(
    () => groups.filter((group) => group.studyProgram === prodiMhs && group.className === kelas),
    [groups, prodiMhs, kelas]
  );

  const selectedGroup = kelompokOptions.find((group) => group.id === kelompokId);

  function handleProdiMhsChange(value: string) {
    setProdiMhs(value);
    setKelas("");
    setKelompokId("");
    setMemberRole("anggota");
  }

  function handleKelasChange(value: string) {
    setKelas(value);
    setKelompokId("");
    setMemberRole("anggota");
  }

  function handleKelompokChange(value: string) {
    setKelompokId(value);
    setMemberRole("anggota");
  }

  function toggleMataKuliah(subject: string) {
    setMataKuliah((prev) => (prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]));
  }

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!role) {
      errors.role = "Role wajib dipilih.";
      return errors;
    }

    if (name.trim() === "") errors.name = "Nama lengkap wajib diisi.";

    if (email.trim() === "") {
      errors.email = "Email wajib diisi.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Format email tidak valid.";
    } else if (isEmailTaken(email, users)) {
      errors.email = "Email sudah digunakan.";
    }

    if (password.length < 8) errors.password = "Password minimal 8 karakter.";
    if (confirmPassword !== password) errors.confirmPassword = "Konfirmasi password tidak sama.";

    if (role === "dosen") {
      if (nip.trim() === "") errors.nip = "NIP wajib diisi.";
      else if (isNipTaken(nip, users)) errors.nip = "NIP sudah digunakan.";
    }

    if (role === "mahasiswa") {
      if (nim.trim() === "") errors.nim = "NIM wajib diisi.";
      else if (isNimTaken(nim, users)) errors.nim = "NIM sudah digunakan.";
      if (angkatan.trim() === "") errors.angkatan = "Angkatan wajib diisi.";
      if (prodiMhs === "") errors.prodiMhs = "Program studi wajib dipilih.";
      if (kelas === "") errors.kelas = "Kelas wajib dipilih.";
    }

    if (role === "umkm") {
      if (businessName.trim() === "") errors.businessName = "Nama usaha wajib diisi.";
      if (businessAddress.trim() === "") errors.businessAddress = "Alamat wajib diisi.";
    }

    return errors;
  }

  const errors = attempted ? validate() : {};

  function buildPayload(selectedRole: UserRole): CreateUserPayload {
    switch (selectedRole) {
      case "admin":
        return { role: "admin", nama: name.trim(), email: email.trim(), password };
      case "dosen":
        return {
          role: "dosen",
          nama: name.trim(),
          nip: nip.trim(),
          fakultas: prodiDosen,
          password,
        };
      case "mahasiswa":
        return {
          role: "mahasiswa",
          nama: name.trim(),
          nim: nim.trim(),
          prodi: prodiMhs,
          angkatan: Number(angkatan),
          password,
        };
      case "umkm":
        return {
          role: "umkm",
          nama: name.trim(),
          email: email.trim(),
          nama_usaha: businessName.trim(),
          sektor_usaha: businessSector,
          alamat: businessAddress.trim(),
          deskripsi_usaha: businessDescription.trim(),
          password,
        };
    }
  }

  function resetForm() {
    setRole(null);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setStatusAkun("active");
    setNip("");
    setJabatan("Dosen Pembimbing");
    setProdiDosen(STUDY_PROGRAMS[0]);
    setMataKuliah([]);
    setNim("");
    setAngkatan("");
    setProdiMhs("");
    setKelas("");
    setKelompokId("");
    setMemberRole("anggota");
    setBusinessName("");
    setBusinessSector(BUSINESS_SECTOR_OPTIONS[0].value);
    setBusinessAddress("");
    setBusinessDescription("");
    setPhone("");
    setAttempted(false);
  }

  async function handleSubmit(event: FormEvent) {
    console.log("STEP 1: handleSubmit");
    event.preventDefault();
    setAttempted(true);
    setApiError(null);
    if (isSubmitting) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0 || !role) {
      return;
    }
    console.log("STEP 2: validation passed");

    setIsSubmitting(true);

    console.log("STEP 3: building payload");
    const payload = buildPayload(role);
    console.log(payload);
    const createdName = name.trim();

    try {
      console.log("STEP 4: invoking edge function");
      const result = await supabase.functions.invoke<CreateUserResponse>("create-user", {
        body: payload,
      });
      console.log(result);

      const { data, error } = result;

      if (error || !data?.success) {
        const message = error
          ? await extractInvokeErrorMessage(error)
          : data?.success === false
            ? data.message
            : "Gagal membuat pengguna. Silakan coba lagi.";
        setApiError(message);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setSuccessMessage(`Pengguna ${createdName} berhasil ditambahkan.`);
      await refetch();
      resetForm();
      setTimeout(() => router.push("/admin/pengguna"), 700);
    } catch (error) {
      console.error(error);
      setApiError("Gagal membuat pengguna. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  }

  if (!isHydrated) {
    return null;
  }

  const identityPreview = !role
    ? "-"
    : role === "admin"
      ? "Administrator"
      : role === "dosen"
        ? nip
          ? `NIP: ${nip}`
          : "-"
        : role === "mahasiswa"
          ? nim
            ? `NIM: ${nim}`
            : "-"
          : businessName || "-";

  return (
    <div>
      <PageHeader
        title="Tambah Pengguna"
        description="Buat akun baru untuk admin, dosen, mahasiswa, atau UMKM mitra."
        actions={
          <Link href="/admin/pengguna">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Daftar Pengguna
            </Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
        {["Pilih Role", "Lengkapi Data", "Konfirmasi"].map((label, index) => {
          const stepNumber = index + 1;
          const activeStep = successMessage ? 3 : role ? 2 : 1;
          const isDone = stepNumber < activeStep;
          const isActiveStep = stepNumber === activeStep;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone
                    ? "bg-purple text-white"
                    : isActiveStep
                      ? "border-2 border-purple text-purple"
                      : "border border-soft-gray-dark text-muted"
                }`}
              >
                {isDone ? <Check size={14} strokeWidth={2.5} /> : stepNumber}
              </span>
              <span className={isActiveStep || isDone ? "font-medium text-navy" : "text-muted"}>{label}</span>
              {stepNumber < 3 && <span className="mx-1 h-px w-8 bg-soft-gray-dark" />}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:max-w-[1000px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 rounded-2xl p-7 lg:p-8">
          <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
            <section>
              <h2 className="mb-1 text-base font-semibold text-navy">1. Pilih Role</h2>
              <p className="mb-4 text-sm text-muted">Tentukan jenis akun yang akan dibuat.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {ROLE_CARDS.map((card) => {
                  const Icon = card.icon;
                  const active = role === card.value;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => setRole(card.value)}
                      className={`relative rounded-2xl border-2 p-4 text-left transition-colors ${
                        active ? "border-purple bg-purple/5" : "border-soft-gray-dark bg-white hover:bg-soft-gray"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-purple text-white">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                      <div
                        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${
                          active ? "bg-purple/10 text-purple" : "bg-soft-gray text-muted"
                        }`}
                      >
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <p className="text-sm font-semibold text-navy">{card.label}</p>
                      <p className="mt-0.5 text-xs text-muted">{card.description}</p>
                    </button>
                  );
                })}
              </div>
              <FieldError message={errors.role} />
            </section>

            {successMessage && (
              <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {successMessage} Mengarahkan ke daftar pengguna...
              </p>
            )}

            {apiError && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{apiError}</p>
            )}

            {!role ? (
              <p className="rounded-xl bg-soft-gray px-4 py-6 text-center text-sm text-muted">
                Pilih role pengguna terlebih dahulu untuk menampilkan form yang sesuai.
              </p>
            ) : (
              <>
                <div className="h-px bg-soft-gray-dark" />

                <section>
                  <h2 className="mb-4 text-base font-semibold text-navy">2. Informasi Akun</h2>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                    <div>
                      <Input
                        label={role === "umkm" ? "Nama Pemilik/Perwakilan" : "Nama Lengkap"}
                        id="name"
                        placeholder="Masukkan nama lengkap"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={errorClass(!!errors.name)}
                      />
                      <FieldError message={errors.name} />
                    </div>
                    <div>
                      <Input
                        label="Email"
                        id="email"
                        type="email"
                        placeholder="nama@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={errorClass(!!errors.email)}
                      />
                      <FieldError message={errors.email} />
                    </div>
                    <div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="text-sm font-medium text-navy">
                          Password Awal
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`h-11 w-full rounded-xl border border-soft-gray-dark bg-white px-4 pr-11 text-sm text-navy outline-none transition-colors placeholder:text-gray-400 focus:border-purple focus:ring-2 focus:ring-purple/10 ${errorClass(!!errors.password) ?? ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy"
                          >
                            {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                          </button>
                        </div>
                      </div>
                      <FieldError message={errors.password} />
                    </div>
                    <div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="confirm-password" className="text-sm font-medium text-navy">
                          Konfirmasi Password
                        </label>
                        <div className="relative">
                          <input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`h-11 w-full rounded-xl border border-soft-gray-dark bg-white px-4 pr-11 text-sm text-navy outline-none transition-colors placeholder:text-gray-400 focus:border-purple focus:ring-2 focus:ring-purple/10 ${errorClass(!!errors.confirmPassword) ?? ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy"
                          >
                            {showConfirmPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                          </button>
                        </div>
                      </div>
                      <FieldError message={errors.confirmPassword} />
                    </div>
                    <Select
                      label="Status Akun"
                      id="status-akun"
                      options={[
                        { value: "active", label: "Aktif" },
                        { value: "inactive", label: "Nonaktif" },
                      ]}
                      value={statusAkun}
                      onChange={(e) => setStatusAkun(e.target.value as "active" | "inactive")}
                    />
                  </div>
                </section>

                <div className="h-px bg-soft-gray-dark" />

                <section>
                  <h2 className="mb-4 text-base font-semibold text-navy">3. Informasi Berdasarkan Role</h2>

                  {role === "admin" && (
                    <p className="rounded-xl bg-purple/5 px-4 py-3 text-sm text-navy">
                      Admin memiliki akses untuk mengelola pengguna, data master, relasi kelas, monitoring, dan
                      rekap data.
                    </p>
                  )}

                  {role === "dosen" && (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                      <div>
                        <Input
                          label="NIP"
                          id="nip"
                          placeholder="Masukkan NIP"
                          value={nip}
                          onChange={(e) => setNip(e.target.value)}
                          className={errorClass(!!errors.nip)}
                        />
                        <FieldError message={errors.nip} />
                      </div>
                      <Input
                        label="Jabatan"
                        id="jabatan"
                        placeholder="Contoh: Dosen Pembimbing"
                        value={jabatan}
                        onChange={(e) => setJabatan(e.target.value)}
                      />
                      <Select
                        label="Program Studi"
                        id="prodi-dosen"
                        options={STUDY_PROGRAMS.map((p) => ({ value: p, label: p }))}
                        value={prodiDosen}
                        onChange={(e) => setProdiDosen(e.target.value)}
                      />
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-navy">Mata Kuliah yang Diampu</span>
                        <div className="flex flex-col gap-2 rounded-xl border border-soft-gray-dark bg-white p-3">
                          {MATA_KULIAH_OPTIONS.map((subject) => (
                            <label key={subject} className="flex items-center gap-2 text-sm text-navy">
                              <input
                                type="checkbox"
                                checked={mataKuliah.includes(subject)}
                                onChange={() => toggleMataKuliah(subject)}
                                className="h-4 w-4 rounded border-soft-gray-dark text-purple focus:ring-purple/30"
                              />
                              {subject}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {role === "mahasiswa" && (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                      <div>
                        <Input
                          label="NIM"
                          id="nim"
                          placeholder="Masukkan NIM"
                          value={nim}
                          onChange={(e) => setNim(e.target.value)}
                          className={errorClass(!!errors.nim)}
                        />
                        <FieldError message={errors.nim} />
                      </div>
                      <div>
                        <Input
                          label="Angkatan"
                          id="angkatan"
                          type="number"
                          placeholder="Contoh: 2024"
                          value={angkatan}
                          onChange={(e) => setAngkatan(e.target.value)}
                          className={errorClass(!!errors.angkatan)}
                        />
                        <FieldError message={errors.angkatan} />
                      </div>
                      <div>
                        <Select
                          label="Program Studi"
                          id="prodi-mhs"
                          options={[
                            { value: "", label: "Pilih program studi" },
                            ...STUDY_PROGRAMS.map((p) => ({ value: p, label: p })),
                          ]}
                          value={prodiMhs}
                          onChange={(e) => handleProdiMhsChange(e.target.value)}
                          className={errorClass(!!errors.prodiMhs)}
                        />
                        <FieldError message={errors.prodiMhs} />
                      </div>
                      <div>
                        <Select
                          label="Kelas"
                          id="kelas"
                          options={[
                            { value: "", label: prodiMhs ? "Pilih kelas" : "Pilih program studi dahulu" },
                            ...kelasOptions.map((c) => ({ value: c, label: c })),
                          ]}
                          value={kelas}
                          onChange={(e) => handleKelasChange(e.target.value)}
                          disabled={!prodiMhs}
                          className={errorClass(!!errors.kelas)}
                        />
                        <FieldError message={errors.kelas} />
                        {!prodiMhs && <p className="mt-1 text-xs text-muted">Pilih program studi terlebih dahulu.</p>}
                      </div>
                      <div>
                        <Select
                          label="Kelompok"
                          id="kelompok"
                          options={[
                            { value: "", label: kelas ? "Belum tergabung kelompok" : "Pilih kelas dahulu" },
                            ...kelompokOptions.map((g) => ({ value: g.id, label: g.code })),
                          ]}
                          value={kelompokId}
                          onChange={(e) => handleKelompokChange(e.target.value)}
                          disabled={!kelas}
                        />
                        {!kelas && <p className="mt-1 text-xs text-muted">Pilih kelas terlebih dahulu.</p>}
                        {kelas && <p className="mt-1 text-xs text-muted">Kelompok boleh dikosongkan jika mahasiswa baru dibuat.</p>}
                      </div>
                      <div>
                        <Select
                          label="Peran dalam Kelompok"
                          id="member-role"
                          options={[
                            { value: "anggota", label: "Anggota" },
                            { value: "ketua", label: "Ketua/Perwakilan" },
                          ]}
                          value={memberRole}
                          onChange={(e) => setMemberRole(e.target.value as GroupMemberRole)}
                          disabled={!kelompokId}
                        />
                        <p className="mt-1 text-xs text-muted">
                          Ketua/perwakilan dapat mengunggah laporan kelompok. Anggota dapat melihat progress dan
                          feedback.
                        </p>
                      </div>
                    </div>
                  )}

                  {role === "umkm" && (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                      <div>
                        <Input
                          label="Nama Usaha"
                          id="business-name"
                          placeholder="Masukkan nama usaha"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          className={errorClass(!!errors.businessName)}
                        />
                        <FieldError message={errors.businessName} />
                      </div>
                      <Select
                        label="Sektor Usaha"
                        id="business-sector"
                        options={BUSINESS_SECTOR_OPTIONS}
                        value={businessSector}
                        onChange={(e) => setBusinessSector(e.target.value)}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="Alamat"
                          id="business-address"
                          placeholder="Masukkan alamat usaha"
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          className={errorClass(!!errors.businessAddress)}
                        />
                        <FieldError message={errors.businessAddress} />
                      </div>
                      <div className="sm:col-span-2">
                        <Input
                          label="Deskripsi Usaha"
                          id="business-description"
                          placeholder="Ceritakan singkat usaha ini"
                          value={businessDescription}
                          onChange={(e) => setBusinessDescription(e.target.value)}
                        />
                      </div>
                      <Input
                        label="Nomor Kontak"
                        id="phone"
                        placeholder="08xxxxxxxxxx"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  )}
                </section>

                <div className="h-px bg-soft-gray-dark" />

                <section>
                  <h2 className="mb-3 text-base font-semibold text-navy">4. Status dan Hak Akses</h2>
                  <p className="rounded-xl bg-soft-gray px-4 py-3 text-sm text-muted">
                    {role === "admin" &&
                      "Akun berstatus aktif dapat langsung digunakan untuk mengelola sistem CEdPreneur."}
                    {role === "dosen" && "Dosen dapat mengelola project dan memberi feedback pada kelompok bimbingannya."}
                    {role === "mahasiswa" &&
                      "Semua mahasiswa dapat melihat dashboard, project, timeline, laporan, dan feedback. Hanya ketua/perwakilan kelompok yang dapat mengunggah laporan."}
                    {role === "umkm" &&
                      "UMKM mitra dapat melihat progress kelompok yang membantu usahanya dan memberi feedback pada laporan."}
                  </p>
                </section>

                <div className="h-px bg-soft-gray-dark" />

                <section className="flex flex-wrap gap-3">
                  <Button type="submit" variant="secondary" disabled={isSubmitting}>
                    {isSubmitting ? "Menyimpan..." : "Simpan Pengguna"}
                  </Button>
                  <Link href="/admin/pengguna">
                    <Button type="button" variant="outline">
                      Batal
                    </Button>
                  </Link>
                </section>
              </>
            )}
          </form>
        </Card>

        <Card className="h-fit rounded-2xl p-6 lg:sticky lg:top-6">
          <h2 className="mb-4 text-base font-semibold text-navy">Ringkasan Akun</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Nama</dt>
              <dd className="font-medium text-navy">{name || "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Email</dt>
              <dd className="max-w-[180px] truncate font-medium text-navy" title={email}>
                {email || "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Role</dt>
              <dd className="font-medium text-navy">{role ? ROLE_LABEL_LOCAL[role] : "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Status</dt>
              <dd className="font-medium text-navy">{statusAkun === "active" ? "Aktif" : "Nonaktif"}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted">Identitas Utama</dt>
              <dd className="font-medium text-navy">{identityPreview}</dd>
            </div>
            {role === "mahasiswa" && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Kelas</dt>
                  <dd className="font-medium text-navy">{kelas || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Kelompok</dt>
                  <dd className="font-medium text-navy">{selectedGroup?.code ?? "Belum ada"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted">Peran Kelompok</dt>
                  <dd className="font-medium text-navy">
                    {selectedGroup ? (memberRole === "ketua" ? "Ketua/Perwakilan" : "Anggota") : "-"}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </Card>
      </div>
    </div>
  );
}
