// Temporary frontend-only demo session.
// Replace with real authentication when backend is connected.
//
// Tracks which dummy account is "logged in" per role, so pages stop
// hardcoding a single mahasiswa/UMKM (e.g. always Dealova / Warung Teras
// Hijau) and instead look up the active AdminUser (lib/adminUsersData.ts —
// already the shared identity store used by Admin) plus their real
// kelompok via lib/dosenGroupsStorage.ts. No new user/identity store is
// created here — this only remembers *which* existing record is active.

import type { Role } from "@/types";
import { loadAdminUsers, type AdminUser } from "./adminUsersData";
import type { SupervisedGroup } from "./dosenGroupsStorage";

export interface DemoSession {
  role: Role;
  userId: string;
}

const STORAGE_KEY = "cedupreneur_demo_session";

/** Default account per role when no session has been set yet (e.g. direct navigation without going through /login first). */
const DEFAULT_USER_ID_BY_ROLE: Record<Role, string> = {
  admin: "u-admin-1",
  dosen: "u-dosen-1",
  mahasiswa: "u-mhs-1",
  umkm: "u-umkm-1",
};

export function setDemoSession(role: Role, userId: string) {
  if (typeof window === "undefined") return;
  try {
    const session: DemoSession = { role, userId };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // localStorage unavailable — dummy feature, fail silently.
  }
}

function isDemoSession(value: unknown): value is DemoSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return (
    (session.role === "admin" || session.role === "dosen" || session.role === "mahasiswa" || session.role === "umkm") &&
    typeof session.userId === "string"
  );
}

export function getDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isDemoSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the active AdminUser for a given role: the session's user if it
 * matches that role, else the role's default demo account. Always returns a
 * real record from the shared users store (or null only if that store is
 * somehow empty/uninitialized).
 */
export function getCurrentDemoUser(role: Role): AdminUser | null {
  const users = loadAdminUsers();
  const session = getDemoSession();
  const targetId = session && session.role === role ? session.userId : DEFAULT_USER_ID_BY_ROLE[role];
  return users.find((user) => user.id === targetId) ?? users.find((user) => user.role === role) ?? null;
}

/** The mahasiswa's own kelompok, matched by NIM (AdminUser and SupervisedGroupMember use different id schemes, NIM is the reliable join key). */
export function getActiveMahasiswaGroup(
  user: AdminUser,
  groups: SupervisedGroup[]
): SupervisedGroup | undefined {
  if (!user.nim) return undefined;
  return groups.find((group) => group.members.some((member) => member.nim === user.nim));
}

/** All kelompok connected to this UMKM, matched by business name (the join key already used across Admin pages). */
export function getActiveUmkmGroups(user: AdminUser, groups: SupervisedGroup[]): SupervisedGroup[] {
  if (!user.businessName) return [];
  return groups.filter((group) => group.umkmName === user.businessName);
}
