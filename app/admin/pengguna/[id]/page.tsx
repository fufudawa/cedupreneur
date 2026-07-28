"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, UserRound, GraduationCap, Store } from "lucide-react";
import { PageHeader } from "@/components/shared";
import { Modal } from "@/components/shared";
import { Card, CardHeader, CardTitle, Badge, Button, Input, Select, Textarea } from "@/components/ui";
import {
  ROLE_LABEL,
  ROLE_BADGE_VARIANT,
  getUserIdentity,
  isEmailTaken,
  isNipTaken,
  isNimTaken,
  type AdminUser,
  type UserRole,
} from "@/lib/adminUsersData";
import { useAdminUsers } from "@/lib/useAdminUsers";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { useDosenFeedback } from "@/lib/useDosenFeedback";
import { getAllActivities, formatActivityDateTime } from "@/lib/adminDashboardData";

const ROLE_ICON: Record<UserRole, typeof Users> = {
  admin: Users,
  dosen: UserRound,
  mahasiswa: GraduationCap,
  umkm: Store,
};

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["Kelola pengguna", "Kelola data master", "Kelola relasi kelas", "Monitoring sistem", "Rekap data"],
  dosen: ["Kelola project", "Kelola kelompok", "Lihat laporan", "Beri feedback"],
  mahasiswa: ["Lihat project", "Lihat progress", "Lihat feedback"],
  umkm: ["Lihat progress kelompok", "Beri feedback", "Kelola profil usaha"],
};

