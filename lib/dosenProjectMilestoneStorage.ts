// Placeholder persistence for the Dosen's Project Active milestones.
// Backend/Supabase isn't wired up yet, so the milestone list lives in
// localStorage under a single key. The current ERD has no dedicated
// milestone/project_stage table, so this stays frontend-only dummy state.

export type MilestoneStatus = "done" | "progress" | "todo";

export interface MilestoneMaterialFile {
  name: string;
  type: string;
  size: number;
  /** Only present for files the dosen actually uploaded through Add Project (data URL, not a real upload). Seed/example files have none. */
  dataUrl?: string;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  /** ISO date (YYYY-MM-DD). */
  createdAt: string;
  /** ISO date (YYYY-MM-DD). */
  deadline: string;
  materialFile: MilestoneMaterialFile | null;
  status: MilestoneStatus;
}

const STORAGE_KEY = "cedupreneur_dosen_project_milestones";

export const defaultProjectMilestones: ProjectMilestone[] = [
  {
    id: "profil-umkm",
    title: "Profil UMKM & Observasi Lapangan",
    description: "Lakukan observasi dan susun profil lengkap UMKM mitra.",
    createdAt: "2026-06-24",
    deadline: "2026-07-01",
    materialFile: { name: "Panduan Observasi UMKM.pdf", type: "application/pdf", size: 820000 },
    status: "done",
  },
  {
    id: "business-model-canvas",
    title: "Business Model Canvas",
    description: "Susun Business Model Canvas berdasarkan hasil observasi UMKM.",
    createdAt: "2026-07-01",
    deadline: "2026-07-08",
    materialFile: { name: "Template Business Model Canvas.pdf", type: "application/pdf", size: 620000 },
    status: "done",
  },
  {
    id: "brand-guideline",
    title: "Brand Guideline",
    description: "Buat panduan identitas visual untuk UMKM mitra.",
    createdAt: "2026-07-08",
    deadline: "2026-07-15",
    materialFile: null,
    status: "progress",
  },
  {
    id: "content-planner",
    title: "Content Planner",
    description: "Susun kalender konten dan strategi publikasi media sosial.",
    createdAt: "2026-07-15",
    deadline: "2026-07-22",
    materialFile: null,
    status: "todo",
  },
  {
    id: "finish",
    title: "Finish",
    description: "Finalisasi seluruh hasil project dan presentasi akhir.",
    createdAt: "2026-07-22",
    deadline: "2026-07-29",
    materialFile: null,
    status: "todo",
  },
];

function isMilestoneMaterialFile(value: unknown): value is MilestoneMaterialFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.name === "string" &&
    typeof file.type === "string" &&
    typeof file.size === "number" &&
    (file.dataUrl === undefined || typeof file.dataUrl === "string")
  );
}

function isProjectMilestone(value: unknown): value is ProjectMilestone {
  if (!value || typeof value !== "object") return false;
  const milestone = value as Record<string, unknown>;
  return (
    typeof milestone.id === "string" &&
    typeof milestone.title === "string" &&
    typeof milestone.description === "string" &&
    typeof milestone.createdAt === "string" &&
    typeof milestone.deadline === "string" &&
    (milestone.status === "done" || milestone.status === "progress" || milestone.status === "todo") &&
    (milestone.materialFile === null || isMilestoneMaterialFile(milestone.materialFile))
  );
}

export function readProjectMilestones(): ProjectMilestone[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProjectMilestone);
  } catch {
    return [];
  }
}

export function writeProjectMilestones(milestones: ProjectMilestone[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(milestones));
  } catch {
    // localStorage unavailable (private mode / quota, or an attached file is too large) — fail silently.
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createMilestoneId(title: string, existing: ProjectMilestone[]) {
  const base = slugify(title) || "project";
  const existingIds = new Set(existing.map((milestone) => milestone.id));
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
