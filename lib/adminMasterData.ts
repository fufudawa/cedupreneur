// Shared types for Admin "Data Master": mata_kuliah, kelas, and umkm — the
// ERD's three master tables. Supabase-backed (see lib/useAdminMasterData.ts);
// this file now only holds shapes + the sector suggestion list.
//
// Dropped vs. the old dummy version: semester/tahunAjaran/status/deskripsi on
// MataKuliah (those don't exist on mata_kuliah — semester/tahun_ajaran belong
// to kelas, which can reuse the same mata_kuliah across many terms); status/
// catatan/programStudi/studentIds on Kelas (kelas has no such columns, and no
// kelas_mahasiswa roster table exists — a student's kelas is only known
// indirectly via kelompok -> project.kelas_id); status/email/mediaSosial/
// catatanKebutuhan/linkedUserId on UmkmMaster (umkm.profile_id is NOT NULL —
// a UMKM row always requires a real login account, created via Admin's
// "Tambah Pengguna", so Data Master's UMKM section is view/edit-only here).

export interface MataKuliah {
  id: string;
  kode: string;
  nama: string;
  sks: number;
}

export interface Kelas {
  id: string;
  nama: string;
  mataKuliahId: string;
  mataKuliahNama: string;
  dosenId: string;
  dosenNama: string;
  semester: string;
  tahunAjaran: string;
}

export interface UmkmMaster {
  id: string;
  namaUsaha: string;
  sektorUsaha: string;
  alamat: string;
  deskripsiUsaha: string;
  kontak: string;
  connectedKelasNames: string[];
}

export const BUSINESS_SECTOR_OPTIONS = ["Food and Beverage", "Jasa", "Fashion", "Kerajinan", "Teknologi", "Lainnya"];
