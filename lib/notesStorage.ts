// Placeholder persistence for the student's personal Notes widget.
// Backend/Supabase isn't wired up yet, so notes live in localStorage only,
// scoped per user + active project (e.g. cedupreneur_notes_dealova_project-rj24d).

export interface PersonalNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isCompleted: boolean;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getNotesStorageKey(userName: string, projectCode: string) {
  return `cedupreneur_notes_${slugify(userName)}_project-${slugify(projectCode)}`;
}

function isPersonalNote(value: unknown): value is PersonalNote {
  if (!value || typeof value !== "object") return false;
  const note = value as Record<string, unknown>;
  return (
    typeof note.id === "string" &&
    typeof note.content === "string" &&
    typeof note.createdAt === "string" &&
    typeof note.updatedAt === "string" &&
    typeof note.isCompleted === "boolean"
  );
}

export function readNotes(key: string): PersonalNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPersonalNote);
  } catch {
    return [];
  }
}

export function writeNotes(key: string, notes: PersonalNote[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(notes));
  } catch {
    // localStorage unavailable (private mode / quota) — dummy feature, fail silently.
  }
}

export function createNoteId() {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sortNotesByLatest(notes: PersonalNote[]) {
  return [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function formatNoteTimestamp(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
