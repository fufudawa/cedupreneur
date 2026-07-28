export type Role = "admin" | "dosen" | "mahasiswa" | "umkm";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  dosen: "Dosen",
  mahasiswa: "Mahasiswa",
  umkm: "UMKM",
};
