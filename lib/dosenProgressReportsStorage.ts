// Shared source of truth for laporan_progress dummy data, used by the Dosen
// Mentoring pages and (read/write) Mahasiswa's history/upload pages.
// Backend/Supabase isn't wired up yet, so reports live in localStorage,
// seeded from defaultProgressReports the first time — never reset just
// because a dosen/mahasiswa action changed statuses. Legacy status values
// from earlier iterations of this feature ("reviewed", "revision") are
// migrated in place the first time they're read (see migrateStatus below).

import { initializeFeedbacks, getLatestFeedback } from "./dosenFeedbackStorage";

export type ReportStatus = "not_submitted" | "submitted" | "revision_required" | "approved";

export interface ProgressReport {
  id: string;
  groupId: string;
  milestoneId: string;
  milestoneTitle: string;
  fileName: string;
  fileType: string;
  submittedBy: string;
  /** ISO datetime. */
  submittedAt: string;
  comment: string;
  status: ReportStatus;
  /** Starts at 1, incremented each time the mahasiswa sends a revision. */
  revisionNumber?: number;
}

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  not_submitted: "Belum Dikirim",
  submitted: "Menunggu Feedback",
  revision_required: "Belum Tuntas",
  approved: "Tuntas",
};

export const REPORT_STATUS_BADGE_VARIANT: Record<ReportStatus, "gray" | "orange" | "pink" | "green"> = {
  not_submitted: "gray",
  submitted: "orange",
  revision_required: "pink",
  approved: "green",
};

export const STORAGE_KEY = "cedupreneur_progress_reports";

export const defaultProgressReports: ProgressReport[] = [
  {
    id: "report-k1-profile",
    groupId: "kelompok-1",
    milestoneId: "profil-umkm",
    milestoneTitle: "Profil UMKM & Observasi Lapangan",
    fileName: "Profil UMKM Warung Teras Hijau.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 1",
    submittedAt: "2026-07-01T14:15:00",
    comment: "Hasil observasi dan profil UMKM.",
    status: "approved",
    revisionNumber: 1,
  },
  {
    id: "report-k1-bmc",
    groupId: "kelompok-1",
    milestoneId: "business-model-canvas",
    milestoneTitle: "Business Model Canvas",
    fileName: "BMC Warung Teras Hijau Kel 1.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 1",
    submittedAt: "2026-07-08T09:48:00",
    comment: "BMC berdasarkan hasil observasi.",
    status: "approved",
    revisionNumber: 1,
  },
  {
    id: "report-k1-brand",
    groupId: "kelompok-1",
    milestoneId: "brand-guideline",
    milestoneTitle: "Brand Guideline",
    fileName: "Brand Guideline Kelompok 1.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 1",
    submittedAt: "2026-07-15T10:24:00",
    comment: "Draft identitas visual UMKM.",
    status: "revision_required",
    revisionNumber: 1,
  },
  {
    id: "report-k2-profile",
    groupId: "kelompok-2",
    milestoneId: "profil-umkm",
    milestoneTitle: "Profil UMKM & Observasi Lapangan",
    fileName: "Profil UMKM Bedjo Cleaner.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 2",
    submittedAt: "2026-07-01T11:00:00",
    comment: "Profil dan hasil observasi UMKM.",
    status: "approved",
    revisionNumber: 1,
  },
  {
    id: "report-k2-bmc",
    groupId: "kelompok-2",
    milestoneId: "business-model-canvas",
    milestoneTitle: "Business Model Canvas",
    fileName: "BMC Bedjo Cleaner Kel 2.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 2",
    submittedAt: "2026-07-08T13:00:00",
    comment: "BMC hasil analisis kelompok.",
    status: "approved",
    revisionNumber: 1,
  },
  {
    id: "report-k2-brand",
    groupId: "kelompok-2",
    milestoneId: "brand-guideline",
    milestoneTitle: "Brand Guideline",
    fileName: "Brand Guideline Kelompok 2.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 2",
    submittedAt: "2026-07-16T08:30:00",
    comment: "Draft awal brand guideline.",
    status: "submitted",
    revisionNumber: 1,
  },
  {
    id: "report-k3-profile",
    groupId: "kelompok-3",
    milestoneId: "profil-umkm",
    milestoneTitle: "Profil UMKM & Observasi Lapangan",
    fileName: "Profil UMKM Batik Jaya.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 3",
    submittedAt: "2026-07-01T10:00:00",
    comment: "Profil usaha Batik Jaya.",
    status: "approved",
    revisionNumber: 1,
  },
  {
    id: "report-k3-bmc",
    groupId: "kelompok-3",
    milestoneId: "business-model-canvas",
    milestoneTitle: "Business Model Canvas",
    fileName: "BMC Batik Jaya.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 3",
    submittedAt: "2026-07-08T10:00:00",
    comment: "Business Model Canvas Batik Jaya.",
    status: "approved",
    revisionNumber: 1,
  },
  {
    id: "report-k3-brand",
    groupId: "kelompok-3",
    milestoneId: "brand-guideline",
    milestoneTitle: "Brand Guideline",
    fileName: "Brand Guideline Batik Jaya.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 3",
    submittedAt: "2026-07-15T10:00:00",
    comment: "Brand guideline final.",
    status: "approved",
    revisionNumber: 1,
  },
  {
    id: "report-k3-content",
    groupId: "kelompok-3",
    milestoneId: "content-planner",
    milestoneTitle: "Content Planner",
    fileName: "Content Planner Batik Jaya.pdf",
    fileType: "PDF",
    submittedBy: "Kelompok 3",
    submittedAt: "2026-07-22T09:00:00",
    comment: "Draft content planner media sosial.",
    status: "submitted",
    revisionNumber: 1,
  },
];

