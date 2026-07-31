"use client";

import { use, useEffect, useState, type FormEvent } from "react";
import { notFound, useRouter } from "next/navigation";
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
import { formatActivityDateTime } from "@/lib/adminDashboardData";
import { STUDY_PROGRAMS } from "@/lib/dosenGroupsStorage";
import { supabase } from "@/lib/supabaseClient";

interface RelationInfo {
  kelas: string[];
  kelompok: string[];
  umkmName: string | null;
  project: string[];
}

const EMPTY_RELATION_INFO: RelationInfo = { kelas: [], kelompok: [], umkmName: null, project: [] };

interface ActivityRow {
  id: string;
  aktivitas: string;
  created_at: string;
}

/** Body sent to the `change-user-role` Edge Function — one shape per new role. */
type ChangeUserRolePayload =
  | { id: string; newRole: "admin" }
  | { id: string; newRole: "dosen"; nip: string; fakultas: string }
  | { id: string; newRole: "mahasiswa"; nim: string; prodi: string; angkatan: number }
  | {
      id: string;
      newRole: "umkm";
      nama_usaha: string;
      sektor_usaha: string;
      alamat: string;
      deskripsi_usaha: string;
    };

type ChangeUserRoleResponse = { success: true; message: string } | { success: false; message: string };

const MATA_KULIAH_OPTIONS = ["Praktik Kewirausahaan"];

const BUSINESS_SECTOR_OPTIONS = [
  { value: "Food and Beverage", label: "Food and Beverage" },
  { value: "Fashion", label: "Fashion" },
  { value: "Jasa", label: "Jasa" },
  { value: "Kerajinan", label: "Kerajinan" },
  { value: "Teknologi", label: "Teknologi" },
  { value: "Lainnya", label: "Lainnya" },
];

/** Body sent to the `update-user` Edge Function — one shape per role, no extra fields. */
type UpdateUserPayload =
  | { id: string; role: "admin"; nama: string; email: string; is_active: boolean }
  | {
      id: string;
      role: "dosen";
      nama: string;
      nip: string;
      fakultas: string;
      jabatan: string;
      mata_kuliah: string[];
      is_active: boolean;
    }
  | {
      id: string;
      role: "mahasiswa";
      nama: string;
      nim: string;
      prodi: string;
      angkatan: number;
      is_active: boolean;
    }
  | {
      id: string;
      role: "umkm";
      nama: string;
      email: string;
      nama_usaha: string;
      sektor_usaha: string;
      alamat: string;
      deskripsi_usaha: string;
      kontak: string;
      is_active: boolean;
    };

type UpdateUserResponse = { success: true; message: string } | { success: false; message: string };

/** Body sent to the `delete-user` Edge Function. */
type DeleteUserPayload = { id: string; role: UserRole };

type DeleteUserResponse = { success: true; message: string } | { success: false; message: string };

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
  return "Gagal memperbarui pengguna. Silakan coba lagi.";
}

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

