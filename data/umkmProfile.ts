// Dummy frontend-only default for the UMKM "Profile Usaha" feature.
// Used as the initial value on both /umkm/profile-usaha (view) and
// /umkm/profile-usaha/edit (edit) until the user saves real changes to
// localStorage (see lib/umkmProfileStorage.ts + lib/useUmkmProfile.ts), so
// the two pages never show divergent data. Mahasiswa's Profile Mitra page
// keeps reading data/umkm.ts read-only and isn't touched here.

export type { UmkmProfile } from "@/lib/umkmProfileStorage";
import type { UmkmProfile } from "@/lib/umkmProfileStorage";

export const umkmProfile: UmkmProfile = {
  id: "warung-teras-hijau",
  businessName: "Warung Teras Hijau",
  ownerName: "Giry Arimawan",
  establishedYear: 2024,
  category: "Food and Beverage",
  address:
    "Jl. Lapangan Merah No.10/7. 38, RT.10/RW.7, Srengseng Sawah, Kec. Jagakarsa, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12640",
  photoUrl: null,
  swot: {
    strengths: [
      "Produk memiliki identitas visual yang khas",
      "Lokasi usaha mudah dijangkau",
      "Memiliki pelanggan tetap",
    ],
    weaknesses: [
      "Promosi digital belum konsisten",
      "Dokumentasi produk masih terbatas",
      "Pengelolaan konten belum terjadwal",
    ],
    opportunities: [
      "Potensi pemasaran melalui media sosial",
      "Peluang kolaborasi dengan komunitas lokal",
      "Tren produk lokal semakin meningkat",
    ],
    threats: [
      "Banyak kompetitor serupa",
      "Perubahan harga bahan baku",
      "Persaingan promosi digital",
    ],
  },
  updatedAt: "2026-07-01T08:00:00.000Z",
};
