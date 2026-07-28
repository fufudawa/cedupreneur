// Shared source of truth for Admin "Data Master": mata_kuliah, kelas, and
// umkm (the ERD's three master tables — distinct from `profiles`, which is
// lib/adminUsersData.ts). Same localStorage load/save/seed pattern as the
// other lib/*Storage.ts files in this app.
//
// Fields marked "frontend extension" below don't exist on the ERD tables in
// context/SCHEMA.md yet (mata_kuliah only has id/kode_mk/nama_mk/sks; kelas
// only has id/mata_kuliah_id/dosen_id/nama_kelas/semester/tahun_ajaran; umkm
// only has id/nama_usaha/sektor_usaha/deskripsi_usaha/alamat). They're kept
// here so the Data Master UI has somewhere to live before a real backend
// migration adds these columns.
//
// Kelas.studentIds stands in for a future kelas_mahasiswa (or
// kelompok_anggota-style) join table — for now it's just an array of
// lib/adminUsersData.ts AdminUser ids (role "mahasiswa").
//
// Kelas.dosenId / UmkmMaster.linkedUserId both point at AdminUser ids in the
// same shared lib/adminUsersData.ts store — Data Master never keeps its own
// copy of a dosen's or UMKM's account identity.

import type { AdminUser } from "./adminUsersData";
import type { StudentOption } from "./dosenGroupsStorage";

export type Semester = "Ganjil" | "Genap";
export type ActiveStatus = "aktif" | "tidak_aktif";

export interface MataKuliah {
  id: string;
  kode: string;
  nama: string;
  sks: number;
  // --- frontend extension, not yet in ERD mata_kuliah ---
  semester: Semester;
  tahunAjaran: string;
  status: ActiveStatus;
  deskripsi?: string;
}

export interface Kelas {
  id: string;
  nama: string;
  mataKuliahId: string;
  /** AdminUser id (role "dosen"). */
  dosenId: string;
  semester: Semester;
  tahunAjaran: string;
  /** AdminUser ids (role "mahasiswa") — see file header re: future kelas_mahasiswa table. */
  studentIds: string[];
  // --- frontend extension, not yet in ERD kelas (no program_studi table yet) ---
  programStudi: string;
  status: ActiveStatus;
  catatan?: string;
  createdAt: string;
}

export interface UmkmMaster {
  id: string;
  namaUsaha: string;
  namaPemilik: string;
  sektorUsaha: string;
  alamat: string;
  deskripsiUsaha?: string;
  // --- frontend extension, not yet in ERD umkm ---
  kontak?: string;
  email?: string;
  mediaSosial?: string;
  catatanKebutuhan?: string;
  status: ActiveStatus;
  /** Set when "Buat akun login UMKM" was used — AdminUser id (role "umkm") in lib/adminUsersData.ts. */
  linkedUserId?: string;
  createdAt: string;
}

export const BUSINESS_SECTOR_OPTIONS = ["Food and Beverage", "Jasa", "Fashion", "Kerajinan", "Teknologi", "Lainnya"];

// ---------------------------------------------------------------------------
// Mata Kuliah
// ---------------------------------------------------------------------------

export const MATA_KULIAH_STORAGE_KEY = "cedupreneur_admin_mata_kuliah";

export const defaultMataKuliah: MataKuliah[] = [
  {
    id: "mk-1",
    kode: "PKWU301",
    nama: "Praktik Kewirausahaan",
    sks: 3,
    semester: "Ganjil",
    tahunAjaran: "2026/2027",
    status: "aktif",
    deskripsi: "Mata kuliah utama kolaborasi mahasiswa dan UMKM mitra di seluruh sistem CEdPreneur.",
  },
  {
    id: "mk-2",
    kode: "KWU201",
    nama: "Manajemen UMKM",
    sks: 2,
    semester: "Ganjil",
    tahunAjaran: "2026/2027",
    status: "aktif",
  },
];

function isMataKuliah(value: unknown): value is MataKuliah {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.kode === "string" &&
    typeof m.nama === "string" &&
    typeof m.sks === "number" &&
    (m.semester === "Ganjil" || m.semester === "Genap") &&
    typeof m.tahunAjaran === "string" &&
    (m.status === "aktif" || m.status === "tidak_aktif")
  );
}

export function loadMataKuliah(): MataKuliah[] {
  if (typeof window === "undefined") return defaultMataKuliah;
  const saved = window.localStorage.getItem(MATA_KULIAH_STORAGE_KEY);
  if (!saved) {
    saveMataKuliah(defaultMataKuliah);
    return defaultMataKuliah;
  }
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isMataKuliah)) {
      saveMataKuliah(defaultMataKuliah);
      return defaultMataKuliah;
    }
    return parsed;
  } catch {
    saveMataKuliah(defaultMataKuliah);
    return defaultMataKuliah;
  }
}