const KNOWN_STATUSES = new Set(["not_submitted", "submitted", "revision_required", "approved", "reviewed", "revision"]);

type StoredReportShape = Omit<ProgressReport, "status"> & { status: string };

function isStoredReportShape(value: unknown): value is StoredReportShape {
  if (!value || typeof value !== "object") return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report.id === "string" &&
    typeof report.groupId === "string" &&
    typeof report.milestoneId === "string" &&
    typeof report.milestoneTitle === "string" &&
    typeof report.fileName === "string" &&
    typeof report.fileType === "string" &&
    typeof report.submittedBy === "string" &&
    typeof report.submittedAt === "string" &&
    typeof report.comment === "string" &&
    typeof report.status === "string" &&
    KNOWN_STATUSES.has(report.status)
  );
}

/** Normalizes legacy status values from earlier iterations of this feature. */
function migrateStatus(report: StoredReportShape, feedbacks: ReturnType<typeof initializeFeedbacks>): ReportStatus {
  if (report.status === "reviewed") {
    const latest = getLatestFeedback(report.id, feedbacks);
    if (latest) return latest.completionStatus === "complete" ? "approved" : "revision_required";
    return "submitted";
  }
  if (report.status === "revision") return "revision_required";
  return report.status as ReportStatus;
}

/** Reads reports from localStorage, seeding defaultProgressReports the first time or if the stored value is missing/corrupt. Migrates legacy status values in place; never resets valid existing data. */
export function initializeReports(): ProgressReport[] {
  if (typeof window === "undefined") return defaultProgressReports;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    writeProgressReports(defaultProgressReports);
    return defaultProgressReports;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isStoredReportShape)) {
      writeProgressReports(defaultProgressReports);
      return defaultProgressReports;
    }

    const feedbacks = initializeFeedbacks();
    const migrated = parsed.map((report) => ({ ...report, status: migrateStatus(report, feedbacks) }));
    writeProgressReports(migrated);
    return migrated;
  } catch {
    writeProgressReports(defaultProgressReports);
    return defaultProgressReports;
  }
}

export function writeProgressReports(reports: ProgressReport[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // localStorage unavailable (private mode / quota) — dummy feature, fail silently.
  }
}

// ---------------------------------------------------------------------------
// Project milestones — always available from project creation, no status of
// their own. A milestone's status is entirely derived from its group's
// latest report (see getMilestoneReportStatus). Independent from
// lib/dosenProjectMilestoneStorage.ts (Project Active, untouched by design).
// ---------------------------------------------------------------------------

export interface ProjectMilestone {
  id: string;
  title: string;
  /** ISO date. */
  createdAt: string;
  /** ISO date. */
  deadline: string;
  description?: string;
}

