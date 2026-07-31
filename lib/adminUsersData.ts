// Shared types + pure helpers for the Admin "Pengguna" feature. The
// localStorage-backed dummy user store this file used to hold has been
// retired — lib/useAdminUsers.ts is fully Supabase-backed now — but the
// AdminUser shape, role labels, identity formatting, and client-side
// duplicate-check helpers below are still real logic reused against the
// live `users` list from that hook.

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
