export interface MataKuliah {
  id: string;
  kode: string;
  nama: string;
  sks: number;
  semester: string;
}

export interface Kelas {
  id: string;
  nama: string;
  mataKuliahId: string;
  dosenId: string;
  tahunAjaran: string;
  jumlahMahasiswa: number;
}