export function saveMataKuliah(items: MataKuliah[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MATA_KULIAH_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable — dummy feature, fail silently.
  }
}

export function createMataKuliahId(existing: MataKuliah[]) {
  const existingIds = new Set(existing.map((m) => m.id));
  let n = existing.length + 1;
  let candidate = `mk-${n}`;
  while (existingIds.has(candidate)) {
    n += 1;
    candidate = `mk-${n}`;
  }
  return candidate;
}

export function isKodeMataKuliahTaken(kode: string, items: MataKuliah[], excludeId?: string) {
  const normalized = kode.trim().toUpperCase();
  return items.some((m) => m.id !== excludeId && m.kode.toUpperCase() === normalized);
}

export function isMataKuliahUsedByKelas(mataKuliahId: string, kelasList: Kelas[]) {
  return kelasList.some((k) => k.mataKuliahId === mataKuliahId);
}

// ---------------------------------------------------------------------------
// Kelas
// ---------------------------------------------------------------------------

export const KELAS_STORAGE_KEY = "cedupreneur_admin_kelas";

export const defaultKelas: Kelas[] = [
  {
    id: "kelas-rj24d",
    nama: "RJ24D",
    mataKuliahId: "mk-1",
    dosenId: "u-dosen-1",
    semester: "Ganjil",
    tahunAjaran: "2026/2027",
    studentIds: ["u-mhs-1", "u-mhs-2"],
    programStudi: "Teknologi Rekayasa Multimedia",
    status: "aktif",
    catatan: "",
    createdAt: "2026-01-04",
  },
  {
    id: "kelas-rj24a",
    nama: "RJ24A",
    mataKuliahId: "mk-1",
    dosenId: "u-dosen-1",
    semester: "Ganjil",
    tahunAjaran: "2026/2027",
    studentIds: ["u-mhs-3"],
    programStudi: "Desain Grafis",
    status: "aktif",
    catatan: "",
    createdAt: "2026-01-04",
  },
];

function isKelas(value: unknown): value is Kelas {
  if (!value || typeof value !== "object") return false;
  const k = value as Record<string, unknown>;
  return (
    typeof k.id === "string" &&
    typeof k.nama === "string" &&
    typeof k.mataKuliahId === "string" &&
    typeof k.dosenId === "string" &&
    (k.semester === "Ganjil" || k.semester === "Genap") &&
    typeof k.tahunAjaran === "string" &&
    Array.isArray(k.studentIds) &&
    typeof k.programStudi === "string" &&
    (k.status === "aktif" || k.status === "tidak_aktif") &&
    typeof k.createdAt === "string"
  );
}

export function loadKelas(): Kelas[] {
  if (typeof window === "undefined") return defaultKelas;
  const saved = window.localStorage.getItem(KELAS_STORAGE_KEY);
  if (!saved) {
    saveKelas(defaultKelas);
    return defaultKelas;
  }
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isKelas)) {
      saveKelas(defaultKelas);
      return defaultKelas;
    }
    return parsed;
  } catch {
    saveKelas(defaultKelas);
    return defaultKelas;
  }
}

export function saveKelas(items: Kelas[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KELAS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable — dummy feature, fail silently.
  }
}

