// Placeholder persistence for the UMKM's own editable business profile.
// Backend/Supabase isn't wired up yet, so the profile lives in localStorage,
// keyed by profile id: cedupreneur_umkm_profile_<id>. Mahasiswa's read-only
// Profile Mitra page keeps reading data/umkm.ts for now (not touched here).

export interface UmkmProfile {
  id: string;
  businessName: string;
  ownerName: string;
  establishedYear: number;
  category: string;
  address: string;
  photoUrl: string | null;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  updatedAt: string;
}

export function getUmkmProfileStorageKey(id: string) {
  return `cedupreneur_umkm_profile_${id}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isUmkmProfile(value: unknown): value is UmkmProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  const swot = profile.swot as Record<string, unknown> | undefined;
  return (
    typeof profile.id === "string" &&
    typeof profile.businessName === "string" &&
    typeof profile.ownerName === "string" &&
    typeof profile.establishedYear === "number" &&
    typeof profile.category === "string" &&
    typeof profile.address === "string" &&
    (profile.photoUrl === null || typeof profile.photoUrl === "string") &&
    typeof profile.updatedAt === "string" &&
    !!swot &&
    isStringArray(swot.strengths) &&
    isStringArray(swot.weaknesses) &&
    isStringArray(swot.opportunities) &&
    isStringArray(swot.threats)
  );
}

export function readUmkmProfile(id: string): UmkmProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getUmkmProfileStorageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isUmkmProfile(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeUmkmProfile(profile: UmkmProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getUmkmProfileStorageKey(profile.id), JSON.stringify(profile));
  } catch {
    // localStorage unavailable (private mode / quota, or the photo data URL is too large) — fail silently.
  }
}
