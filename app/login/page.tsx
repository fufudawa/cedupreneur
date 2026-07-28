import Link from "next/link";
import { BrandMark, RoleLoginCard } from "@/components/shared";
import { DosenIcon, MahasiswaIcon, UmkmIcon } from "@/components/shared/icons";
import { AdminIcon } from "@/components/ui";

export default function LoginSelectPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white lg:flex-row">
      <div className="relative flex min-h-[420px] flex-1 flex-col items-center justify-center overflow-hidden px-8 py-16 lg:min-h-screen">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(48deg, rgb(240, 224, 255) 50%, rgb(255, 245, 240) 77.5%, rgb(255, 229, 199) 100%)",
          }}
        />

        <div className="relative flex w-full max-w-xs flex-col items-center text-center sm:max-w-sm lg:max-w-md">
          <BrandMark className="aspect-[6000/4219] w-full" />
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-8 py-16 sm:px-14 lg:px-20">
        <div className="mx-auto w-full max-w-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-purple sm:text-base">
              Creative Edupreneur Ecosystem by Polimedia
            </p>
            <Link
              href="/login/admin"
              aria-label="Login Admin"
              title="Login Admin"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-purple/20 bg-purple/10 text-purple transition hover:scale-105 hover:bg-purple/20 focus:outline-none focus:ring-2 focus:ring-purple/30"
            >
              <AdminIcon className="h-6 w-6" />
            </Link>
          </div>
          <div className="mt-4 border-t border-soft-gray-dark" />

          <h2 className="mt-8 text-4xl font-extrabold text-navy sm:text-5xl">Login</h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            Pilih peran dan login dengan akun anda.
            <br />
            Belum punya akun? silahkan hubungi dosen/admin.
          </p>

          <div className="mt-8 flex flex-col gap-4">
            <RoleLoginCard
              href="/login/dosen"
              title="Dosen"
              description="Rancang project mahasiswa dan mentoring"
              accent="purple"
              icon={<DosenIcon />}
            />
            <RoleLoginCard
              href="/login/mahasiswa"
              title="Mahasiswa"
              description="Update progress tugas, track tugas"
              accent="orange"
              icon={<MahasiswaIcon />}
            />
            <RoleLoginCard
              href="/login/umkm"
              title="Mitra UMKM"
              description="Mentoring"
              accent="pink"
              icon={<UmkmIcon />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
