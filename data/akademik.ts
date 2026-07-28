import type { MataKuliah, Kelas } from "@/types";

export const mataKuliah: MataKuliah[] = [
  {
    id: "mk-1",
    kode: "MKW301",
    nama: "Praktik Kewirausahaan",
    sks: 3,
    semester: "Ganjil 2026/2027",
  },
  {
    id: "mk-2",
    kode: "MKW302",
    nama: "Manajemen UMKM",
    sks: 2,
    semester: "Ganjil 2026/2027",
  },
];

export const kelas: Kelas[] = [
  {
    id: "kls-1",
    nama: "Kewirausahaan A",
    mataKuliahId: "mk-1",
    dosenId: "u-dosen-1",
    tahunAjaran: "2026/2027",
    jumlahMahasiswa: 2,
  },
  {
    id: "kls-2",
    nama: "Kewirausahaan B",
    mataKuliahId: "mk-1",
    dosenId: "u-dosen-2",
    tahunAjaran: "2026/2027",
    jumlahMahasiswa: 1,
  },
];
