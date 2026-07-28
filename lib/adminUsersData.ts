// Single shared source of truth for the Admin "Pengguna" feature (list,
// detail, and the add-user form). Deliberately a standalone localStorage-
// backed store rather than data/users.ts, because data/users.ts also backs
// lib/auth.ts's dummy per-role login (CURRENT_USER) and has known drift from
// the shared Dosen data (mismatched mahasiswa NIMs, missing "Bedjo Cleaner"
// UMKM) — changing it would risk breaking login and Admin Dashboard's
// already-working numbers. Names/NIMs/UMKM here intentionally mirror
// lib/dosenGroupsStorage.ts so the identities read as the same people across
// Dashboard, Dosen, Mahasiswa, and UMKM screens.
//
// Mirrors the ERD's profiles/dosen/mahasiswa/umkm split: `role` plus the
// role-specific optional fields below stand in for joining profiles with the
// dosen/mahasiswa/umkm detail tables. Follows the same
// load/save/seed-if-missing-or-corrupt localStorage pattern as
// dosenGroupsStorage.ts, so a user created via /admin/pengguna/tambah is
// still there after redirecting to /admin/pengguna/[id].

import type { GroupMemberRole } from "./dosenGroupsStorage";

export type UserRole = "admin" | "dosen" | "mahasiswa" | "umkm";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  createdBy?: string;

  // dosen
  nip?: string;
  jabatan?: string;
  prodi?: string;
  mataKuliah?: string[];

  // mahasiswa
  nim?: string;
  angkatan?: number;
  kelas?: string;
  groupId?: string;
  groupName?: string;
  memberRole?: GroupMemberRole;

  // umkm
  businessName?: string;
  businessSector?: string;
  businessAddress?: string;
  businessDescription?: string;
  phone?: string;

  /** Admin-only internal note (not shown to the account owner). */
  adminNote?: string;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  dosen: "Dosen",
  mahasiswa: "Mahasiswa",
  umkm: "UMKM Mitra",
};

export const ROLE_BADGE_VARIANT: Record<UserRole, "navy" | "purple" | "orange" | "pink"> = {
  admin: "navy",
  dosen: "purple",
  mahasiswa: "orange",
  umkm: "pink",
};

/** Role-specific identity shown in the table's "Identitas" column and detail page. */
export function getUserIdentity(user: AdminUser): string {
  switch (user.role) {
    case "admin":
      return "Administrator";
    case "dosen":
      return user.nip ? `NIP: ${user.nip}` : "-";
    case "mahasiswa":
      return user.nim ? `NIM: ${user.nim}` : "-";
    case "umkm":
      return user.businessName ?? "-";
  }
}

