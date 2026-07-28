// Shared storage for UMKM's mentoring feedback (feedback.pemberi_role = "umkm",
// feedback.jenis = "validasi_umkm" per the ERD). Every submission is kept — new
// feedback on the same report is appended as a new entry, never overwriting an
// older one, so the full validation history survives.
//
// Frontend persistence adapter. Replace with a Supabase repository during backend integration.

export type LaporanValidasiStatus = "tuntas" | "belum_tuntas";

export interface UmkmFeedback {
  id: string;
  /** ProgressReport.id (lib/dosenProgressReportsStorage.ts). */
  laporanId: string;
  /** SupervisedGroup.id — lets Admin/Mahasiswa filter feedback by group without re-deriving it from laporanId. */
  groupId: string;
  /** ProjectMilestone.id (MENTORING_MILESTONES). */
  milestoneId: string;
  /** Active UMKM AdminUser.id — the account that actually gave this feedback. */
  pemberiId: string;
  pemberiRole: "umkm";
  jenis: "validasi_umkm";
  pemberiNama: string;
  isiFeedback: string;
  statusValidasi: LaporanValidasiStatus;
  createdAt: string;
  updatedAt: string;
  /** Starts at 1, increments per report each time the UMKM gives another round of feedback. */
  revisionNumber?: number;
}

const COLLECTION_KEY = "cedupreneur_umkm_feedbacks_v2";
/** Pre-history storage: one singleton entry per report at cedupreneur_umkm_feedback_<reportId>. Migrated in, then left alone. */
const LEGACY_KEY_PREFIX = "cedupreneur_umkm_feedback_";
const LEGACY_MIGRATION_FLAG_KEY = "cedupreneur_umkm_feedback_migration_v2_done";

function isUmkmFeedback(value: unknown): value is UmkmFeedback {
  if (!value || typeof value !== "object") return false;
  const feedback = value as Record<string, unknown>;
  return (
    typeof feedback.id === "string" &&
    typeof feedback.laporanId === "string" &&
    typeof feedback.groupId === "string" &&
    typeof feedback.milestoneId === "string" &&
    typeof feedback.pemberiId === "string" &&
    feedback.pemberiRole === "umkm" &&
    feedback.jenis === "validasi_umkm" &&
    typeof feedback.pemberiNama === "string" &&
    typeof feedback.isiFeedback === "string" &&
    (feedback.statusValidasi === "tuntas" || feedback.statusValidasi === "belum_tuntas") &&
    typeof feedback.createdAt === "string" &&
    typeof feedback.updatedAt === "string"
  );
}

function readCollectionRaw(): UmkmFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COLLECTION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isUmkmFeedback) : [];
  } catch {
    return [];
  }
}

function writeCollectionRaw(feedbacks: UmkmFeedback[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(feedbacks));
  } catch {
    // localStorage unavailable (private mode / quota) — dummy feature, fail silently.
  }
}

/**
 * One-time, idempotent migration of the old singleton-per-report keys into the
 * versioned collection: never duplicates an already-migrated entry, skips a
 * corrupt legacy entry instead of crashing, and only runs once per browser
 * (guarded by LEGACY_MIGRATION_FLAG_KEY). Legacy keys are left in place.
 */
function migrateLegacyFeedbackOnce(collection: UmkmFeedback[]): UmkmFeedback[] {
  if (typeof window === "undefined") return collection;
  if (window.localStorage.getItem(LEGACY_MIGRATION_FLAG_KEY) === "1") return collection;

  const existingIds = new Set(collection.map((feedback) => feedback.id));
  const migrated = [...collection];
  let changed = false;

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(LEGACY_KEY_PREFIX) || key === COLLECTION_KEY) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!isUmkmFeedback(parsed) || existingIds.has(parsed.id)) continue;
      migrated.push(parsed);
      existingIds.add(parsed.id);
      changed = true;
    } catch {
      // corrupt legacy entry — skip it, never crash the migration.
    }
  }

  if (changed) writeCollectionRaw(migrated);
  window.localStorage.setItem(LEGACY_MIGRATION_FLAG_KEY, "1");
  return migrated;
}

export function readAllUmkmFeedback(): UmkmFeedback[] {
  if (typeof window === "undefined") return [];
  return migrateLegacyFeedbackOnce(readCollectionRaw());
}

/** All feedback ever given for one report, newest first. */
export function getUmkmFeedbackByReport(reportId: string): UmkmFeedback[] {
  return readAllUmkmFeedback()
    .filter((feedback) => feedback.laporanId === reportId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getLatestUmkmFeedbackByReport(reportId: string): UmkmFeedback | null {
  return getUmkmFeedbackByReport(reportId)[0] ?? null;
}

/** All feedback ever given across a group's reports, newest first. */
export function getUmkmFeedbackByGroup(groupId: string): UmkmFeedback[] {
  return readAllUmkmFeedback()
    .filter((feedback) => feedback.groupId === groupId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getUmkmFeedbackByMilestone(groupId: string, milestoneId: string): UmkmFeedback[] {
  return readAllUmkmFeedback()
    .filter((feedback) => feedback.groupId === groupId && feedback.milestoneId === milestoneId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createUmkmFeedbackId(laporanId: string) {
  return `feedback-${laporanId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface AddUmkmFeedbackInput {
  laporanId: string;
  groupId: string;
  milestoneId: string;
  pemberiId: string;
  pemberiNama: string;
  isiFeedback: string;
  statusValidasi: LaporanValidasiStatus;
}

/** Always appends a new entry — never overwrites a previous submission on the same report. */
export function addUmkmFeedback(input: AddUmkmFeedbackInput): UmkmFeedback {
  const collection = readAllUmkmFeedback();
  const now = new Date().toISOString();
  const previousCount = collection.filter((feedback) => feedback.laporanId === input.laporanId).length;

  const feedback: UmkmFeedback = {
    id: createUmkmFeedbackId(input.laporanId),
    laporanId: input.laporanId,
    groupId: input.groupId,
    milestoneId: input.milestoneId,
    pemberiId: input.pemberiId,
    pemberiRole: "umkm",
    jenis: "validasi_umkm",
    pemberiNama: input.pemberiNama,
    isiFeedback: input.isiFeedback,
    statusValidasi: input.statusValidasi,
    createdAt: now,
    updatedAt: now,
    revisionNumber: previousCount + 1,
  };

  writeCollectionRaw([...collection, feedback]);
  return feedback;
}

/** Edits an existing entry in place (content/status only) — for the rare case a UMKM needs to correct a typo, not the normal "give more feedback" flow. */
export function updateUmkmFeedback(
  id: string,
  patch: Partial<Pick<UmkmFeedback, "isiFeedback" | "statusValidasi">>
): UmkmFeedback | null {
  const collection = readAllUmkmFeedback();
  let updated: UmkmFeedback | null = null;

  const next = collection.map((feedback) => {
    if (feedback.id !== id) return feedback;
    updated = { ...feedback, ...patch, updatedAt: new Date().toISOString() };
    return updated;
  });

  if (updated) writeCollectionRaw(next);
  return updated;
}

export function formatFeedbackTimestamp(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