export function createKelasId(nama: string, existing: Kelas[]) {
  const base = nama
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "kelas";
  const existingIds = new Set(existing.map((k) => k.id));
  let candidate = `kelas-${base}`;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `kelas-${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function isNamaKelasTaken(nama: string, tahunAjaran: string, items: Kelas[], excludeId?: string) {
  const normalized = nama.trim().toLowerCase();
  return items.some(
    (k) => k.id !== excludeId && k.nama.trim().toLowerCase() === normalized && k.tahunAjaran === tahunAjaran
  );
}

/** Best-effort relation check: a kelompok bimbingan (SupervisedGroup) references a kelas only by className. */
export function isKelasUsedByKelompok(kelasNama: string, groupClassNames: string[]) {
  return groupClassNames.includes(kelasNama);
}

// ---------------------------------------------------------------------------
// UMKM (master profile — distinct from the login-capable AdminUser record)
// ---------------------------------------------------------------------------

export const UMKM_MASTER_STORAGE_KEY = "cedupreneur_admin_umkm_master";

export const defaultUmkmMaster: UmkmMaster[] = [
  {
    id: "umkm-warung-teras-hijau",
    namaUsaha: "Warung Teras Hijau",
    namaPemilik: "Warung Teras Hijau",
    sektorUsaha: "Food and Beverage",
    alamat: "Srengseng Sawah, Jakarta Selatan",
    deskripsiUsaha: "Warung makan dan kopi dengan konsep teras hijau yang nyaman untuk nongkrong.",
    kontak: "081234567890",
    email: "info@warungterashijau.id",
    status: "aktif",
    linkedUserId: "u-umkm-1",
    createdAt: "2026-01-15",
  },
  {
    id: "umkm-bedjo-cleaner",
    namaUsaha: "Bedjo Cleaner",
    namaPemilik: "Bedjo Cleaner",
    sektorUsaha: "Jasa",
    alamat: "Jakarta Selatan",
    deskripsiUsaha: "Layanan jasa kebersihan rumah dan kantor.",
    email: "info@bedjocleaner.id",
    status: "aktif",
    linkedUserId: "u-umkm-2",
    createdAt: "2026-01-15",
  },
  {
    id: "umkm-batik-jaya",
    namaUsaha: "Batik Jaya",
    namaPemilik: "Hendra Wijaya",
    sektorUsaha: "Fashion",
    alamat: "Depok",
    deskripsiUsaha: "Produsen batik tulis dan cap dengan motif khas daerah.",
    kontak: "081298765432",
    email: "hendra@batikjaya.id",
    status: "aktif",
    linkedUserId: "u-umkm-3",
    createdAt: "2026-01-15",
  },
];

function isUmkmMaster(value: unknown): value is UmkmMaster {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.id === "string" &&
    typeof u.namaUsaha === "string" &&
    typeof u.namaPemilik === "string" &&
    typeof u.sektorUsaha === "string" &&
    typeof u.alamat === "string" &&
    (u.status === "aktif" || u.status === "tidak_aktif") &&
    typeof u.createdAt === "string"
  );
}

export function loadUmkmMaster(): UmkmMaster[] {
  if (typeof window === "undefined") return defaultUmkmMaster;
  const saved = window.localStorage.getItem(UMKM_MASTER_STORAGE_KEY);
  if (!saved) {
    saveUmkmMaster(defaultUmkmMaster);
    return defaultUmkmMaster;
  }
  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isUmkmMaster)) {
      saveUmkmMaster(defaultUmkmMaster);
      return defaultUmkmMaster;
    }
    return parsed;
  } catch {
    saveUmkmMaster(defaultUmkmMaster);
    return defaultUmkmMaster;
  }
}

export function saveUmkmMaster(items: UmkmMaster[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UMKM_MASTER_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage unavailable — dummy feature, fail silently.
  }
}

export function createUmkmMasterId(namaUsaha: string, existing: UmkmMaster[]) {
  const base =
    namaUsaha
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "umkm";
  const existingIds = new Set(existing.map((u) => u.id));
  let candidate = `umkm-${base}`;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `umkm-${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export function isNamaUsahaTaken(namaUsaha: string, items: UmkmMaster[], excludeId?: string) {
  const normalized = namaUsaha.trim().toLowerCase();
  return items.some((u) => u.id !== excludeId && u.namaUsaha.trim().toLowerCase() === normalized);
}

/** Best-effort relation check: a kelompok bimbingan (SupervisedGroup) references UMKM only by name. */
export function isUmkmUsedByKelompok(namaUsaha: string, groupUmkmNames: string[]) {
  return groupUmkmNames.includes(namaUsaha);
}

/** Adapts an active mahasiswa AdminUser (profiles) record into the shape StudentPickerModal expects. */
export function toStudentOption(user: AdminUser): StudentOption {
  return {
    id: user.id,
    nim: user.nim ?? "",
    name: user.name,
    studyProgram: user.prodi ?? "",
    className: user.kelas ?? "",
  };
}

/** Builds the AdminUser (profiles/role=umkm) record created when "Buat akun login UMKM" is checked. */
export function buildUmkmAccountFromMaster(
  master: UmkmMaster,
  userId: string,
  createdBy: string | undefined
): AdminUser {
  return {
    id: userId,
    name: master.namaPemilik,
    email: master.email ?? "",
    role: "umkm",
    isActive: master.status === "aktif",
    createdAt: master.createdAt,
    createdBy,
    businessName: master.namaUsaha,
    businessSector: master.sektorUsaha,
    businessAddress: master.alamat,
    businessDescription: master.deskripsiUsaha,
    phone: master.kontak,
  };
}
