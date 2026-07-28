// Single shared source of truth for Dosen's kelompok bimbingan, used by
// /dosen/project, /dosen/project/kelompok, /dosen/project/kelompok/[id], and
// /dosen/project/tambah-kelompok. Backend/Supabase isn't wired up yet, so
// groups live in localStorage under one key, seeded from defaultGroups the
// first time (or if the stored value is missing/corrupt) — never overwritten
// just because the dosen deleted their way down to fewer groups.

export type SupervisedGroupStatus = "progress" | "done";

export interface SupervisedGroupMember {
  id: string;
  nim: string;
  name: string;
}

export interface SupervisedGroup {
  id: string;
  /** Full display code, e.g. "TRM - RJ24D | KELOMPOK 1". */
  code: string;
  name: string;
  studyProgram: string;
  className: string;
  umkmId: string;
  umkmName: string;
  lecturerName: string;
  members: SupervisedGroupMember[];
  note: string;
  /** ISO date or datetime. */
  createdAt: string;
  period: string;
  /** laporan_progress.persentase_progress, 0-100. */
  progressPercentage: number;
  currentStage: string;
  status: SupervisedGroupStatus;
}

export const STUDY_PROGRAMS = ["Teknologi Rekayasa Multimedia", "Desain Grafis", "Seni Kuliner"] as const;

export const CLASSES_BY_STUDY_PROGRAM: Record<string, string[]> = {
  "Teknologi Rekayasa Multimedia": ["RJ24A", "RJ24B", "RJ24C", "RJ24D"],
  "Desain Grafis": ["DG24A", "DG24B"],
  "Seni Kuliner": ["SK24A", "SK24B"],
};

export const STUDY_PROGRAM_ABBREVIATIONS: Record<string, string> = {
  "Teknologi Rekayasa Multimedia": "TRM",
  "Desain Grafis": "DG",
  "Seni Kuliner": "SK",
};

export function buildGroupCode(studyProgram: string, className: string, name: string) {
  const abbreviation = STUDY_PROGRAM_ABBREVIATIONS[studyProgram] ?? studyProgram;
  return `${abbreviation} - ${className} | ${name.toUpperCase()}`;
}

export interface UmkmOption {
  id: string;
  name: string;
  address: string;
}

export const UMKM_OPTIONS: UmkmOption[] = [
  { id: "umkm-warung-teras-hijau", name: "Warung Teras Hijau", address: "Srengseng Sawah" },
  { id: "umkm-bedjo-cleaner", name: "Bedjo Cleaner", address: "Jakarta Selatan" },
  { id: "umkm-batik-jaya", name: "Batik Jaya", address: "Depok" },
  { id: "umkm-kopi-nusantara", name: "Kopi Nusantara", address: "Bandung" },
];

export interface StudentOption {
  id: string;
  nim: string;
  name: string;
  studyProgram: string;
  className: string;
}

export const STUDENTS: StudentOption[] = [
  {
    id: "mhs-1",
    nim: "2490343118",
    name: "Putri Candra Arini",
    studyProgram: "Teknologi Rekayasa Multimedia",
    className: "RJ24D",
  },
  {
    id: "mhs-2",
    nim: "2490343119",
    name: "Dealova",
    studyProgram: "Teknologi Rekayasa Multimedia",
    className: "RJ24D",
  },
  {
    id: "mhs-3",
    nim: "2490343120",
    name: "Irshad",
    studyProgram: "Teknologi Rekayasa Multimedia",
    className: "RJ24D",
  },
  {
    id: "mhs-4",
    nim: "2490343121",
    name: "Ariq",
    studyProgram: "Teknologi Rekayasa Multimedia",
    className: "RJ24D",
  },
  {
    id: "mhs-5",
    nim: "2490343122",
    name: "Farhan",
    studyProgram: "Teknologi Rekayasa Multimedia",
    className: "RJ24D",
  },
  {
    id: "mhs-6",
    nim: "2490343123",
    name: "Sinta Rahayu",
    studyProgram: "Teknologi Rekayasa Multimedia",
    className: "RJ24D",
  },
];

export const STORAGE_KEY = "cedupreneur_dosen_supervised_groups";

