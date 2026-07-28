// Shared source of truth for Admin "Relasi Kelas": binds a Data Master Kelas
// (lib/adminMasterData.ts) to one active UMKM mitra (ERD's kelas_umkm) and a
// set of mahasiswa (ERD has no kelas_mahasiswa table yet — see
// ClassStudentRelation below). Same localStorage load/save/seed pattern as
// the other lib/*Storage.ts files in this app.
//
// A "relasi kelas" is NOT a duplicate copy of kelas/dosen/UMKM/mahasiswa
// identity — ClassRelation only stores the *assignment* (which UMKM, by
// whom, when, with what note/status). Dosen stays on Kelas.dosenId in
// lib/adminMasterData.ts (Relasi Kelas edits it there via useKelas().updateKelas
// so Data Master and Relasi Kelas never disagree about who teaches a kelas).
//
// TODO backend: add a kelas_mahasiswa join table so ClassStudentRelation can
// become a normal relational table instead of a frontend-only array.
//
// Known duplication caveat (frontend-prototype limitation, not fixable this
// task without touching Data Master, which is out of scope here): Data
// Master's Kelas.studentIds is already a simple kelas<->mahasiswa link. This
// file's ClassStudentRelation is a richer, independently-editable view over
// the same relationship (per-student status + joinedAt), seeded in sync with
// Kelas.studentIds but not live-synced afterward. A real backend join table
// would collapse these into one.

import type { Kelas } from "./adminMasterData";
import { defaultKelas } from "./adminMasterData";

export type RelationStatus = "aktif" | "tidak_aktif";

// ---------------------------------------------------------------------------
// ClassRelation (kelas_umkm)
// ---------------------------------------------------------------------------

export interface ClassRelation {
  id: string;
  classId: string;
  /** UmkmMaster id — one active UMKM per kelas per current MVP decision (section H). */
  umkmId: string;
  /** ditugaskan_oleh — admin name. */
  assignedBy?: string;
  catatan?: string;
  status: RelationStatus;
  createdAt: string;
  updatedAt: string;
}

export const CLASS_RELATION_STORAGE_KEY = "cedupreneur_class_relations";

export const defaultClassRelations: ClassRelation[] = [
  {
    id: "relasi-kelas-rj24d",
    classId: "kelas-rj24d",
    umkmId: "umkm-warung-teras-hijau",
    assignedBy: "Siti Aminah",
    catatan: "",
    status: "aktif",
    createdAt: "2026-01-04",
    updatedAt: "2026-01-04",
  },
  {
    id: "relasi-kelas-rj24a",
    classId: "kelas-rj24a",
    umkmId: "umkm-batik-jaya",
    assignedBy: "Siti Aminah",
    catatan: "",
    status: "aktif",
    createdAt: "2026-01-04",
    updatedAt: "2026-01-04",
  },
];

function isClassRelation(value: unknown): value is ClassRelation {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.classId === "string" &&
    typeof r.umkmId === "string" &&
    (r.status === "aktif" || r.status === "tidak_aktif") &&
    typeof r.createdAt === "string" &&
    typeof r.updatedAt === "string"
  );
}

export function loadClassRelations(): ClassRelation[] {
  if (typeof window === "undefined") return defaultClassRelations;
  const saved = window.localStorage.getItem(CLASS_RELATION_STORAGE_KEY);
  if (!saved) {
    saveClassRelations(defaultClassRelations);
    return defaultClassRelations;
  }
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isClassRelation)) {
      saveClassRelations(defaultClassRelations);
      return defaultClassRelations;
    }
    return parsed;
  } catch {
    saveClassRelations(defaultClassRelations);
    return defaultClassRelations;
  }
}

export function saveClassRelations(items: ClassRelation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLASS_RELATION_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable — dummy feature, fail silently.
  }
}

