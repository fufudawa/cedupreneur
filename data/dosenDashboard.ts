// Dummy frontend-only data for the Dosen Dashboard. Follows the ERD relation
// dosen -> kelas -> project -> kelompok -> kelompok_anggota -> mahasiswa, and
// kelompok -> laporan_progress -> feedback, without touching the ERD itself.
// - totalGroups: kelompok dosen ini membimbing.
// - activeProjects: project yang masih berjalan (bukan jumlah kelompok/laporan).
// - pendingFeedback: laporan_progress berstatus submitted yang belum punya feedback dosen.
// - totalStudents: total mahasiswa lintas kelompok bimbingan, harus sama dengan
//   jumlah studyPrograms[].total (100 + 30 + 70 = 200).

export type DosenTrackStatus = "completed" | "in_progress" | "not_started";

export interface DosenTrackStage {
  id: string;
  title: string;
  status: DosenTrackStatus;
  subtext?: string;
}

export interface DosenStudyProgram {
  name: string;
  total: number;
}

export interface DosenDashboard {
  lecturerName: string;
  semester: string;
  course: string;
  totalGroups: number;
  activeProjects: number;
  pendingFeedback: number;
  totalStudents: number;
  studyPrograms: DosenStudyProgram[];
  trackOfProject: DosenTrackStage[];
}

export const lecturerDashboard: DosenDashboard = {
  lecturerName: "Ridwan",
  semester: "Semester Ganjil 2026/2027",
  course: "Mata Kuliah Praktik Kewirausahaan",
  totalGroups: 8,
  activeProjects: 4,
  pendingFeedback: 10,
  totalStudents: 200,
  studyPrograms: [
    { name: "T. Rekayasa Multimedia", total: 100 },
    { name: "Seni Kuliner", total: 30 },
    { name: "Desain Grafis", total: 70 },
  ],
  trackOfProject: [
    { id: "profil-umkm", title: "Profil UMKM & Observasi Lapangan", status: "completed" },
    { id: "business-model-canvas", title: "Business Model Canvas", status: "completed" },
    {
      id: "brand-guideline",
      title: "Brand Guideline",
      status: "in_progress",
      subtext: "6 dari 8 kelompok selesai",
    },
    { id: "content-planner", title: "Content Planner", status: "not_started", subtext: "Belum dimulai" },
    { id: "finish", title: "Finish", status: "not_started", subtext: "Belum dimulai" },
  ],
};
