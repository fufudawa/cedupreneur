export type ProjectStatus = "belum-mulai" | "berjalan" | "selesai";

export interface Project {
  id: string;
  judul: string;
  deskripsi: string;
  kelasId: string;
  umkmId: string;
  dosenId: string;
  status: ProjectStatus;
  tanggalMulai: string;
  tanggalSelesai: string;
}

export interface Group {
  id: string;
  nama: string;
  projectId: string;
  anggotaIds: string[];
  ketuaId: string;
}

export interface Progress {
  id: string;
  groupId: string;
  minggu: number;
  judul: string;
  deskripsi: string;
  status: "belum" | "proses" | "selesai";
  tanggal: string;
}

export interface Feedback {
  id: string;
  groupId: string;
  pemberiId: string;
  pemberiRole: "dosen" | "umkm";
  pesan: string;
  rating?: number;
  tanggal: string;
}
