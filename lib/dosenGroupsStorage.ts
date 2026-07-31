// Shared constants/types still reused by real (Supabase-backed) pages after
// the dummy "SupervisedGroup" CRUD store was retired: STUDY_PROGRAMS (Dosen/
// UMKM/Mahasiswa role forms), StudentOption (StudentPickerModal + Dosen's
// tambah-kelompok, populated from real mahasiswa rows), and GroupMemberRole
// (lib/adminUsersData.ts's optional AdminUser.memberRole field).

export const STUDY_PROGRAMS = ["Teknologi Rekayasa Multimedia", "Desain Grafis", "Seni Kuliner"] as const;

export interface StudentOption {
  id: string;
  nim: string;
  name: string;
  studyProgram: string;
  className: string;
}

export type GroupMemberRole = "ketua" | "anggota";
