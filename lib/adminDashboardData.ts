// Admin monitoring aggregation helpers (Dashboard, Aktivitas Sistem, Progress
// Seluruh Kelompok). Deliberately reuse the SAME shared sources Dosen/
// Mahasiswa already read (lib/dosenGroupsStorage.ts,
// lib/dosenProgressReportsStorage.ts, lib/dosenFeedbackStorage.ts) instead of
// the older, inconsistent data/projects.ts (grp-1/grp-2, "Kopi Kita") — no
// new/duplicate dummy kelompok or numbers are introduced here.
//
// UMKM's own mentoring feedback (lib/umkmFeedbackStorage.ts) is keyed by the
// same ProgressReport.id/groupId/milestoneId as the Dosen store, but lives in
// its own per-report localStorage keys rather than cedupreneur_feedbacks. For
// the "Feedback UMKM" activity type specifically, this file reads that store
// read-only (not merging it into cedupreneur_feedbacks) so the activity feed
// reports UMKM's real feedback state instead of fabricating fake entries.

import type { ProgressReport } from "./dosenProgressReportsStorage";
import { getCurrentStage, getMilestoneReport, calculateGroupProgress, MENTORING_MILESTONES } from "./dosenProgressReportsStorage";
import type { ProjectMilestone } from "./dosenProgressReportsStorage";
import type { SupervisedGroup } from "./dosenGroupsStorage";
import type { FeedbackEntry } from "./dosenFeedbackStorage";
import { readAllUmkmFeedback } from "@/lib/umkmFeedbackStorage";

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}

export function isWithinDays(iso: string, days: number): boolean {
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

export function formatActivityDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export type ActivityType =
  | "upload_progress"
  | "feedback_dosen"
  | "feedback_umkm"
  | "create_group"
  | "create_umkm"
  | "progress_update";

export type ActivityActorRole = "admin" | "dosen" | "mahasiswa" | "umkm";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actorName: string;
  actorRole: ActivityActorRole;
  groupId?: string;
  groupName?: string;
  projectStage?: string;
  umkmName?: string;
  description: string;
  createdAt: string;
}

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  upload_progress: "Upload Laporan",
  feedback_dosen: "Feedback Dosen",
  feedback_umkm: "Feedback UMKM",
  create_group: "Kelompok Dibuat",
  create_umkm: "UMKM Ditambahkan",
  progress_update: "Progress Berubah",
};

export const ACTIVITY_TYPE_BADGE_VARIANT: Record<
  ActivityType,
  "purple" | "blue" | "green" | "orange" | "pink" | "cyan"
> = {
  upload_progress: "purple",
  feedback_dosen: "blue",
  feedback_umkm: "green",
  create_group: "orange",
  create_umkm: "pink",
  progress_update: "cyan",
};

/** Icon background/text tint per activity type (upload=violet, feedback dosen=blue, feedback UMKM=green, create group=orange, create UMKM=pink, progress update=cyan). */
export const ACTIVITY_TYPE_ICON_CLASS: Record<ActivityType, string> = {
  upload_progress: "bg-purple/10 text-purple",
  feedback_dosen: "bg-blue-100 text-blue-700",
  feedback_umkm: "bg-green-100 text-green-700",
  create_group: "bg-orange/10 text-orange",
  create_umkm: "bg-pink/10 text-pink",
  progress_update: "bg-cyan-100 text-cyan-700",
};

function getUmkmFeedbackActivities(groups: SupervisedGroup[]): ActivityItem[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const milestoneById = new Map(MENTORING_MILESTONES.map((milestone) => [milestone.id, milestone]));

  return readAllUmkmFeedback().map((feedback): ActivityItem => {
    const group = groupById.get(feedback.groupId);
    const milestone = milestoneById.get(feedback.milestoneId);
    return {
      id: `umkm-feedback-${feedback.id}`,
      type: "feedback_umkm",
      actorName: feedback.pemberiNama,
      actorRole: "umkm",
      groupId: feedback.groupId,
      groupName: group?.name ?? feedback.groupId,
      projectStage: milestone?.title,
      umkmName: feedback.pemberiNama,
      description: `${feedback.pemberiNama} memvalidasi ${milestone?.title ?? "laporan"} — ${group?.name ?? feedback.groupId}`,
      createdAt: feedback.updatedAt,
    };
  });
}

export interface GroupUmkmFeedback {
  id: string;
  pemberiNama: string;
  isiFeedback: string;
  /** ERD feedback.jenis = "validasi_umkm" — "tuntas"/"belum_tuntas" internally, but Admin/Dosen-facing UI must present these as "Sesuai"/"Perlu Penyesuaian" (never "Tuntas"/"Belum Tuntas", which is reserved for Dosen's academic feedback). */
  statusValidasi: "tuntas" | "belum_tuntas";
  createdAt: string;
  laporanTitle: string;
}

/**
 * Reads UMKM's validation feedback (lib/umkmFeedbackStorage.ts) for a given
 * SupervisedGroup id, read-only — same source getUmkmFeedbackActivities above
 * already bridges for the activity feed. Works for any group that has real
 * UMKM feedback, not just a single hardcoded group.
 */
