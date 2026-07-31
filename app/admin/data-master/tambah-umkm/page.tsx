import { redirect } from "next/navigation";

// UMKM always requires a login account (umkm.profile_id is NOT NULL), so
// creating one is now Admin Pengguna's job — this old route just redirects there.
export default function TambahUmkmRedirect() {
  redirect("/admin/pengguna/tambah");
}
