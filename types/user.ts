import type { Role } from "./role";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  nim?: string;
  nip?: string;
  prodi?: string;
  namaUsaha?: string;
  status: "aktif" | "nonaktif";
  createdAt: string;
}