export const defaultGroups: SupervisedGroup[] = [
  {
    id: "kelompok-1",
    code: "TRM - RJ24D | KELOMPOK 1",
    name: "Kelompok 1",
    studyProgram: "Teknologi Rekayasa Multimedia",
    className: "RJ24D",
    umkmId: "umkm-warung-teras-hijau",
    umkmName: "Warung Teras Hijau",
    lecturerName: "Ridwan",
    members: [
      { id: "mhs-1", nim: "2490343118", name: "Putri Candra Arini" },
      { id: "mhs-2", nim: "2490343119", name: "Dealova" },
      { id: "mhs-3", nim: "2490343120", name: "Irshad" },
      { id: "mhs-4", nim: "2490343121", name: "Ariq" },
    ],
    note: "",
    createdAt: "2026-01-04",
    period: "4 Januari - 4 Juli 2026",
    progressPercentage: 68,
    currentStage: "Brand Guideline",
    status: "progress",
  },
  {
    id: "kelompok-2",
    code: "TRM - RJ24D | KELOMPOK 2",
    name: "Kelompok 2",
    studyProgram: "Teknologi Rekayasa Multimedia",
    className: "RJ24D",
    umkmId: "umkm-bedjo-cleaner",
    umkmName: "Bedjo Cleaner",
    lecturerName: "Ridwan",
    members: [
      { id: "mhs-5", nim: "2490343122", name: "Farhan" },
      { id: "mhs-6", nim: "2490343123", name: "Sinta Rahayu" },
      { id: "mhs-7", nim: "2490343124", name: "Nadia" },
    ],
    note: "",
    createdAt: "2026-01-04",
    period: "4 Januari - 4 Juli 2026",
    progressPercentage: 56,
    currentStage: "Brand Guideline",
    status: "progress",
  },
  {
    id: "kelompok-3",
    code: "DG - RJ24A | KELOMPOK 3",
    name: "Kelompok 3",
    studyProgram: "Desain Grafis",
    className: "RJ24A",
    umkmId: "umkm-batik-jaya",
    umkmName: "Batik Jaya",
    lecturerName: "Ridwan",
    members: [
      { id: "mhs-8", nim: "2490343131", name: "Alya" },
      { id: "mhs-9", nim: "2490343132", name: "Rizky" },
    ],
    note: "",
    createdAt: "2026-01-04",
    period: "4 Januari - 4 Juli 2026",
    progressPercentage: 82,
    currentStage: "Content Planner",
    status: "progress",
  },
];

function isSupervisedGroupMember(value: unknown): value is SupervisedGroupMember {
  if (!value || typeof value !== "object") return false;
  const member = value as Record<string, unknown>;
  return typeof member.id === "string" && typeof member.nim === "string" && typeof member.name === "string";
}

function isSupervisedGroup(value: unknown): value is SupervisedGroup {
  if (!value || typeof value !== "object") return false;
  const group = value as Record<string, unknown>;
  return (
    typeof group.id === "string" &&
    typeof group.code === "string" &&
    typeof group.name === "string" &&
    typeof group.studyProgram === "string" &&
    typeof group.className === "string" &&
    typeof group.umkmId === "string" &&
    typeof group.umkmName === "string" &&
    typeof group.lecturerName === "string" &&
    Array.isArray(group.members) &&
    group.members.every(isSupervisedGroupMember) &&
    typeof group.note === "string" &&
    typeof group.createdAt === "string" &&
    typeof group.period === "string" &&
    typeof group.progressPercentage === "number" &&
    typeof group.currentStage === "string" &&
    (group.status === "progress" || group.status === "done")
  );
}

/**
 * Reads groups from localStorage, seeding `defaultGroups` the first time (key
 * missing) or if the stored value is corrupt/empty. Once real data exists —
 * even an intentionally-shorter array after a delete — it's used as-is and
 * never silently replaced back with the seed.
 */
export function loadGroups(): SupervisedGroup[] {
  if (typeof window === "undefined") return defaultGroups;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    saveGroups(defaultGroups);
    return defaultGroups;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isSupervisedGroup)) {
      saveGroups(defaultGroups);
      return defaultGroups;
    }
    return parsed;
  } catch {
    saveGroups(defaultGroups);
    return defaultGroups;
  }
}

export function saveGroups(groups: SupervisedGroup[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // localStorage unavailable (private mode / quota) — dummy feature, fail silently.
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createGroupId(name: string, existing: SupervisedGroup[]) {
  const base = slugify(name) || "kelompok";
  const existingIds = new Set(existing.map((group) => group.id));
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// Group membership role (maps to the future kelompok_anggota.peran_anggota
// column). Not wired into any Dosen/Mahasiswa page yet — this is the
// frontend model + helper the Admin "Tambah Pengguna" form uses to record a
// new mahasiswa's role within a kelompok, ready to be connected to real
// per-group membership pages later.
// ---------------------------------------------------------------------------

export type GroupMemberRole = "ketua" | "anggota";

export interface GroupMember {
  id: string;
  groupId: string;
  studentId: string;
  memberRole: GroupMemberRole;
  joinedAt: string;
}

export function buildGroupMemberId(groupId: string, studentId: string) {
  return `${groupId}-${studentId}`;
}

/** Derived from defaultGroups: each group's first member is "ketua", the rest are "anggota". */
export const defaultGroupMembers: GroupMember[] = defaultGroups.flatMap((group) =>
  group.members.map((member, index) => ({
    id: buildGroupMemberId(group.id, member.id),
    groupId: group.id,
    studentId: member.id,
    memberRole: index === 0 ? "ketua" : "anggota",
    joinedAt: group.createdAt,
  }))
);

/**
 * MVP permission rule: only a group's "ketua/perwakilan" can upload progress
 * reports/revisions. Everyone else in the group can view but not upload.
 */
export function canUploadGroupReport(userId: string, groupMembers: GroupMember[]) {
  const membership = groupMembers.find((member) => member.studentId === userId);
  return membership?.memberRole === "ketua";
}
