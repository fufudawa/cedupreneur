// Admin monitoring aggregation helpers (Dashboard, Aktivitas Sistem, Monitoring
// Seluruh Kelompok). Derived entirely from lib/useAdminMonitoring.ts's real
// Supabase-backed AdminMonitoringGroup[] — no dummy/localStorage sources.
//
// The old milestone-based "progress_update" activity type (a stage getting
// approved) has no real equivalent since milestones don't exist in the real
// schema — dropped, consistent with every other milestone removal this session.

import type { AdminMonitoringGroup } from "./useAdminMonitoring";

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

export type ActivityType = "upload_progress" | "feedback_dosen" | "feedback_umkm" | "create_group";

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
};

export const ACTIVITY_TYPE_BADGE_VARIANT: Record<ActivityType, "purple" | "blue" | "green" | "orange"> = {
  upload_progress: "purple",
  feedback_dosen: "blue",
  feedback_umkm: "green",
  create_group: "orange",
};

/** Icon background/text tint per activity type (upload=violet, feedback dosen=blue, feedback UMKM=green, create group=orange). */
export const ACTIVITY_TYPE_ICON_CLASS: Record<ActivityType, string> = {
  upload_progress: "bg-purple/10 text-purple",
  feedback_dosen: "bg-blue-100 text-blue-700",
  feedback_umkm: "bg-green-100 text-green-700",
  create_group: "bg-orange/10 text-orange",
};

/**
 * Builds the full activity feed straight from real, already-timestamped
 * records — laporan submissions, dosen/umkm feedback, and kelompok creation.
 */
export function getAllActivities(groups: AdminMonitoringGroup[]): ActivityItem[] {
  const uploadEvents: ActivityItem[] = groups.flatMap((group) =>
    group.laporan
      .filter((l) => l.status !== "draft")
      .map((laporan) => ({
        id: `upload-${laporan.id}`,
        type: "upload_progress" as const,
        actorName: group.members[0]?.name ?? group.name,
        actorRole: "mahasiswa" as const,
        groupId: group.id,
        groupName: group.name,
        projectStage: laporan.judulLaporan,
        description: `${group.name} mengunggah laporan "${laporan.judulLaporan}"`,
        createdAt: laporan.tanggalSubmit ?? laporan.createdAt ?? "",
      }))
  );

  const feedbackEvents: ActivityItem[] = groups.flatMap((group) =>
    group.laporan.flatMap((laporan) =>
      laporan.feedback
        .filter((f) => f.pemberiRole === "dosen")
        .map((feedback) => ({
          id: `feedback-dosen-${feedback.id}`,
          type: "feedback_dosen" as const,
          actorName: group.dosenName,
          actorRole: "dosen" as const,
          groupId: group.id,
          groupName: group.name,
          projectStage: laporan.judulLaporan,
          description: `${group.dosenName} memberikan feedback pada "${laporan.judulLaporan}" — ${group.name}`,
          createdAt: feedback.createdAt ?? "",
        }))
    )
  );

  const umkmFeedbackEvents: ActivityItem[] = groups.flatMap((group) =>
    group.laporan.flatMap((laporan) =>
      laporan.feedback
        .filter((f) => f.pemberiRole === "umkm")
        .map((feedback) => ({
          id: `feedback-umkm-${feedback.id}`,
          type: "feedback_umkm" as const,
          actorName: group.umkmName,
          actorRole: "umkm" as const,
          groupId: group.id,
          groupName: group.name,
          projectStage: laporan.judulLaporan,
          umkmName: group.umkmName,
          description: `${group.umkmName} memvalidasi "${laporan.judulLaporan}" — ${group.name}`,
          createdAt: feedback.createdAt ?? "",
        }))
    )
  );

  const groupCreatedEvents: ActivityItem[] = groups.map((group) => ({
    id: `group-${group.id}`,
    type: "create_group",
    actorName: group.dosenName,
    actorRole: "dosen",
    groupId: group.id,
    groupName: group.name,
    description: `${group.dosenName} membuat ${group.name} untuk kelas ${group.className}`,
    createdAt: group.createdAt ?? "",
  }));

  return [...uploadEvents, ...feedbackEvents, ...umkmFeedbackEvents, ...groupCreatedEvents].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface DashboardActivity {
  id: string;
  message: string;
  createdAt: string;
}

/** Thin wrapper over getAllActivities for the Dashboard's compact "Aktivitas Terbaru" list. */
export function getRecentActivities(groups: AdminMonitoringGroup[], limit = 5): DashboardActivity[] {
  return getAllActivities(groups)
    .slice(0, limit)
    .map((activity) => ({ id: activity.id, message: activity.description, createdAt: activity.createdAt }));
}

// ---------------------------------------------------------------------------
// Group status (Dashboard + Monitoring pages)
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

/** Status of a group's most recent laporan (no milestone concept anymore — see file header). */
export function getAdminGroupStatus(group: AdminMonitoringGroup): AdminGroupStatus {
  const latest = group.laporan.find((l) => l.status !== "draft");
  if (!latest) return "empty";
  if (latest.status === "submitted") return "waiting";
  if (latest.status === "reviewed") return "completed";
  return "incomplete";
}
