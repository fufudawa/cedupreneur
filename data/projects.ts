import type { Project, Group, Progress, Feedback } from "@/types";

export const projects: Project[] = [
  {
    id: "prj-1",
    judul: "Digitalisasi Pemasaran Kopi Kita",
    deskripsi:
      "Membantu Kopi Kita membangun strategi pemasaran digital melalui media sosial dan marketplace.",
    kelasId: "kls-1",
    umkmId: "umkm-1",
    dosenId: "u-dosen-1",
    status: "berjalan",
    tanggalMulai: "2026-02-01",
    tanggalSelesai: "2026-06-01",
  },
  {
    id: "prj-2",
    judul: "Pengembangan Branding Batik Jaya",
    deskripsi:
      "Merancang ulang identitas merek dan kemasan produk Batik Jaya agar lebih kompetitif.",
    kelasId: "kls-2",
    umkmId: "umkm-2",
    dosenId: "u-dosen-2",
    status: "belum-mulai",
    tanggalMulai: "2026-03-01",
    tanggalSelesai: "2026-07-01",
  },
];

export const groups: Group[] = [
  {
    id: "grp-1",
    nama: "Kelompok 1",
    projectId: "prj-1",
    anggotaIds: ["u-mhs-1", "u-mhs-2"],
    ketuaId: "u-mhs-1",
  },
  {
    id: "grp-2",
    nama: "Kelompok 2",
    projectId: "prj-2",
    anggotaIds: ["u-mhs-3"],
    ketuaId: "u-mhs-3",
  },
];

export const progressList: Progress[] = [
  {
    id: "prg-1",
    groupId: "grp-1",
    minggu: 1,
    judul: "Riset Pasar",
    deskripsi: "Melakukan riset kompetitor dan target pasar Kopi Kita.",
    status: "selesai",
    tanggal: "2026-02-08",
  },
  {
    id: "prg-2",
    groupId: "grp-1",
    minggu: 2,
    judul: "Perencanaan Konten",
    deskripsi: "Menyusun kalender konten media sosial.",
    status: "proses",
    tanggal: "2026-02-15",
  },
  {
    id: "prg-3",
    groupId: "grp-1",
    minggu: 3,
    judul: "Eksekusi Konten",
    deskripsi: "Publikasi konten pertama di Instagram dan TikTok.",
    status: "belum",
    tanggal: "2026-02-22",
  },
];

export const feedbackList: Feedback[] = [
  {
    id: "fb-1",
    groupId: "grp-1",
    pemberiId: "u-dosen-1",
    pemberiRole: "dosen",
    pesan: "Riset pasar sudah baik, lanjutkan ke tahap perencanaan konten.",
    rating: 4,
    tanggal: "2026-02-09",
  },
  {
    id: "fb-2",
    groupId: "grp-1",
    pemberiId: "u-umkm-1",
    pemberiRole: "umkm",
    pesan: "Terima kasih atas risetnya, sangat membantu memahami kompetitor.",
    rating: 5,
    tanggal: "2026-02-10",
  },
];