export const defaultAdminUsers: AdminUser[] = [
  {
    id: "u-admin-1",
    name: "Siti Aminah",
    email: "admin@cedpreneur.id",
    role: "admin",
    isActive: true,
    createdAt: "2026-01-10",
  },
  {
    id: "u-dosen-1",
    name: "Ridwan",
    email: "ridwan@cedpreneur.ac.id",
    role: "dosen",
    isActive: true,
    createdAt: "2026-01-10",
    createdBy: "Siti Aminah",
    nip: "198005152005011002",
    jabatan: "Dosen Pembimbing",
    prodi: "Teknologi Rekayasa Multimedia",
    mataKuliah: ["Praktik Kewirausahaan"],
  },
  {
    id: "u-dosen-2",
    name: "Dr. Rina Marlina",
    email: "rina.marlina@cedpreneur.ac.id",
    role: "dosen",
    isActive: true,
    createdAt: "2026-01-10",
    createdBy: "Siti Aminah",
    nip: "197911032004012001",
    jabatan: "Dosen Pembimbing",
    prodi: "Desain Grafis",
    mataKuliah: ["Praktik Kewirausahaan"],
  },
  {
    id: "u-mhs-1",
    name: "Dealova",
    email: "dealova@student.cedpreneur.ac.id",
    role: "mahasiswa",
    isActive: true,
    createdAt: "2026-01-12",
    createdBy: "Siti Aminah",
    nim: "2490343119",
    angkatan: 2024,
    prodi: "Teknologi Rekayasa Multimedia",
    kelas: "RJ24D",
    groupId: "kelompok-1",
    groupName: "Kelompok 1",
    memberRole: "anggota",
  },
  {
    id: "u-mhs-2",
    name: "Farhan",
    email: "farhan@student.cedpreneur.ac.id",
    role: "mahasiswa",
    isActive: true,
    createdAt: "2026-01-12",
    createdBy: "Siti Aminah",
    nim: "2490343122",
    angkatan: 2024,
    prodi: "Teknologi Rekayasa Multimedia",
    kelas: "RJ24D",
    groupId: "kelompok-2",
    groupName: "Kelompok 2",
    memberRole: "ketua",
  },
  {
    id: "u-mhs-3",
    name: "Rizky",
    email: "rizky@student.cedpreneur.ac.id",
    role: "mahasiswa",
    isActive: true,
    createdAt: "2026-01-12",
    createdBy: "Siti Aminah",
    nim: "2490343132",
    angkatan: 2024,
    prodi: "Desain Grafis",
    kelas: "RJ24A",
    groupId: "kelompok-3",
    groupName: "Kelompok 3",
    memberRole: "anggota",
  },
  {
    id: "u-umkm-1",
    name: "Warung Teras Hijau",
    email: "info@warungterashijau.id",
    role: "umkm",
    isActive: true,
    createdAt: "2026-01-15",
    createdBy: "Siti Aminah",
    businessName: "Warung Teras Hijau",
    businessSector: "Food and Beverage",
    businessAddress: "Srengseng Sawah",
  },
  {
    id: "u-umkm-2",
    name: "Bedjo Cleaner",
    email: "info@bedjocleaner.id",
    role: "umkm",
    isActive: true,
    createdAt: "2026-01-15",
    createdBy: "Siti Aminah",
    businessName: "Bedjo Cleaner",
    businessSector: "Jasa",
    businessAddress: "Jakarta Selatan",
  },
  {
    id: "u-umkm-3",
    name: "Hendra Wijaya",
    email: "hendra@batikjaya.id",
    role: "umkm",
    isActive: true,
    createdAt: "2026-01-15",
    createdBy: "Siti Aminah",
    businessName: "Batik Jaya",
    businessSector: "Fashion",
    businessAddress: "Depok",
  },
];

export const STORAGE_KEY = "cedupreneur_admin_users";

function isAdminUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    (user.role === "admin" || user.role === "dosen" || user.role === "mahasiswa" || user.role === "umkm") &&
    typeof user.isActive === "boolean" &&
    typeof user.createdAt === "string"
  );
}

/**
 * Reads users from localStorage, seeding `defaultAdminUsers` the first time
 * (key missing) or if the stored value is corrupt/empty. Once real data
 * exists it's used as-is and never silently replaced back with the seed.
 */
export function loadAdminUsers(): AdminUser[] {
  if (typeof window === "undefined") return defaultAdminUsers;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    saveAdminUsers(defaultAdminUsers);
    return defaultAdminUsers;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isAdminUser)) {
      saveAdminUsers(defaultAdminUsers);
      return defaultAdminUsers;
    }
    return parsed;
  } catch {
    saveAdminUsers(defaultAdminUsers);
    return defaultAdminUsers;
  }
}

export function saveAdminUsers(users: AdminUser[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch {
    // localStorage unavailable (private mode / quota) — dummy feature, fail silently.
  }
}

export function createUserId(role: UserRole, existing: AdminUser[]) {
  const prefix = { admin: "u-admin", dosen: "u-dosen", mahasiswa: "u-mhs", umkm: "u-umkm" }[role];
  const existingIds = new Set(existing.map((user) => user.id));
  let n = existing.filter((user) => user.role === role).length + 1;
  let candidate = `${prefix}-${n}`;
  while (existingIds.has(candidate)) {
    n += 1;
    candidate = `${prefix}-${n}`;
  }
  return candidate;
}

export function isEmailTaken(email: string, users: AdminUser[], excludeId?: string) {
  const normalized = email.trim().toLowerCase();
  return users.some((user) => user.id !== excludeId && user.email.trim().toLowerCase() === normalized);
}

export function isNipTaken(nip: string, users: AdminUser[], excludeId?: string) {
  const normalized = nip.trim();
  return users.some((user) => user.id !== excludeId && user.role === "dosen" && user.nip?.trim() === normalized);
}

export function isNimTaken(nim: string, users: AdminUser[], excludeId?: string) {
  const normalized = nim.trim();
  return users.some((user) => user.id !== excludeId && user.role === "mahasiswa" && user.nim?.trim() === normalized);
}
