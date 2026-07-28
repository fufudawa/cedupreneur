// Shared feedback store (ERD: feedback -> laporan_id). Backend/Supabase isn't
// wired up yet, so ALL feedback (dosen and umkm) lives in one localStorage
// array keyed by reportId, filtered client-side — Dosen and Mahasiswa read
// the same key so a mahasiswa can see the dosen's feedback here. Seeded from
// defaultFeedbacks the first time (or if the stored value is missing/corrupt),
// then only ever appended to — never overwritten, full history kept.

export type CompletionStatus = "incomplete" | "complete";
export type FeedbackGiverRole = "dosen" | "umkm";

export interface FeedbackEntry {
  id: string;
  reportId: string;
  groupId: string;
  giverId: string;
  giverName: string;
  giverRole: FeedbackGiverRole;
  content: string;
  completionStatus: CompletionStatus;
  /** ISO datetime. */
  createdAt: string;
}

const STORAGE_KEY = "cedupreneur_feedbacks";

export const defaultFeedbacks: FeedbackEntry[] = [
  {
    id: "feedback-k1-profile",
    reportId: "report-k1-profile",
    groupId: "kelompok-1",
    giverId: "dosen-ridwan",
    giverName: "Ridwan",
    giverRole: "dosen",
    content: "Profil UMKM sudah lengkap dan hasil observasi telah menggambarkan kondisi usaha dengan baik.",
    completionStatus: "complete",
    createdAt: "2026-07-02T09:35:00",
  },
  {
    id: "feedback-k1-bmc",
    reportId: "report-k1-bmc",
    groupId: "kelompok-1",
    giverId: "dosen-ridwan",
    giverName: "Ridwan",
    giverRole: "dosen",
    content:
      "BMC sudah sesuai dengan hasil observasi. Value proposition dan customer segment sudah saling berkaitan.",
    completionStatus: "complete",
    createdAt: "2026-07-09T10:20:00",
  },
  {
    id: "feedback-k1-brand",
    reportId: "report-k1-brand",
    groupId: "kelompok-1",
    giverId: "dosen-ridwan",
    giverName: "Ridwan",
    giverRole: "dosen",
    content:
      "Konsep visual sudah menarik, tetapi konsistensi warna, penggunaan logo, dan contoh penerapan media sosial perlu diperbaiki.",
    completionStatus: "incomplete",
    createdAt: "2026-07-16T09:15:00",
  },
  {
    id: "feedback-k2-profile",
    reportId: "report-k2-profile",
    groupId: "kelompok-2",
    giverId: "dosen-ridwan",
    giverName: "Ridwan",
    giverRole: "dosen",
    content: "Profil UMKM dan hasil observasi sudah mencukupi. Tahap ini dinyatakan tuntas.",
    completionStatus: "complete",
    createdAt: "2026-07-02T11:10:00",
  },
  {
    id: "feedback-k2-bmc",
    reportId: "report-k2-bmc",
    groupId: "kelompok-2",
    giverId: "dosen-ridwan",
    giverName: "Ridwan",
    giverRole: "dosen",
    content: "Isi BMC sudah menggambarkan model usaha Bedjo Cleaner dengan cukup jelas. Tahap dinyatakan tuntas.",
    completionStatus: "complete",
    createdAt: "2026-07-09T13:35:00",
  },
  {
    id: "feedback-k3-profile",
    reportId: "report-k3-profile",
    groupId: "kelompok-3",
    giverId: "dosen-ridwan",
    giverName: "Ridwan",
    giverRole: "dosen",
    content: "Profil Batik Jaya sudah lengkap dan layak digunakan sebagai dasar project.",
    completionStatus: "complete",
    createdAt: "2026-07-02T10:10:00",
  },
  {
    id: "feedback-k3-bmc",
    reportId: "report-k3-bmc",
    groupId: "kelompok-3",
    giverId: "dosen-ridwan",
    giverName: "Ridwan",
    giverRole: "dosen",
    content: "BMC sudah baik dan konsisten dengan kebutuhan UMKM.",
    completionStatus: "complete",
    createdAt: "2026-07-09T10:10:00",
  },
  {
    id: "feedback-k3-brand",
    reportId: "report-k3-brand",
    groupId: "kelompok-3",
    giverId: "dosen-ridwan",
    giverName: "Ridwan",
    giverRole: "dosen",
    content: "Brand guideline sudah lengkap dan dapat diterapkan oleh mitra.",
    completionStatus: "complete",
    createdAt: "2026-07-16T10:10:00",
  },
];

function isFeedbackEntry(value: unknown): value is FeedbackEntry {
  if (!value || typeof value !== "object") return false;
  const feedback = value as Record<string, unknown>;
  return (
    typeof feedback.id === "string" &&
    typeof feedback.reportId === "string" &&
    typeof feedback.groupId === "string" &&
    typeof feedback.giverId === "string" &&
    typeof feedback.giverName === "string" &&
    (feedback.giverRole === "dosen" || feedback.giverRole === "umkm") &&
    typeof feedback.content === "string" &&
    (feedback.completionStatus === "incomplete" || feedback.completionStatus === "complete") &&
    typeof feedback.createdAt === "string"
  );
}

/** Reads feedback from localStorage, seeding defaultFeedbacks the first time or if the stored value is missing/corrupt. Never overwrites valid existing data. */
export function initializeFeedbacks(): FeedbackEntry[] {
  if (typeof window === "undefined") return defaultFeedbacks;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    writeFeedbackEntries(defaultFeedbacks);
    return defaultFeedbacks;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isFeedbackEntry)) {
      writeFeedbackEntries(defaultFeedbacks);
      return defaultFeedbacks;
    }
    return parsed;
  } catch {
    writeFeedbackEntries(defaultFeedbacks);
    return defaultFeedbacks;
  }
}

/** @deprecated use initializeFeedbacks — kept as an alias so existing call sites keep working. */
export const readFeedbackEntries = initializeFeedbacks;

export function writeFeedbackEntries(feedbacks: FeedbackEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
  } catch {
    // localStorage unavailable (private mode / quota) — dummy feature, fail silently.
  }
}

export function createFeedbackId(reportId: string) {
  return `feedback-${reportId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getLatestFeedback(reportId: string, feedbacks: FeedbackEntry[]): FeedbackEntry | null {
  const matching = feedbacks
    .filter((feedback) => feedback.reportId === reportId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return matching[0] ?? null;
}
