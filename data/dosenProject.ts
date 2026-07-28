// Shared stage taxonomy for classifying a kelompok's progress percentage.
// Kelompok data itself now lives in lib/dosenGroupsStorage.ts (localStorage,
// shared across all /dosen/project* pages) — this file intentionally only
// keeps the fixed stage list + derivation helper, so a dosen renaming/adding
// an arbitrary Project Active milestone can never affect how kelompok
// progress stages are labeled.

export const PROJECT_STAGE_TITLES = [
  "Profil UMKM & Observasi Lapangan",
  "Business Model Canvas",
  "Brand Guideline",
  "Content Planner",
  "Finish",
] as const;