export const MENTORING_MILESTONES: ProjectMilestone[] = [
  {
    id: "profil-umkm",
    title: "Profil UMKM & Observasi Lapangan",
    createdAt: "2026-06-24",
    deadline: "2026-07-01",
    description: "Lakukan observasi dan susun profil lengkap UMKM mitra.",
  },
  {
    id: "business-model-canvas",
    title: "Business Model Canvas",
    createdAt: "2026-07-01",
    deadline: "2026-07-08",
    description: "Susun Business Model Canvas berdasarkan hasil observasi UMKM.",
  },
  {
    id: "brand-guideline",
    title: "Brand Guideline",
    createdAt: "2026-07-08",
    deadline: "2026-07-15",
    description: "Buat panduan identitas visual untuk UMKM mitra.",
  },
  {
    id: "content-planner",
    title: "Content Planner",
    createdAt: "2026-07-15",
    deadline: "2026-07-22",
    description: "Susun kalender konten dan strategi publikasi media sosial.",
  },
  {
    id: "finish",
    title: "Finish",
    createdAt: "2026-07-22",
    deadline: "2026-07-29",
    description: "Finalisasi seluruh hasil project dan presentasi akhir.",
  },
];

/** The group's latest report for a milestone, or "not_submitted" if none exists yet. */
export function getMilestoneReportStatus(
  groupId: string,
  milestoneId: string,
  reports: ProgressReport[]
): ReportStatus {
  const report = reports
    .filter((item) => item.groupId === groupId && item.milestoneId === milestoneId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

  return report?.status ?? "not_submitted";
}

export function getMilestoneReport(
  groupId: string,
  milestoneId: string,
  reports: ProgressReport[]
): ProgressReport | null {
  const matches = reports
    .filter((item) => item.groupId === groupId && item.milestoneId === milestoneId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return matches[0] ?? null;
}

export interface MilestoneAggregate {
  approved: number;
  waiting: number;
  incomplete: number;
  notSubmitted: number;
  total: number;
}

/** Aggregates a milestone's report status across every supervised group — used by the Dosen Dashboard's Track of project timeline. */
export function getMilestoneAggregate(
  milestoneId: string,
  groups: { id: string }[],
  reports: ProgressReport[]
): MilestoneAggregate {
  let approved = 0;
  let waiting = 0;
  let incomplete = 0;
  let notSubmitted = 0;

  groups.forEach((group) => {
    const report = getMilestoneReport(group.id, milestoneId, reports);
    if (!report) {
      notSubmitted += 1;
      return;
    }
    if (report.status === "approved") approved += 1;
    else if (report.status === "submitted") waiting += 1;
    else if (report.status === "revision_required") incomplete += 1;
    else notSubmitted += 1;
  });

  return { approved, waiting, incomplete, notSubmitted, total: groups.length };
}

/** The first milestone not yet approved by every group — the stage the dashboard should treat as "current". */
export function getCurrentAggregateMilestone(
  milestones: ProjectMilestone[],
  groups: { id: string }[],
  reports: ProgressReport[]
): ProjectMilestone {
  return (
    milestones.find((milestone) => getMilestoneAggregate(milestone.id, groups, reports).approved < groups.length) ??
    milestones[milestones.length - 1]
  );
}

export type MilestoneAggregateStatus = "completed" | "active" | "empty";

export function getMilestoneAggregateStatus(aggregate: MilestoneAggregate): MilestoneAggregateStatus {
  if (aggregate.total > 0 && aggregate.approved === aggregate.total) return "completed";
  if (aggregate.notSubmitted === aggregate.total) return "empty";
  return "active";
}

/** Human-readable subtext for a milestone's aggregate row, e.g. "1 tuntas · 1 menunggu feedback · 1 belum tuntas". */
export function getMilestoneAggregateSubtext(
  aggregate: MilestoneAggregate,
  status: MilestoneAggregateStatus
): string {
  if (status === "completed") {
    return `${aggregate.approved} dari ${aggregate.total} kelompok tuntas`;
  }
  const parts: string[] = [];
  if (aggregate.approved > 0) parts.push(`${aggregate.approved} tuntas`);
  if (aggregate.waiting > 0) parts.push(`${aggregate.waiting} menunggu feedback`);
  if (aggregate.incomplete > 0) parts.push(`${aggregate.incomplete} belum tuntas`);
  if (aggregate.notSubmitted > 0) parts.push(`${aggregate.notSubmitted} belum dikirim`);
  return parts.length > 0 ? parts.join(" · ") : "Belum ada laporan";
}

/**
 * The group's current stage: the last milestone (in order) that has a
 * report. If that report is already approved, the current stage advances to
 * the next milestone (or stays on the last one once everything is approved).
 * Falls back to the first milestone if nothing has a report yet.
 */
export function getCurrentStage(
  groupId: string,
  milestones: ProjectMilestone[],
  reports: ProgressReport[]
): ProjectMilestone {
  const groupReports = reports.filter((report) => report.groupId === groupId);

  let lastIndexWithReport = -1;
  for (let index = 0; index < milestones.length; index++) {
    if (groupReports.some((report) => report.milestoneId === milestones[index].id)) {
      lastIndexWithReport = index;
    }
  }

  if (lastIndexWithReport === -1) {
    return milestones[0];
  }

  const lastMilestone = milestones[lastIndexWithReport];
  const lastReport = getMilestoneReport(groupId, lastMilestone.id, reports);

  if (lastReport?.status === "approved") {
    return milestones[lastIndexWithReport + 1] ?? milestones[milestones.length - 1];
  }

  return lastMilestone;
}

/** 20% per approved milestone (5 milestones total) — never a stored/custom percentage. */
export function calculateGroupProgress(
  groupId: string,
  milestones: ProjectMilestone[],
  reports: ProgressReport[]
): number {
  const approvedCount = milestones.filter((milestone) =>
    reports.some(
      (report) => report.groupId === groupId && report.milestoneId === milestone.id && report.status === "approved"
    )
  ).length;

  return Math.round((approvedCount / milestones.length) * 100);
}

export function getInitialCompletionStatus(status: ReportStatus): "complete" | "incomplete" | "" {
  if (status === "approved") return "complete";
  if (status === "revision_required") return "incomplete";
  return "";
}

export type DeadlineState = "overdue" | "active";

export function getDeadlineState(deadline: string): DeadlineState {
  const now = new Date();
  const dueDate = new Date(deadline);
  return now > dueDate ? "overdue" : "active";
}

// ---------------------------------------------------------------------------
// Group-level mentoring status (used on /dosen/mentoring-feedback list page)
// ---------------------------------------------------------------------------

export type GroupMentoringStatus = "waiting" | "incomplete" | "completed";

export const GROUP_STATUS_LABEL: Record<GroupMentoringStatus, string> = {
  waiting: "Menunggu Feedback",
  incomplete: "Belum Tuntas",
  completed: "Tuntas",
};

export const GROUP_STATUS_BADGE_VARIANT: Record<GroupMentoringStatus, "orange" | "pink" | "green"> = {
  waiting: "orange",
  incomplete: "pink",
  completed: "green",
};

/**
 * A group's overall status, counted once per group (never per-report):
 * 1. any report still "submitted" -> waiting (needs the dosen's feedback)
 * 2. every milestone approved -> completed (progress must be exactly 100%)
 * 3. otherwise -> incomplete (not yet fully approved, nothing pending review)
 */
export function getGroupMentoringStatus(
  groupId: string,
  milestones: ProjectMilestone[],
  reports: ProgressReport[]
): GroupMentoringStatus {
  const groupReports = reports.filter((report) => report.groupId === groupId);

  const hasWaiting = groupReports.some((report) => report.status === "submitted");
  if (hasWaiting) {
    return "waiting";
  }

  const approvedMilestoneIds = new Set(
    groupReports.filter((report) => report.status === "approved").map((report) => report.milestoneId)
  );
  const isCompleted =
    milestones.length > 0 && milestones.every((milestone) => approvedMilestoneIds.has(milestone.id));

  if (isCompleted) {
    return "completed";
  }

  return "incomplete";
}

// ---------------------------------------------------------------------------
// Mahasiswa-facing labels — read by /mahasiswa/project/history/[id] (Feedback
// Dosen section). Kept here so Dosen and Mahasiswa never define the mapping twice.
// ---------------------------------------------------------------------------

export function getStudentFacingStatusLabel(status: ReportStatus): string {
  switch (status) {
    case "not_submitted":
      return "Belum Dikirim";
    case "submitted":
      return "Menunggu Feedback Dosen";
    case "revision_required":
      return "Belum Tuntas";
    case "approved":
      return "Tuntas";
  }
}

export function getStudentFacingStatusMessage(status: ReportStatus): string {
  switch (status) {
    case "not_submitted":
      return "Laporan belum dikirim untuk tahap ini.";
    case "submitted":
      return "Laporan sedang menunggu pemeriksaan dosen.";
    case "revision_required":
      return "Laporan perlu direvisi. Silakan kirim revisi baru.";
    case "approved":
      return "Laporan ini telah dinyatakan tuntas.";
  }
}

export function shouldShowRevisionCta(status: ReportStatus): boolean {
  return status === "revision_required";
}