export function getUmkmFeedbackForGroup(groupId: string): GroupUmkmFeedback[] {
  const milestoneById = new Map(MENTORING_MILESTONES.map((milestone) => [milestone.id, milestone]));

  return readAllUmkmFeedback()
    .filter((feedback) => feedback.groupId === groupId)
    .map(
      (feedback): GroupUmkmFeedback => ({
        id: feedback.id,
        pemberiNama: feedback.pemberiNama,
        isiFeedback: feedback.isiFeedback,
        statusValidasi: feedback.statusValidasi,
        createdAt: feedback.updatedAt,
        laporanTitle: milestoneById.get(feedback.milestoneId)?.title ?? feedback.milestoneId,
      })
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Builds the full activity feed straight from real, already-timestamped
 * records — report submissions, dosen feedback (+ the "progress_update"
 * moment a stage gets approved), group creation, and UMKM's own validation
 * feedback. Nothing here is a separately-fabricated dummy activity.
 */
export function getAllActivities(
  groups: SupervisedGroup[],
  reports: ProgressReport[],
  feedbacks: FeedbackEntry[]
): ActivityItem[] {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const reportById = new Map(reports.map((report) => [report.id, report]));

  const uploadEvents: ActivityItem[] = reports.map((report) => {
    const group = groupById.get(report.groupId);
    return {
      id: `upload-${report.id}`,
      type: "upload_progress",
      actorName: group?.members[0]?.name ?? report.submittedBy,
      actorRole: "mahasiswa",
      groupId: report.groupId,
      groupName: group?.name ?? report.groupId,
      projectStage: report.milestoneTitle,
      description: `${group?.name ?? report.submittedBy} mengunggah laporan ${report.milestoneTitle}`,
      createdAt: report.submittedAt,
    };
  });

  const dosenFeedbacks = feedbacks.filter((feedback) => feedback.giverRole === "dosen");

  const feedbackEvents: ActivityItem[] = dosenFeedbacks.map((feedback) => {
    const group = groupById.get(feedback.groupId);
    const report = reportById.get(feedback.reportId);
    return {
      id: `feedback-${feedback.id}`,
      type: "feedback_dosen",
      actorName: feedback.giverName,
      actorRole: "dosen",
      groupId: feedback.groupId,
      groupName: group?.name ?? feedback.groupId,
      projectStage: report?.milestoneTitle,
      description: `${feedback.giverName} memberikan feedback pada ${report?.milestoneTitle ?? "laporan"} — ${group?.name ?? feedback.groupId}`,
      createdAt: feedback.createdAt,
    };
  });

  const progressEvents: ActivityItem[] = dosenFeedbacks
    .filter((feedback) => feedback.completionStatus === "complete")
    .map((feedback) => {
      const group = groupById.get(feedback.groupId);
      const report = reportById.get(feedback.reportId);
      return {
        id: `progress-${feedback.id}`,
        type: "progress_update",
        actorName: group?.name ?? feedback.groupId,
        actorRole: "mahasiswa",
        groupId: feedback.groupId,
        groupName: group?.name ?? feedback.groupId,
        projectStage: report?.milestoneTitle,
        description: `${group?.name ?? feedback.groupId} mencapai tahap ${report?.milestoneTitle ?? ""}`,
        createdAt: feedback.createdAt,
      };
    });

  const groupCreatedEvents: ActivityItem[] = groups.map((group) => ({
    id: `group-${group.id}`,
    type: "create_group",
    actorName: group.lecturerName,
    actorRole: "dosen",
    groupId: group.id,
    groupName: group.name,
    description: `${group.lecturerName} membuat ${group.name} untuk kelas ${group.className}`,
    createdAt: group.createdAt,
  }));

  const umkmFeedbackEvents = getUmkmFeedbackActivities(groups);

  return [...uploadEvents, ...feedbackEvents, ...progressEvents, ...groupCreatedEvents, ...umkmFeedbackEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface DashboardActivity {
  id: string;
  message: string;
  createdAt: string;
}

/** Thin wrapper over getAllActivities for the Dashboard's compact "Aktivitas Terbaru" list. */
export function getRecentActivities(
  groups: SupervisedGroup[],
  reports: ProgressReport[],
  feedbacks: FeedbackEntry[],
  limit = 5
): DashboardActivity[] {
  return getAllActivities(groups, reports, feedbacks)
    .slice(0, limit)
    .map((activity) => ({ id: activity.id, message: activity.description, createdAt: activity.createdAt }));
}

// ---------------------------------------------------------------------------
// Group status (Dashboard + Progress Kelompok pages)
// ---------------------------------------------------------------------------

export type AdminGroupStatus = "waiting" | "incomplete" | "completed" | "empty";

export const ADMIN_GROUP_STATUS_LABEL: Record<AdminGroupStatus, string> = {
  waiting: "Menunggu Feedback",
  incomplete: "Belum Tuntas",
  completed: "Tuntas",
  empty: "Belum Ada Laporan",
};

export const ADMIN_GROUP_STATUS_VARIANT: Record<AdminGroupStatus, "orange" | "pink" | "green" | "gray"> = {
  waiting: "orange",
  incomplete: "pink",
  completed: "green",
  empty: "gray",
};

/**
 * Status of a group's currently-active stage only (not the whole group
 * history) — "completed"/"Tuntas" can only happen once progress is exactly
 * 100%, per the current stage naturally advancing past every approved milestone.
 */
export function getAdminGroupStatus(
  groupId: string,
  milestones: ProjectMilestone[],
  reports: ProgressReport[]
): AdminGroupStatus {
  const currentStage = getCurrentStage(groupId, milestones, reports);
  const activeReport = getMilestoneReport(groupId, currentStage.id, reports);

  if (!activeReport) return "empty";
  if (activeReport.status === "submitted") return "waiting";
  if (activeReport.status === "revision_required") return "incomplete";
  if (activeReport.status === "approved") {
    return calculateGroupProgress(groupId, milestones, reports) === 100 ? "completed" : "incomplete";
  }
  return "empty";
}