export function createClassRelationId(classId: string, existing: ClassRelation[]) {
  const base = `relasi-${classId}`;
  const existingIds = new Set(existing.map((r) => r.id));
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function getClassRelationByClassId(classId: string, relations: ClassRelation[]) {
  return relations.find((r) => r.classId === classId);
}

export function hasActiveRelation(classId: string, relations: ClassRelation[]) {
  return relations.some((r) => r.classId === classId && r.status === "aktif");
}

// ---------------------------------------------------------------------------
// ClassStudentRelation (frontend stand-in for kelas_mahasiswa — see TODO above)
// ---------------------------------------------------------------------------

export interface ClassStudentRelation {
  id: string;
  classId: string;
  /** AdminUser id (role "mahasiswa"). */
  studentId: string;
  status: "active" | "inactive";
  joinedAt: string;
}

export const CLASS_STUDENT_RELATION_STORAGE_KEY = "cedupreneur_class_student_relations";

function buildDefaultClassStudentRelations(kelasSeed: Kelas[]): ClassStudentRelation[] {
  return kelasSeed.flatMap((kelas) =>
    kelas.studentIds.map((studentId) => ({
      id: `${kelas.id}-${studentId}`,
      classId: kelas.id,
      studentId,
      status: "active" as const,
      joinedAt: kelas.createdAt,
    }))
  );
}

export const defaultClassStudentRelations: ClassStudentRelation[] = buildDefaultClassStudentRelations(defaultKelas);

function isClassStudentRelation(value: unknown): value is ClassStudentRelation {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.classId === "string" &&
    typeof r.studentId === "string" &&
    (r.status === "active" || r.status === "inactive") &&
    typeof r.joinedAt === "string"
  );
}

export function loadClassStudentRelations(): ClassStudentRelation[] {
  if (typeof window === "undefined") return defaultClassStudentRelations;
  const saved = window.localStorage.getItem(CLASS_STUDENT_RELATION_STORAGE_KEY);
  if (!saved) {
    saveClassStudentRelations(defaultClassStudentRelations);
    return defaultClassStudentRelations;
  }
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isClassStudentRelation)) {
      saveClassStudentRelations(defaultClassStudentRelations);
      return defaultClassStudentRelations;
    }
    return parsed;
  } catch {
    saveClassStudentRelations(defaultClassStudentRelations);
    return defaultClassStudentRelations;
  }
}

export function saveClassStudentRelations(items: ClassStudentRelation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLASS_STUDENT_RELATION_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable — dummy feature, fail silently.
  }
}

export function getActiveStudentIdsForClass(classId: string, relations: ClassStudentRelation[]) {
  return relations.filter((r) => r.classId === classId && r.status === "active").map((r) => r.studentId);
}

/**
 * MVP conflict rule (section I): a mahasiswa can only be actively enrolled in
 * one kelas per mata-kuliah+tahun-ajaran context at a time. Returns the
 * conflicting kelas's nama if the student is already active elsewhere within
 * the same mataKuliahId+tahunAjaran, excluding the target kelas itself.
 */
export function findConflictingClassName(
  studentId: string,
  targetKelas: Kelas,
  allKelas: Kelas[],
  relations: ClassStudentRelation[]
): string | null {
  const conflict = relations.find((r) => {
    if (r.studentId !== studentId || r.status !== "active" || r.classId === targetKelas.id) return false;
    const otherKelas = allKelas.find((k) => k.id === r.classId);
    if (!otherKelas) return false;
    return otherKelas.mataKuliahId === targetKelas.mataKuliahId && otherKelas.tahunAjaran === targetKelas.tahunAjaran;
  });
  if (!conflict) return null;
  return allKelas.find((k) => k.id === conflict.classId)?.nama ?? null;
}

// ---------------------------------------------------------------------------
// Activity log (ERD-compatible shape: userId, aksi, detail, createdAt)
// ---------------------------------------------------------------------------

export interface RelationActivityLog {
  id: string;
  userId: string;
  aksi: string;
  detail: string;
  createdAt: string;
}

export const RELATION_ACTIVITY_STORAGE_KEY = "cedupreneur_class_relation_activity";

export function loadRelationActivityLog(): RelationActivityLog[] {
  if (typeof window === "undefined") return [];
  const saved = window.localStorage.getItem(RELATION_ACTIVITY_STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRelationActivityLog(items: RelationActivityLog[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RELATION_ACTIVITY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable — dummy feature, fail silently.
  }
}

export function appendRelationActivity(userId: string, aksi: string, detail: string) {
  const next: RelationActivityLog = {
    id: `relasi-log-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    userId,
    aksi,
    detail,
    createdAt: new Date().toISOString(),
  };
  const existing = loadRelationActivityLog();
  saveRelationActivityLog([next, ...existing]);
  return next;
}