export default function AdminPenggunaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { users, isHydrated: usersHydrated, updateUser, refetch } = useAdminUsers();

  const user = users.find((u) => u.id === id);

  const [relation, setRelation] = useState<RelationInfo>(EMPTY_RELATION_INFO);
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([]);
  const [relationHydrated, setRelationHydrated] = useState(false);
  const isHydrated = usersHydrated && relationHydrated;

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftStatus, setDraftStatus] = useState<"active" | "inactive">("active");
  const [draftNip, setDraftNip] = useState("");
  const [draftJabatan, setDraftJabatan] = useState("");
  const [draftMataKuliah, setDraftMataKuliah] = useState<string[]>([]);
  const [draftNim, setDraftNim] = useState("");
  const [draftAngkatan, setDraftAngkatan] = useState("");
  const [draftBusinessName, setDraftBusinessName] = useState("");
  const [draftBusinessSector, setDraftBusinessSector] = useState("");
  const [draftBusinessAddress, setDraftBusinessAddress] = useState("");
  const [draftBusinessDescription, setDraftBusinessDescription] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"confirm" | "done">("confirm");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetTouched, setResetTouched] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole>("admin");
  const [roleChangeMessage, setRoleChangeMessage] = useState<string | null>(null);
  const [roleChangeError, setRoleChangeError] = useState<string | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [roleNip, setRoleNip] = useState("");
  const [roleFakultas, setRoleFakultas] = useState<string>(STUDY_PROGRAMS[0]);
  const [roleNim, setRoleNim] = useState("");
  const [roleProdi, setRoleProdi] = useState<string>(STUDY_PROGRAMS[0]);
  const [roleAngkatan, setRoleAngkatan] = useState("");
  const [roleBusinessName, setRoleBusinessName] = useState("");
  const [roleBusinessSector, setRoleBusinessSector] = useState(BUSINESS_SECTOR_OPTIONS[0].value);
  const [roleBusinessAddress, setRoleBusinessAddress] = useState("");
  const [roleBusinessDescription, setRoleBusinessDescription] = useState("");
  const [roleFieldErrors, setRoleFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- users load asynchronously from localStorage, so this re-syncs the read-only view + edit draft once the real record is available (and whenever it changes elsewhere, e.g. after Simpan Perubahan/Ubah Role/status toggle).
    setDraftName(user.name);
    setDraftEmail(user.email);
    setDraftStatus(user.isActive ? "active" : "inactive");
    setDraftNip(user.nip ?? "");
    setDraftJabatan(user.jabatan ?? "");
    setDraftMataKuliah(user.mataKuliah ?? []);
    setDraftNim(user.nim ?? "");
    setDraftAngkatan(user.angkatan !== undefined ? String(user.angkatan) : "");
    setDraftBusinessName(user.businessName ?? "");
    setDraftBusinessSector(user.businessSector ?? "");
    setDraftBusinessAddress(user.businessAddress ?? "");
    setDraftBusinessDescription(user.businessDescription ?? "");
    setDraftPhone(user.phone ?? "");
    setNote(user.adminNote ?? "");
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function loadRelationAndActivity() {
      if (!user) return;

      try {
        const { data: activityData, error: activityError } = await supabase
          .from("activity_log")
          .select("id, aktivitas, created_at")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        if (activityError) throw activityError;
        if (isMounted) setActivityRows((activityData ?? []) as ActivityRow[]);
      } catch (error) {
        console.error("Failed to load activity log (cek RLS SELECT pada tabel activity_log):", error);
        if (isMounted) setActivityRows([]);
      }

      try {
        if (user.role === "dosen") {
          const { data: dosenRow, error: dosenError } = await supabase
            .from("dosen")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle();
          if (dosenError) throw dosenError;
          if (!dosenRow) {
            if (isMounted) setRelation(EMPTY_RELATION_INFO);
            return;
          }

          const [kelasResult, kelompokResult, projectResult] = await Promise.all([
            supabase.from("kelas").select("nama_kelas").eq("dosen_id", dosenRow.id),
            supabase
              .from("kelompok")
              .select("nama_kelompok, project!inner(created_by)")
              .eq("project.created_by", dosenRow.id),
            supabase.from("project").select("judul_project").eq("created_by", dosenRow.id).eq("status", "berjalan"),
          ]);
          if (kelasResult.error) throw kelasResult.error;
          if (kelompokResult.error) throw kelompokResult.error;
          if (projectResult.error) throw projectResult.error;

          if (isMounted) {
            setRelation({
              kelas: (kelasResult.data ?? []).map((k) => k.nama_kelas ?? "-"),
              kelompok: (kelompokResult.data ?? []).map((k) => k.nama_kelompok ?? "-"),
              umkmName: null,
              project: (projectResult.data ?? []).map((p) => p.judul_project ?? "-"),
            });
          }
        } else if (user.role === "mahasiswa") {
          const { data: mahasiswaRow, error: mahasiswaError } = await supabase
            .from("mahasiswa")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle();
          if (mahasiswaError) throw mahasiswaError;
          if (!mahasiswaRow) {
            if (isMounted) setRelation(EMPTY_RELATION_INFO);
            return;
          }

          const { data: anggotaData, error: anggotaError } = await supabase
            .from("kelompok_anggota")
            .select("kelompok ( nama_kelompok, project ( umkm ( nama_usaha ) ) )")
            .eq("mahasiswa_id", mahasiswaRow.id);
          if (anggotaError) throw anggotaError;

          type AnggotaJoinRow = {
            kelompok: {
              nama_kelompok: string | null;
              project: { umkm: { nama_usaha: string | null } | null } | null;
            } | null;
          };
          const rows = (anggotaData ?? []) as unknown as AnggotaJoinRow[];
          const kelompokNames = rows.map((r) => r.kelompok?.nama_kelompok ?? "-");
          const umkmName = rows.find((r) => r.kelompok?.project?.umkm?.nama_usaha)?.kelompok?.project?.umkm
            ?.nama_usaha ?? null;

          if (isMounted) {
            setRelation({ kelas: [], kelompok: kelompokNames, umkmName, project: [] });
          }
        } else if (user.role === "umkm") {
          const { data: umkmRow, error: umkmError } = await supabase
            .from("umkm")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle();
          if (umkmError) throw umkmError;
          if (!umkmRow) {
            if (isMounted) setRelation(EMPTY_RELATION_INFO);
            return;
          }

          const [kelasUmkmResult, kelompokResult, projectResult] = await Promise.all([
            supabase.from("kelas_umkm").select("kelas ( nama_kelas )").eq("umkm_id", umkmRow.id),
            supabase
              .from("kelompok")
              .select("nama_kelompok, project!inner(umkm_id)")
              .eq("project.umkm_id", umkmRow.id),
            supabase.from("project").select("judul_project").eq("umkm_id", umkmRow.id),
          ]);
          if (kelasUmkmResult.error) throw kelasUmkmResult.error;
          if (kelompokResult.error) throw kelompokResult.error;
          if (projectResult.error) throw projectResult.error;

          type KelasUmkmJoinRow = { kelas: { nama_kelas: string | null } | null };

          if (isMounted) {
            setRelation({
              kelas: ((kelasUmkmResult.data ?? []) as unknown as KelasUmkmJoinRow[]).map(
                (k) => k.kelas?.nama_kelas ?? "-"
              ),
              kelompok: (kelompokResult.data ?? []).map((k) => k.nama_kelompok ?? "-"),
              umkmName: null,
              project: (projectResult.data ?? []).map((p) => p.judul_project ?? "-"),
            });
          }
        } else {
          if (isMounted) setRelation(EMPTY_RELATION_INFO);
        }
      } catch (error) {
        console.error("Failed to load user relation data (cek RLS pada tabel terkait):", error);
        if (isMounted) setRelation(EMPTY_RELATION_INFO);
      } finally {
        if (isMounted) setRelationHydrated(true);
      }
    }

    loadRelationAndActivity();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!isHydrated) {
    return null;
  }

  if (!user) {
    notFound();
  }

  const recentActivities = activityRows;

  const permissions = [...ROLE_PERMISSIONS[user.role]];
  if (user.role === "mahasiswa" && user.memberRole === "ketua") {
    permissions.push("Unggah laporan kelompok");
  }

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
    setSaveMessage(null);
    setSaveError(null);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (!user) return;
    setDraftName(user.name);
    setDraftEmail(user.email);
    setDraftStatus(user.isActive ? "active" : "inactive");
    setDraftNip(user.nip ?? "");
    setDraftJabatan(user.jabatan ?? "");
    setDraftMataKuliah(user.mataKuliah ?? []);
    setDraftNim(user.nim ?? "");
    setDraftAngkatan(user.angkatan !== undefined ? String(user.angkatan) : "");
    setDraftBusinessName(user.businessName ?? "");
    setDraftBusinessSector(user.businessSector ?? "");
    setDraftBusinessAddress(user.businessAddress ?? "");
    setDraftBusinessDescription(user.businessDescription ?? "");
    setDraftPhone(user.phone ?? "");
    setErrors({});
    setIsEditing(false);
  }

  function toggleDraftMataKuliah(subject: string) {
    setDraftMataKuliah((prev) => (prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]));
  }

  function buildUpdatePayload(targetUser: AdminUser): UpdateUserPayload {
    const isActive = draftStatus === "active";
    const nama = draftName.trim();

    switch (targetUser.role) {
      case "admin":
        return { id: targetUser.id, role: "admin", nama, email: draftEmail.trim(), is_active: isActive };
      case "dosen":
        // Program studi (DB column "fakultas") has no editable input in this form —
        // carry the existing value through unchanged.
        return {
          id: targetUser.id,
          role: "dosen",
          nama,
          nip: draftNip.trim(),
          fakultas: targetUser.prodi ?? "",
          jabatan: draftJabatan.trim(),
          mata_kuliah: draftMataKuliah,
          is_active: isActive,
        };
      case "mahasiswa":
        // Program studi has no editable input in this form — carry the existing value through unchanged.
        return {
          id: targetUser.id,
          role: "mahasiswa",
          nama,
          nim: draftNim.trim(),
          prodi: targetUser.prodi ?? "",
          angkatan: Number(draftAngkatan),
          is_active: isActive,
        };
      case "umkm":
        return {
          id: targetUser.id,
          role: "umkm",
          nama,
          email: draftEmail.trim(),
          nama_usaha: draftBusinessName.trim(),
          sektor_usaha: draftBusinessSector,
          alamat: draftBusinessAddress.trim(),
          deskripsi_usaha: draftBusinessDescription.trim(),
          kontak: draftPhone.trim(),
          is_active: isActive,
        };
    }
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (isSaving) return;

    const validationErrors = validateEdit();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaveError(null);
    setIsSaving(true);

    const payload = buildUpdatePayload(user);

    try {
      const result = await supabase.functions.invoke<UpdateUserResponse>("update-user", {
        body: payload,
      });

      const { data, error } = result;

      if (error || !data?.success) {
        const message = error
          ? await extractInvokeErrorMessage(error)
          : data?.success === false
            ? data.message
            : "Gagal memperbarui pengguna. Silakan coba lagi.";
        setSaveError(message);
        setIsSaving(false);
        return;
      }

      setIsSaving(false);
      setSaveMessage(data.message);
      await refetch();
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setSaveError("Gagal memperbarui pengguna. Silakan coba lagi.");
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!user) return;
    if (isDeleting) return;

    setDeleteError(null);
    setIsDeleting(true);

    const payload: DeleteUserPayload = { id: user.id, role: user.role };

    try {
      const result = await supabase.functions.invoke<DeleteUserResponse>("delete-user", {
        body: payload,
      });

      const { data, error } = result;

      if (error || !data?.success) {
        const message = error
          ? await extractInvokeErrorMessage(error)
          : data?.success === false
            ? data.message
            : "Gagal menghapus pengguna. Silakan coba lagi.";
        setDeleteError(message);
        setIsDeleting(false);
        return;
      }

      setDeleteModalOpen(false);
      setSaveMessage(data.message);
      await refetch();
      setTimeout(() => router.push("/admin/pengguna"), 700);
    } catch (error) {
      console.error(error);
      setDeleteError("Gagal menghapus pengguna. Silakan coba lagi.");
      setIsDeleting(false);
    }
  }

  function openResetModal() {
    setResetStep("confirm");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetTouched(false);
    setResetError(null);
    setResetModalOpen(true);
  }

  const resetErrors = {
    newPassword: newPassword.trim().length < 8 ? "Password minimal 8 karakter." : null,
    confirmNewPassword: confirmNewPassword !== newPassword ? "Konfirmasi password tidak sama." : null,
  };
  const isResetValid = Object.values(resetErrors).every((message) => message === null);

  async function handleConfirmReset() {
    if (!user) return;
    setResetTouched(true);
    if (!isResetValid) return;
    if (isResettingPassword) return;

    setResetError(null);
    setIsResettingPassword(true);
    try {
      const result = await supabase.functions.invoke<
        { success: true; message: string } | { success: false; message: string }
      >("reset-user-password", { body: { id: user.id, password: newPassword.trim() } });

      const { data, error } = result;
      if (error || !data?.success) {
        const message = error
          ? await extractInvokeErrorMessage(error)
          : data?.success === false
            ? data.message
            : "Gagal mereset password. Silakan coba lagi.";
        setResetError(message);
        setIsResettingPassword(false);
        return;
      }

      setResetStep("done");
      setIsResettingPassword(false);
    } catch (error) {
      console.error("Failed to reset password", error);
      setResetError("Gagal mereset password. Silakan coba lagi.");
      setIsResettingPassword(false);
    }
  }

  function openRoleModal() {
    if (!user) return;
    setPendingRole(user.role);
    setRoleChangeMessage(null);
    setRoleChangeError(null);
    setRoleFieldErrors({});
    setRoleNip("");
    setRoleFakultas(STUDY_PROGRAMS[0]);
    setRoleNim("");
    setRoleProdi(STUDY_PROGRAMS[0]);
    setRoleAngkatan("");
    setRoleBusinessName("");
    setRoleBusinessSector(BUSINESS_SECTOR_OPTIONS[0].value);
    setRoleBusinessAddress("");
    setRoleBusinessDescription("");
    setRoleModalOpen(true);
  }

  function validateRoleFields(): Record<string, string> {
    const fieldErrors: Record<string, string> = {};
    if (pendingRole === "dosen") {
      if (roleNip.trim() === "") fieldErrors.roleNip = "NIP wajib diisi.";
      else if (isNipTaken(roleNip, users)) fieldErrors.roleNip = "NIP sudah digunakan.";
    }
    if (pendingRole === "mahasiswa") {
      if (roleNim.trim() === "") fieldErrors.roleNim = "NIM wajib diisi.";
      else if (isNimTaken(roleNim, users)) fieldErrors.roleNim = "NIM sudah digunakan.";
      if (roleAngkatan.trim() === "") fieldErrors.roleAngkatan = "Angkatan wajib diisi.";
    }
    if (pendingRole === "umkm") {
      if (roleBusinessName.trim() === "") fieldErrors.roleBusinessName = "Nama usaha wajib diisi.";
      if (roleBusinessAddress.trim() === "") fieldErrors.roleBusinessAddress = "Alamat wajib diisi.";
      if (roleBusinessDescription.trim() === "") fieldErrors.roleBusinessDescription = "Deskripsi usaha wajib diisi.";
    }
    return fieldErrors;
  }

  function buildChangeRolePayload(userId: string): ChangeUserRolePayload {
    switch (pendingRole) {
      case "admin":
        return { id: userId, newRole: "admin" };
      case "dosen":
        return { id: userId, newRole: "dosen", nip: roleNip.trim(), fakultas: roleFakultas };
      case "mahasiswa":
        return {
          id: userId,
          newRole: "mahasiswa",
          nim: roleNim.trim(),
          prodi: roleProdi,
          angkatan: Number(roleAngkatan),
        };
      case "umkm":
        return {
          id: userId,
          newRole: "umkm",
          nama_usaha: roleBusinessName.trim(),
          sektor_usaha: roleBusinessSector,
          alamat: roleBusinessAddress.trim(),
          deskripsi_usaha: roleBusinessDescription.trim(),
        };
    }
  }

  async function handleConfirmRoleChange() {
    if (!user) return;
    if (pendingRole === user.role) {
      setRoleModalOpen(false);
      return;
    }

    const fieldErrors = validateRoleFields();
    setRoleFieldErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    if (isChangingRole) return;

    setRoleChangeError(null);
    setIsChangingRole(true);
    try {
      const result = await supabase.functions.invoke<ChangeUserRoleResponse>("change-user-role", {
        body: buildChangeRolePayload(user.id),
      });

      const { data, error } = result;
      if (error || !data?.success) {
        const message = error
          ? await extractInvokeErrorMessage(error)
          : data?.success === false
            ? data.message
            : "Gagal mengubah role. Silakan coba lagi.";
        setRoleChangeError(message);
        setIsChangingRole(false);
        return;
      }

      setRoleChangeMessage(`Role berhasil diubah menjadi ${ROLE_LABEL[pendingRole]}.`);
      setIsChangingRole(false);
      setRoleModalOpen(false);
      setIsEditing(false);
      await refetch();
    } catch (error) {
      console.error("Failed to change user role", error);
      setRoleChangeError("Gagal mengubah role. Silakan coba lagi.");
      setIsChangingRole(false);
    }
  }

  function handleSaveNote() {
    if (!user) return;
    setNoteError(null);
    try {
      updateUser({ ...user, adminNote: note });
    } catch {
      setNoteError("Catatan belum dapat disimpan ke sistem saat ini.");
    }
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
      {roleChangeError && (
        <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{roleChangeError}</p>
      )}

      {saveMessage && (
        <p className="mb-6 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">{saveMessage}</p>
      )}

      {saveError && (
        <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{saveError}</p>
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
                  <Button type="submit" variant="secondary" disabled={isSaving}>
                    Simpan Perubahan
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
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
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-navy">Mata Kuliah yang Diampu</span>
                    <div className="flex flex-col gap-2 rounded-xl border border-soft-gray-dark bg-white p-3">
                      {MATA_KULIAH_OPTIONS.map((subject) => (
                        <label key={subject} className="flex items-center gap-2 text-sm text-navy">
                          <input
                            type="checkbox"
                            checked={draftMataKuliah.includes(subject)}
                            onChange={() => toggleDraftMataKuliah(subject)}
                            className="h-4 w-4 rounded border-soft-gray-dark text-purple focus:ring-purple/30"
                          />
                          {subject}
                        </label>
                      ))}
                    </div>
                  </div>
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
                    <p className="mt-1 text-sm font-semibold text-navy">{relation.kelompok.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Jumlah Project Aktif</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{relation.project.length}</p>
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
                    <p className="mt-1 text-sm font-semibold text-navy">{relation.kelompok[0] ?? "Belum ada kelompok"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Peran dalam Kelompok</p>
                    <p className="mt-1 text-sm font-semibold text-navy">
                      {user.memberRole === "ketua" ? "Ketua/Perwakilan" : user.memberRole === "anggota" ? "Anggota" : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">UMKM Mitra</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{relation.umkmName ?? "-"}</p>
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
                  <Input
                    label="Nomor Kontak"
                    id="edit-phone"
                    placeholder="08xxxxxxxxxx"
                    value={draftPhone}
                    onChange={(e) => setDraftPhone(e.target.value)}
                  />
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
                    <p className="text-xs text-muted">Nomor Kontak</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{user.phone ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Kelompok Pendamping</p>
                    <p className="mt-1 text-sm font-semibold text-navy">
                      {relation.kelompok[0] ?? "Belum ada kelompok"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Project Terhubung</p>
                    <p className="mt-1 text-sm font-semibold text-navy">{relation.project.join(", ") || "-"}</p>
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
            {noteError && <p className="mt-2 text-xs font-medium text-red-500">{noteError}</p>}
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
                  value={relation.kelas.join(", ") || "-"}
                  connected={relation.kelas.length > 0}
                />
                <RelationRow label="Mata Kuliah" value={user.mataKuliah?.join(", ") || "-"} connected={!!user.mataKuliah?.length} />
                <RelationRow
                  label="Kelompok Bimbingan"
                  value={`${relation.kelompok.length} kelompok`}
                  connected={relation.kelompok.length > 0}
                />
              </div>
            )}

            {user.role === "mahasiswa" && (
              <div className="flex flex-col divide-y divide-soft-gray-dark">
                <RelationRow label="Kelas" value={user.kelas ?? "-"} connected={!!user.kelas} />
                <RelationRow
                  label="Kelompok"
                  value={relation.kelompok[0] ?? "Belum ada kelompok"}
                  connected={relation.kelompok.length > 0}
                />
                <RelationRow
                  label="Peran Kelompok"
                  value={user.memberRole === "ketua" ? "Ketua/Perwakilan" : user.memberRole === "anggota" ? "Anggota" : "-"}
                  connected={relation.kelompok.length > 0}
                />
                <RelationRow label="UMKM Mitra" value={relation.umkmName ?? "-"} connected={!!relation.umkmName} />
              </div>
            )}

            {user.role === "umkm" && (
              <div className="flex flex-col divide-y divide-soft-gray-dark">
                <RelationRow
                  label="Kelas Terkait"
                  value={relation.kelas.join(", ") || "-"}
                  connected={relation.kelas.length > 0}
                />
                <RelationRow
                  label="Kelompok Pendamping"
                  value={relation.kelompok[0] ?? "-"}
                  connected={relation.kelompok.length > 0}
                />
                <RelationRow
                  label="Project Terkait"
                  value={relation.project.join(", ") || "-"}
                  connected={relation.project.length > 0}
                />
              </div>
            )}

            {(user.role === "dosen" || user.role === "mahasiswa" || user.role === "umkm") &&
              relation.kelas.length === 0 &&
              relation.kelompok.length === 0 &&
              relation.project.length === 0 && (
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
                    <p className="text-sm text-navy">{activity.aktivitas}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatActivityDateTime(activity.created_at)}</p>
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
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteModalOpen(true);
                }}
              >
                Hapus Pengguna
              </Button>
              <Button variant="outline" onClick={openRoleModal}>
                Ubah Role
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Hapus Pengguna"
      >
        <p className="text-sm text-muted">
          Akun ini beserta seluruh data terkait akan dihapus secara permanen dan tidak dapat dikembalikan.
        </p>
        {deleteError && <p className="mt-3 text-sm font-medium text-red-600">{deleteError}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={isDeleting}>
            Hapus Pengguna
          </Button>
        </div>
      </Modal>

      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title={resetStep === "confirm" ? "Reset password pengguna" : "Password berhasil diubah"}
      >
        {resetStep === "confirm" ? (
          <>
            <p className="text-sm text-muted">
              Masukkan password baru untuk {user.name}. Password lama tidak akan berfungsi lagi setelah ini.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <Input
                  label="Password Baru"
                  id="reset-new-password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={errorClass(!!(resetTouched && resetErrors.newPassword))}
                />
                {resetTouched && <FieldError message={resetErrors.newPassword ?? undefined} />}
              </div>
              <div>
                <Input
                  label="Konfirmasi Password Baru"
                  id="reset-confirm-password"
                  type="password"
                  placeholder="Ulangi password baru"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={errorClass(!!(resetTouched && resetErrors.confirmNewPassword))}
                />
                {resetTouched && <FieldError message={resetErrors.confirmNewPassword ?? undefined} />}
              </div>
            </div>
            {resetError && <p className="mt-3 text-sm font-medium text-red-600">{resetError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setResetModalOpen(false)} disabled={isResettingPassword}>
                Batal
              </Button>
              <Button variant="secondary" onClick={handleConfirmReset} disabled={isResettingPassword}>
                {isResettingPassword ? "Menyimpan..." : "Reset Password"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Password baru untuk {user.name} sudah aktif di sistem autentikasi. Sampaikan password tersebut ke
              pengguna secara langsung.
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
            onChange={(e) => {
              setPendingRole(e.target.value as UserRole);
              setRoleFieldErrors({});
            }}
          />
        </div>

        {pendingRole !== user.role && (
          <div className="mt-4 flex flex-col gap-4">
            {pendingRole === "dosen" && (
              <>
                <div>
                  <Input
                    label="NIP"
                    id="role-nip"
                    placeholder="Masukkan NIP"
                    value={roleNip}
                    onChange={(e) => setRoleNip(e.target.value)}
                    className={errorClass(!!roleFieldErrors.roleNip)}
                  />
                  <FieldError message={roleFieldErrors.roleNip} />
                </div>
                <Select
                  label="Program Studi / Fakultas"
                  id="role-fakultas"
                  options={STUDY_PROGRAMS.map((p) => ({ value: p, label: p }))}
                  value={roleFakultas}
                  onChange={(e) => setRoleFakultas(e.target.value)}
                />
              </>
            )}

            {pendingRole === "mahasiswa" && (
              <>
                <div>
                  <Input
                    label="NIM"
                    id="role-nim"
                    placeholder="Masukkan NIM"
                    value={roleNim}
                    onChange={(e) => setRoleNim(e.target.value)}
                    className={errorClass(!!roleFieldErrors.roleNim)}
                  />
                  <FieldError message={roleFieldErrors.roleNim} />
                </div>
                <div>
                  <Input
                    label="Angkatan"
                    id="role-angkatan"
                    type="number"
                    placeholder="Contoh: 2024"
                    value={roleAngkatan}
                    onChange={(e) => setRoleAngkatan(e.target.value)}
                    className={errorClass(!!roleFieldErrors.roleAngkatan)}
                  />
                  <FieldError message={roleFieldErrors.roleAngkatan} />
                </div>
                <Select
                  label="Program Studi"
                  id="role-prodi"
                  options={STUDY_PROGRAMS.map((p) => ({ value: p, label: p }))}
                  value={roleProdi}
                  onChange={(e) => setRoleProdi(e.target.value)}
                />
              </>
            )}

            {pendingRole === "umkm" && (
              <>
                <div>
                  <Input
                    label="Nama Usaha"
                    id="role-business-name"
                    placeholder="Masukkan nama usaha"
                    value={roleBusinessName}
                    onChange={(e) => setRoleBusinessName(e.target.value)}
                    className={errorClass(!!roleFieldErrors.roleBusinessName)}
                  />
                  <FieldError message={roleFieldErrors.roleBusinessName} />
                </div>
                <Select
                  label="Sektor Usaha"
                  id="role-business-sector"
                  options={BUSINESS_SECTOR_OPTIONS}
                  value={roleBusinessSector}
                  onChange={(e) => setRoleBusinessSector(e.target.value)}
                />
                <div>
                  <Input
                    label="Alamat"
                    id="role-business-address"
                    placeholder="Masukkan alamat usaha"
                    value={roleBusinessAddress}
                    onChange={(e) => setRoleBusinessAddress(e.target.value)}
                    className={errorClass(!!roleFieldErrors.roleBusinessAddress)}
                  />
                  <FieldError message={roleFieldErrors.roleBusinessAddress} />
                </div>
                <div>
                  <Input
                    label="Deskripsi Usaha"
                    id="role-business-description"
                    placeholder="Ceritakan singkat usaha ini"
                    value={roleBusinessDescription}
                    onChange={(e) => setRoleBusinessDescription(e.target.value)}
                    className={errorClass(!!roleFieldErrors.roleBusinessDescription)}
                  />
                  <FieldError message={roleFieldErrors.roleBusinessDescription} />
                </div>
              </>
            )}
          </div>
        )}

        {roleChangeError && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{roleChangeError}</p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setRoleModalOpen(false)} disabled={isChangingRole}>
            Batal
          </Button>
          <Button variant="secondary" onClick={handleConfirmRoleChange} disabled={isChangingRole}>
            {isChangingRole ? "Menyimpan..." : "Ubah Role"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