const ROLE_SELECT_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "dosen", label: "Dosen" },
  { value: "mahasiswa", label: "Mahasiswa" },
  { value: "umkm", label: "UMKM Mitra" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

function errorClass(hasError: boolean) {
  return hasError ? "!border-red-400 focus:!border-red-400 focus:!ring-red-200" : undefined;
}

function RelationRow({ label, value, connected }: { label: string; value: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-navy">{value}</p>
      </div>
      <Badge variant={connected ? "green" : "gray"}>{connected ? "Terhubung" : "Belum Terhubung"}</Badge>
    </div>
  );
}

function generateDummyPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export default function AdminPenggunaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { users, isHydrated: usersHydrated, updateUser } = useAdminUsers();
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const { feedbacks, isHydrated: feedbackHydrated } = useDosenFeedback();
  const isHydrated = usersHydrated && groupsHydrated && reportsHydrated && feedbackHydrated;

  const user = users.find((u) => u.id === id);

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftStatus, setDraftStatus] = useState<"active" | "inactive">("active");
  const [draftNip, setDraftNip] = useState("");
  const [draftJabatan, setDraftJabatan] = useState("");
  const [draftNim, setDraftNim] = useState("");
  const [draftAngkatan, setDraftAngkatan] = useState("");
  const [draftBusinessName, setDraftBusinessName] = useState("");
  const [draftBusinessSector, setDraftBusinessSector] = useState("");
  const [draftBusinessAddress, setDraftBusinessAddress] = useState("");
  const [draftBusinessDescription, setDraftBusinessDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [note, setNote] = useState("");

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"confirm" | "done">("confirm");
  const [dummyPassword, setDummyPassword] = useState("");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole>("admin");
  const [roleChangeMessage, setRoleChangeMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- users load asynchronously from localStorage, so this re-syncs the read-only view + edit draft once the real record is available (and whenever it changes elsewhere, e.g. after Simpan Perubahan/Ubah Role/status toggle).
    setDraftName(user.name);
    setDraftEmail(user.email);
    setDraftStatus(user.isActive ? "active" : "inactive");
    setDraftNip(user.nip ?? "");
    setDraftJabatan(user.jabatan ?? "");
    setDraftNim(user.nim ?? "");
    setDraftAngkatan(user.angkatan !== undefined ? String(user.angkatan) : "");
    setDraftBusinessName(user.businessName ?? "");
    setDraftBusinessSector(user.businessSector ?? "");
    setDraftBusinessAddress(user.businessAddress ?? "");
    setDraftBusinessDescription(user.businessDescription ?? "");
    setNote(user.adminNote ?? "");
  }, [user]);

  if (!isHydrated) {
    return null;
  }

  if (!user) {
    notFound();
  }

  const relatedGroups = groups.filter((group) => {
    if (user.role === "dosen") return group.lecturerName === user.name;
    if (user.role === "mahasiswa") return group.id === user.groupId || group.members.some((member) => member.name === user.name);
    if (user.role === "umkm") return group.umkmName === user.businessName;
    return false;
  });

  const activityLog =
    user.role === "admin"
      ? users
          .filter((u) => u.createdBy === user.name)
          .map((u) => ({
            id: `created-${u.id}`,
            description: `Menambahkan akun pengguna ${u.name}`,
            createdAt: u.createdAt,
          }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : getAllActivities(groups, reports, feedbacks).filter((activity) => activity.actorName === user.name);

  const recentActivities = activityLog.slice(0, 5);

  const permissions = [...ROLE_PERMISSIONS[user.role]];
  if (user.role === "mahasiswa" && user.memberRole === "ketua") {
    permissions.push("Unggah laporan kelompok");
  }

  const mahasiswaGroup = groups.find((group) => group.id === user.groupId);

  function validateEdit(): Record<string, string> {
    const validationErrors: Record<string, string> = {};
    if (!user) return validationErrors;

    if (draftName.trim() === "") validationErrors.name = "Nama lengkap wajib diisi.";

    if (draftEmail.trim() === "") {
      validationErrors.email = "Email wajib diisi.";
    } else if (!EMAIL_REGEX.test(draftEmail.trim())) {
      validationErrors.email = "Format email tidak valid.";
    } else if (isEmailTaken(draftEmail, users, user.id)) {
      validationErrors.email = "Email sudah digunakan.";
    }

    if (user.role === "dosen") {
      if (draftNip.trim() === "") validationErrors.nip = "NIP wajib diisi.";
      else if (isNipTaken(draftNip, users, user.id)) validationErrors.nip = "NIP sudah digunakan.";
    }

    if (user.role === "mahasiswa") {
      if (draftNim.trim() === "") validationErrors.nim = "NIM wajib diisi.";
      else if (isNimTaken(draftNim, users, user.id)) validationErrors.nim = "NIM sudah digunakan.";
      if (draftAngkatan.trim() === "") validationErrors.angkatan = "Angkatan wajib diisi.";
    }

    if (user.role === "umkm") {
      if (draftBusinessName.trim() === "") validationErrors.businessName = "Nama usaha wajib diisi.";
      if (draftBusinessAddress.trim() === "") validationErrors.businessAddress = "Alamat wajib diisi.";
    }

    return validationErrors;
  }

  function handleStartEdit() {
    setErrors({});
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (!user) return;
    setDraftName(user.name);
    setDraftEmail(user.email);
    setDraftStatus(user.isActive ? "active" : "inactive");
    setDraftNip(user.nip ?? "");
    setDraftJabatan(user.jabatan ?? "");
    setDraftNim(user.nim ?? "");
    setDraftAngkatan(user.angkatan !== undefined ? String(user.angkatan) : "");
    setDraftBusinessName(user.businessName ?? "");
    setDraftBusinessSector(user.businessSector ?? "");
    setDraftBusinessAddress(user.businessAddress ?? "");
    setDraftBusinessDescription(user.businessDescription ?? "");
    setErrors({});
    setIsEditing(false);
  }

  function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const validationErrors = validateEdit();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    let updated: AdminUser = {
      ...user,
      name: draftName.trim(),
      email: draftEmail.trim(),
      isActive: draftStatus === "active",
    };

    if (user.role === "dosen") {
      updated = { ...updated, nip: draftNip.trim(), jabatan: draftJabatan.trim() };
    } else if (user.role === "mahasiswa") {
      updated = { ...updated, nim: draftNim.trim(), angkatan: Number(draftAngkatan) };
    } else if (user.role === "umkm") {
      updated = {
        ...updated,
        businessName: draftBusinessName.trim(),
        businessSector: draftBusinessSector,
        businessAddress: draftBusinessAddress.trim(),
        businessDescription: draftBusinessDescription.trim() || undefined,
      };
    }

    updateUser(updated);
    setIsEditing(false);
  }

  function handleConfirmStatusToggle() {
    if (!user) return;
    updateUser({ ...user, isActive: !user.isActive });
    setStatusModalOpen(false);
  }

  function openResetModal() {
    setResetStep("confirm");
    setDummyPassword("");
    setResetModalOpen(true);
  }

  function handleConfirmReset() {
    setDummyPassword(generateDummyPassword());
    setResetStep("done");
  }

  function openRoleModal() {
    if (!user) return;
    setPendingRole(user.role);
    setRoleModalOpen(true);
  }

  function handleConfirmRoleChange() {
    if (!user) return;
    if (pendingRole === user.role) {
      setRoleModalOpen(false);
      return;
    }
    const updated: AdminUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: pendingRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      createdBy: user.createdBy,
      adminNote: user.adminNote,
    };
    updateUser(updated);
    setRoleChangeMessage(
      `Role berhasil diubah menjadi ${ROLE_LABEL[pendingRole]}. Lengkapi data khusus role melalui Edit Pengguna.`
    );
    setRoleModalOpen(false);
    setIsEditing(false);
  }

  function handleSaveNote() {
    if (!user) return;
    updateUser({ ...user, adminNote: note });
  }

  const Icon = ROLE_ICON[user.role];

  return (
    <div>
      <p className="mb-2 text-xs text-muted">Pengguna / Detail Pengguna</p>
      <PageHeader
        title="Detail Pengguna"
        description="Lihat informasi akun, relasi, dan aktivitas pengguna."
        actions={
          <Link href="/admin/pengguna">
            <Button variant="outline">
              <ArrowLeft size={16} strokeWidth={2} />
              Kembali ke Daftar Pengguna
            </Button>
          </Link>
        }
      />

      <Card className="mb-6 min-w-0 rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple/10 text-purple">
            <Icon size={26} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-navy">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ROLE_BADGE_VARIANT[user.role]}>{ROLE_LABEL[user.role]}</Badge>
            <Badge variant={user.isActive ? "green" : "gray"}>{user.isActive ? "Aktif" : "Nonaktif"}</Badge>
            <Badge variant="navy">{getUserIdentity(user)}</Badge>
          </div>
        </div>
      </Card>

      {roleChangeMessage && (
        <p className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{roleChangeMessage}</p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <Card className="min-w-0 rounded-2xl p-6">
            <CardHeader>
              <CardTitle className="text-lg">Informasi Akun</CardTitle>
            </CardHeader>

            <form onSubmit={handleSaveEdit}>
              {isEditing ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div>
                    <Input
                      label="Nama Lengkap"
                      id="edit-name"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className={errorClass(!!errors.name)}
                    />
                    <FieldError message={errors.name} />
                  </div>
                  <div>
                    <Input
                      label="Email"
                      id="edit-email"
                      type="email"
                      value={draftEmail}
                      onChange={(e) => setDraftEmail(e.target.value)}
                      className={errorClass(!!errors.email)}
                    />
                    <FieldError message={errors.email} />
                  </div>
                  <Select
                    label="Status Akun"
                    id="edit-status"
                    options={[
                      { value: "active", label: "Aktif" },
                      { value: "inactive", label: "Nonaktif" },
                    ]}
                    value={draftStatus}
                    onChange={(e) => setDraftStatus(e.target.value as "active" | "inactive")}
                  />
                  <div>
                    <p className="text-sm font-medium text-navy">Role</p>
                    <p className="mt-1 flex h-11 items-center text-sm text-muted">
                      {ROLE_LABEL[user.role]} &middot; gunakan tombol Ubah Role untuk mengganti
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">Nama Lengkap</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Email</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Role</p>
                    <p className="mt-1">
                      <Badge variant={ROLE_BADGE_VARIANT[user.role]}>{ROLE_LABEL[user.role]}</Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Status Akun</p>
                    <p className="mt-1">
                      <Badge variant={user.isActive ? "green" : "gray"}>{user.isActive ? "Aktif" : "Nonaktif"}</Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Dibuat Oleh</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.createdBy ?? "System"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Tanggal Dibuat</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="mt-6 flex flex-wrap gap-3 border-t border-soft-gray-dark pt-5">
                  <Button type="submit" variant="secondary">
                    Simpan Perubahan
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Batal Edit
                  </Button>
                </div>
              )}
            </form>
          </Card>

          <Card className="min-w-0 rounded-2xl p-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {user.role === "admin" && "Informasi Administrator"}
                {user.role === "dosen" && "Informasi Dosen"}
                {user.role === "mahasiswa" && "Informasi Mahasiswa"}
                {user.role === "umkm" && "Informasi UMKM"}
              </CardTitle>
            </CardHeader>

            {user.role === "admin" && (
              <p className="text-sm text-muted">
                Hak akses admin ditentukan otomatis oleh role. Lihat daftar hak akses pada bagian Aksi Akun.
              </p>
            )}

            {user.role === "dosen" &&
              (isEditing ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div>
                    <Input label="NIP" id="edit-nip" value={draftNip} onChange={(e) => setDraftNip(e.target.value)} className={errorClass(!!errors.nip)} />
                    <FieldError message={errors.nip} />
                  </div>
                  <Input label="Jabatan" id="edit-jabatan" value={draftJabatan} onChange={(e) => setDraftJabatan(e.target.value)} />
                  <p className="text-xs text-muted sm:col-span-2">
                    Relasi kelas dan kelompok dikelola melalui menu Relasi Kelas atau Project.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">NIP</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.nip ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Jabatan</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.jabatan ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Program Studi</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.prodi ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Mata Kuliah Diampu</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.mataKuliah?.join(", ") || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Jumlah Kelompok Bimbingan</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{relatedGroups.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Jumlah Project Aktif</p>
                    <p className="mt-1 text-sm font-semibold text-navy">
                      {relatedGroups.filter((g) => g.status === "progress").length}
                    </p>
                  </div>
                </div>
              ))}

            {user.role === "mahasiswa" &&
              (isEditing ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div>
                    <Input label="NIM" id="edit-nim" value={draftNim} onChange={(e) => setDraftNim(e.target.value)} className={errorClass(!!errors.nim)} />
                    <FieldError message={errors.nim} />
                  </div>
                  <div>
                    <Input
                      label="Angkatan"
                      id="edit-angkatan"
                      type="number"
                      value={draftAngkatan}
                      onChange={(e) => setDraftAngkatan(e.target.value)}
                      className={errorClass(!!errors.angkatan)}
                    />
                    <FieldError message={errors.angkatan} />
                  </div>
                  <p className="text-xs text-muted sm:col-span-2">
                    Relasi kelas dan kelompok dikelola melalui menu Relasi Kelas atau Project.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">NIM</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.nim ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Angkatan</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.angkatan ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Program Studi</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.prodi ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Kelas</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.kelas ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Kelompok</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{mahasiswaGroup?.code ?? "Belum ada kelompok"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Peran dalam Kelompok</p>
                    <p className="mt-1 text-sm font-semibold text-navy">
                      {user.memberRole === "ketua" ? "Ketua/Perwakilan" : user.memberRole === "anggota" ? "Anggota" : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">UMKM Mitra</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{mahasiswaGroup?.umkmName ?? "-"}</p>
                  </div>
                  <p className="text-xs text-muted sm:col-span-2 lg:col-span-3">
                    Ketua/perwakilan dapat mengunggah laporan kelompok. Anggota dapat melihat progress dan feedback.
                  </p>
                </div>
              ))}

            {user.role === "umkm" &&
              (isEditing ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                  <div>
                    <Input
                      label="Nama Usaha"
                      id="edit-business-name"
                      value={draftBusinessName}
                      onChange={(e) => setDraftBusinessName(e.target.value)}
                      className={errorClass(!!errors.businessName)}
                    />
                    <FieldError message={errors.businessName} />
                  </div>
                  <Select
                    label="Sektor Usaha"
                    id="edit-business-sector"
                    options={[
                      { value: "Food and Beverage", label: "Food and Beverage" },
                      { value: "Fashion", label: "Fashion" },
                      { value: "Jasa", label: "Jasa" },
                      { value: "Kerajinan", label: "Kerajinan" },
                      { value: "Teknologi", label: "Teknologi" },
                      { value: "Lainnya", label: "Lainnya" },
                    ]}
                    value={draftBusinessSector}
                    onChange={(e) => setDraftBusinessSector(e.target.value)}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Alamat"
                      id="edit-business-address"
                      value={draftBusinessAddress}
                      onChange={(e) => setDraftBusinessAddress(e.target.value)}
                      className={errorClass(!!errors.businessAddress)}
                    />
                    <FieldError message={errors.businessAddress} />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      label="Deskripsi Usaha"
                      id="edit-business-description"
                      value={draftBusinessDescription}
                      onChange={(e) => setDraftBusinessDescription(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted sm:col-span-2">
                    Relasi kelas dan kelompok dikelola melalui menu Relasi Kelas atau Project.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">Nama Perwakilan/Pemilik</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Nama Usaha</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.businessName ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Sektor Usaha</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.businessSector ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Alamat</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.businessAddress ?? "-"}</p>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <p className="text-xs text-muted">Deskripsi Usaha</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.businessDescription ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Kelompok Pendamping</p>
                    <p className="mt-1 text-sm font-semibold text-navy">
                      {relatedGroups[0]?.code ?? "Belum ada kelompok"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Project Terhubung</p>
                    <p className="mt-1 text-sm font-semibold text-navy">
                      {relatedGroups.length > 0 ? "Praktik Kewirausahaan" : "-"}
                    </p>
                  </div>
                </div>
              ))}
          </Card>

          <Card className="min-w-0 rounded-2xl p-6">
            <CardHeader>
              <CardTitle className="text-lg">Catatan Admin</CardTitle>
            </CardHeader>
            <p className="mb-3 text-xs text-muted">Catatan internal, hanya terlihat oleh Admin.</p>
            <Textarea
              id="admin-note"
              placeholder="Tambahkan catatan internal mengenai akun ini..."
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted">{note.length}/500</span>
              <Button type="button" variant="outline" size="sm" onClick={handleSaveNote}>
                Simpan Catatan
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="min-w-0 rounded-2xl p-6">
            <CardHeader>
              <CardTitle className="text-lg">Relasi Pengguna</CardTitle>
            </CardHeader>

            {user.role === "admin" && <p className="text-sm text-muted">Tidak ada relasi akademik.</p>}

            {user.role === "dosen" && (
              <div className="flex flex-col divide-y divide-soft-gray-dark">
                <RelationRow
                  label="Kelas Diampu"
                  value={Array.from(new Set(relatedGroups.map((g) => g.className))).join(", ") || "-"}
                  connected={relatedGroups.length > 0}
                />
                <RelationRow label="Mata Kuliah" value={user.mataKuliah?.join(", ") || "-"} connected={!!user.mataKuliah?.length} />
                <RelationRow label="Kelompok Bimbingan" value={`${relatedGroups.length} kelompok`} connected={relatedGroups.length > 0} />
              </div>
            )}

            {user.role === "mahasiswa" && (
              <div className="flex flex-col divide-y divide-soft-gray-dark">
                <RelationRow label="Kelas" value={user.kelas ?? "-"} connected={!!user.kelas} />
                <RelationRow label="Kelompok" value={mahasiswaGroup?.code ?? "Belum ada kelompok"} connected={!!mahasiswaGroup} />
                <RelationRow
                  label="Peran Kelompok"
                  value={user.memberRole === "ketua" ? "Ketua/Perwakilan" : user.memberRole === "anggota" ? "Anggota" : "-"}
                  connected={!!mahasiswaGroup}
                />
                <RelationRow label="UMKM Mitra" value={mahasiswaGroup?.umkmName ?? "-"} connected={!!mahasiswaGroup} />
              </div>
            )}

            {user.role === "umkm" && (
              <div className="flex flex-col divide-y divide-soft-gray-dark">
                <RelationRow
                  label="Kelas Terkait"
                  value={Array.from(new Set(relatedGroups.map((g) => g.className))).join(", ") || "-"}
                  connected={relatedGroups.length > 0}
                />
                <RelationRow label="Kelompok Pendamping" value={relatedGroups[0]?.code ?? "-"} connected={relatedGroups.length > 0} />
                <RelationRow
                  label="Project Terkait"
                  value={relatedGroups.length > 0 ? "Praktik Kewirausahaan" : "-"}
                  connected={relatedGroups.length > 0}
                />
              </div>
            )}

            {(user.role === "dosen" || user.role === "mahasiswa" || user.role === "umkm") && relatedGroups.length === 0 && (
              <p className="mt-3 text-sm text-muted">Pengguna ini belum memiliki relasi data.</p>
            )}

            <div className="mt-4 border-t border-soft-gray-dark pt-4">
              <p className="mb-2 text-xs font-medium text-navy">Hak Akses</p>
              <div className="flex flex-wrap gap-2">
                {permissions.map((permission) => (
                  <Badge key={permission} variant="purple">
                    {permission}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

          <Card className="min-w-0 rounded-2xl p-6">
            <CardHeader>
              <CardTitle className="text-lg">Riwayat Aktivitas</CardTitle>
            </CardHeader>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted">Belum ada aktivitas pengguna.</p>
            ) : (
              <div className="flex flex-col divide-y divide-soft-gray-dark">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-sm text-navy">{activity.description}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatActivityDateTime(activity.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/admin/aktivitas"
              className="mt-4 inline-block text-sm font-medium text-purple transition-colors hover:text-purple-dark"
            >
              Lihat Seluruh Aktivitas
            </Link>
          </Card>

          <Card className="min-w-0 rounded-2xl p-6">
            <CardHeader>
              <CardTitle className="text-lg">Aksi Akun</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-3">
              {isEditing ? (
                <p className="text-sm text-muted">Sedang dalam mode edit. Simpan atau batalkan perubahan pada Informasi Akun.</p>
              ) : (
                <Button variant="secondary" onClick={handleStartEdit}>
                  Edit Pengguna
                </Button>
              )}
              <Button variant="outline" onClick={openResetModal}>
                Reset Password
              </Button>
              <Button variant="outline" onClick={() => setStatusModalOpen(true)}>
                {user.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
              </Button>
              <Button variant="outline" onClick={openRoleModal}>
                Ubah Role
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={user.isActive ? "Nonaktifkan akun?" : "Aktifkan akun?"}
      >
        <p className="text-sm text-muted">
          {user.isActive
            ? "Pengguna tidak dapat login sampai akun diaktifkan kembali."
            : "Pengguna akan dapat login kembali setelah akun diaktifkan."}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setStatusModalOpen(false)}>
            Batal
          </Button>
          <Button variant={user.isActive ? "danger" : "secondary"} onClick={handleConfirmStatusToggle}>
            {user.isActive ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={resetStep === "confirm" ? "Reset password pengguna?" : "Password sementara dibuat"}
      >
        {resetStep === "confirm" ? (
          <>
            <p className="text-sm text-muted">Reset password untuk pengguna ini?</p>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setResetModalOpen(false)}>
                Batal
              </Button>
              <Button variant="secondary" onClick={handleConfirmReset}>
                Reset Password
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Password sementara untuk {user.name}:</p>
            <p className="mt-2 rounded-xl bg-soft-gray px-4 py-3 text-center font-mono text-base font-semibold text-navy">
              {dummyPassword}
            </p>
            <p className="mt-2 text-xs text-muted">
              Ini adalah simulasi frontend. Password tidak benar-benar diubah di sistem autentikasi.
            </p>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setResetModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={roleModalOpen} onClose={() => setRoleModalOpen(false)} title="Ubah role pengguna?">
        <p className="text-sm text-muted">
          Perubahan role dapat memengaruhi relasi kelas, kelompok, dan akses pengguna.
        </p>
        <div className="mt-4">
          <Select
            label="Role Baru"
            id="pending-role"
            options={ROLE_SELECT_OPTIONS}
            value={pendingRole}
            onChange={(e) => setPendingRole(e.target.value as UserRole)}
          />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setRoleModalOpen(false)}>
            Batal
          </Button>
          <Button variant="secondary" onClick={handleConfirmRoleChange}>
            Ubah Role
          </Button>
        </div>
      </Modal>
    </div>
  );
}
